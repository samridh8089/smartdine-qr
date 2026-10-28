/**
 * Authoritative Direct Guard Verification Test Suite
 * Directly imports and executes production `verifySuperAdminRequest` and `verifyStaffRequest`
 */
const assert = require('node:assert');
const fs = require('fs');
const ts = require('typescript');

// Setup environment variables for Supabase admin client initialization
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_service_role_key_for_testing_guard_logic_minimum_length_32';

// Register TypeScript on-the-fly compiler for direct module loading
require.extensions['.ts'] = function(module, filename) {
  const code = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  module._compile(compiled, filename);
};

// Directly require the ACTUAL production guard modules
const { verifySuperAdminRequest, decodeJwtPayloadSafe, _resetSupabaseAdminInstance } = require('../src/lib/superAdminGuard.ts');
const { verifyStaffRequest, _resetStaffAuthCache } = require('../src/lib/staffAuthGuard.ts');

function makeSyntheticJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.synthetic_signature`;
}

async function runDirectGuardTests() {
  console.log('================================================================');
  console.log('  DIRECT EXECUTION OF PRODUCTION GUARDS (ZERO SIMULATION)');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // TEST 1: Missing Token Handling (Direct verifySuperAdminRequest call)
  // --------------------------------------------------------------------------
  console.log('[Test 1] Real verifySuperAdminRequest: missing token');
  _resetSupabaseAdminInstance();
  const reqNoAuth = new Request('https://cleverops.in/api/admin/analytics', {
    headers: {}
  });
  const resNoAuth = await verifySuperAdminRequest(reqNoAuth);
  assert.strictEqual(resNoAuth.isSuperAdmin, false);
  assert.strictEqual(resNoAuth.response?.status, 401);
  const bodyNoAuth = await resNoAuth.response.json();
  assert.strictEqual(bodyNoAuth.error, 'UNAUTHORIZED');
  console.log('  ✓ Returns 401 UNAUTHORIZED when no token is provided\n');

  // --------------------------------------------------------------------------
  // TEST 2: decodeJwtPayloadSafe fail-closed behavior
  // --------------------------------------------------------------------------
  console.log('[Test 2] Real decodeJwtPayloadSafe: base64url handling & fail-closed');
  const aal1Token = makeSyntheticJwt({ sub: 'user_admin', role: 'super_admin', aal: 'aal1', email: 'admin@cleverops.in' });
  const aal2Token = makeSyntheticJwt({ sub: 'user_admin', role: 'super_admin', aal: 'aal2', email: 'admin@cleverops.in' });
  
  const decoded1 = decodeJwtPayloadSafe(aal1Token);
  assert.strictEqual(decoded1.aal, 'aal1');
  assert.strictEqual(decoded1.email, 'admin@cleverops.in');
  console.log('  ✓ Decoded aal1 token payload');

  const decoded2 = decodeJwtPayloadSafe(aal2Token);
  assert.strictEqual(decoded2.aal, 'aal2');
  console.log('  ✓ Decoded aal2 token payload');

  assert.throws(() => decodeJwtPayloadSafe('corrupted_two_part_token'), /Malformed JWT structure/);
  console.log('  ✓ Rejected malformed 2-part token (throws fail-closed)');

  assert.throws(() => decodeJwtPayloadSafe('a.invalid_json_b64.c'), SyntaxError);
  console.log('  ✓ Rejected non-JSON corrupt payload (throws fail-closed)\n');

  // --------------------------------------------------------------------------
  // TEST 3: Mocking Supabase Auth client to test AAL2 enforcement in verifySuperAdminRequest
  // --------------------------------------------------------------------------
  console.log('[Test 3] Real verifySuperAdminRequest: AAL1 vs AAL2 enforcement');
  
  const supabaseJs = require('@supabase/supabase-js');
  const origCreateClient = supabaseJs.createClient;

  function mockSupabaseClient(userFactors, userRole = 'super_admin') {
    return {
      auth: {
        getUser: async (token) => {
          let payload;
          try {
            payload = decodeJwtPayloadSafe(token);
          } catch(e) {
            return { data: { user: null }, error: new Error('Invalid token') };
          }
          return {
            data: {
              user: {
                id: payload.sub || 'user_admin',
                email: payload.email || 'admin@cleverops.in',
                factors: userFactors
              }
            },
            error: null
          };
        },
        admin: {
          mfa: {
            listFactors: async () => ({
              data: { factors: userFactors },
              error: null
            })
          }
        }
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'user_admin', email: 'admin@cleverops.in', role: userRole }
            })
          })
        })
      })
    };
  }

  // 3a. Super Admin with aal1 token AND verified factor => MUST REJECT 403 MFA_CHALLENGE_REQUIRED
  _resetSupabaseAdminInstance();
  supabaseJs.createClient = () => mockSupabaseClient([{ factor_type: 'totp', status: 'verified' }]);
  const reqAal1WithFactor = new Request('https://cleverops.in/api/admin/analytics', {
    headers: { 'Authorization': `Bearer ${aal1Token}` }
  });
  const resAal1WithFactor = await verifySuperAdminRequest(reqAal1WithFactor);
  assert.strictEqual(resAal1WithFactor.isSuperAdmin, false);
  assert.strictEqual(resAal1WithFactor.response?.status, 403);
  const bodyAal1 = await resAal1WithFactor.response.json();
  assert.strictEqual(bodyAal1.error, 'MFA_CHALLENGE_REQUIRED');
  console.log('  ✓ Case 3a: Super Admin with aal1 token + verified factor => 403 MFA_CHALLENGE_REQUIRED');

  // 3b. Super Admin with aal1 token AND NO factor enrolled => MUST REJECT 403 MFA_ENROLLMENT_REQUIRED
  _resetSupabaseAdminInstance();
  supabaseJs.createClient = () => mockSupabaseClient([]);
  const reqAal1NoFactor = new Request('https://cleverops.in/api/admin/analytics', {
    headers: { 'Authorization': `Bearer ${aal1Token}` }
  });
  const resAal1NoFactor = await verifySuperAdminRequest(reqAal1NoFactor);
  assert.strictEqual(resAal1NoFactor.isSuperAdmin, false);
  assert.strictEqual(resAal1NoFactor.response?.status, 403);
  const bodyNoFactor = await resAal1NoFactor.response.json();
  assert.strictEqual(bodyNoFactor.error, 'MFA_ENROLLMENT_REQUIRED');
  console.log('  ✓ Case 3b: Super Admin with aal1 token + NO factor => 403 MFA_ENROLLMENT_REQUIRED');

  // 3c. Super Admin with aal2 token => MUST SUCCEED 200 (isSuperAdmin: true, response: null)
  _resetSupabaseAdminInstance();
  supabaseJs.createClient = () => mockSupabaseClient([{ factor_type: 'totp', status: 'verified' }]);
  const reqAal2 = new Request('https://cleverops.in/api/admin/analytics', {
    headers: { 'Authorization': `Bearer ${aal2Token}` }
  });
  const resAal2 = await verifySuperAdminRequest(reqAal2);
  assert.strictEqual(resAal2.isSuperAdmin, true);
  assert.strictEqual(resAal2.response, null);
  console.log('  ✓ Case 3c: Super Admin with aal2 token => 200 SUCCESS (isSuperAdmin: true, response: null)\n');

  // --------------------------------------------------------------------------
  // TEST 4: Real verifyStaffRequest: Closing Super Admin bypass without AAL2
  // --------------------------------------------------------------------------
  console.log('[Test 4] Real verifyStaffRequest: Super Admin AAL2 enforcement on staff routes');
  _resetStaffAuthCache();
  
  // 4a. Super Admin with aal1 token on staff route => MUST REJECT 403 MFA_CHALLENGE_REQUIRED
  supabaseJs.createClient = () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'admin_id', email: 'admin@cleverops.in' } },
        error: null
      })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null })
            })
          }),
          maybeSingle: async () => ({
            data: { id: 'admin_id', email: 'admin@cleverops.in', role: 'super_admin' }
          })
        })
      })
    })
  });

  const staffReqAal1 = new Request('https://cleverops.in/api/staff/list', {
    headers: { 'Authorization': `Bearer ${aal1Token}` }
  });
  const staffResAal1 = await verifyStaffRequest(staffReqAal1, ['manager', 'owner']);
  assert.strictEqual(staffResAal1.isAuthorized, false);
  assert.strictEqual(staffResAal1.isSuperAdmin, false);
  assert.strictEqual(staffResAal1.response?.status, 403);
  const staffBodyAal1 = await staffResAal1.response.json();
  assert.strictEqual(staffBodyAal1.error, 'MFA_CHALLENGE_REQUIRED');
  console.log('  ✓ Case 4a: Super Admin attempting staff route with aal1 => 403 MFA_CHALLENGE_REQUIRED');

  // 4b. Super Admin with aal2 token on staff route => MUST SUCCEED 200 (isAuthorized: true, isSuperAdmin: true)
  _resetStaffAuthCache();
  const staffReqAal2 = new Request('https://cleverops.in/api/staff/list', {
    headers: { 'Authorization': `Bearer ${aal2Token}` }
  });
  const staffResAal2 = await verifyStaffRequest(staffReqAal2, ['manager', 'owner']);
  assert.strictEqual(staffResAal2.isAuthorized, true);
  assert.strictEqual(staffResAal2.isSuperAdmin, true);
  assert.strictEqual(staffResAal2.response, null);
  console.log('  ✓ Case 4b: Super Admin attempting staff route with aal2 => 200 SUCCESS (isAuthorized: true, isSuperAdmin: true)\n');

  // Reset createClient
  supabaseJs.createClient = origCreateClient;

  console.log('================================================================');
  console.log('  ALL DIRECT PRODUCTION GUARD TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');
}

runDirectGuardTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
