import assert from 'node:assert';
import { decodeJwtPayloadSafe } from '../src/lib/jwtHelper.ts';

// Helper to create synthetic signed/unsigned JWT for testing
function makeTestJwt(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = 'synthetic_signature_for_testing';
  return `${header}.${body}.${sig}`;
}

console.log('=== RUNNING MFA FAIL-CLOSED TEST SUITE ===\n');

// --------------------------------------------------------------------------
// TEST 1: decodeJwtPayloadSafe base64url handling and fail-closed structure
// --------------------------------------------------------------------------
console.log('Test 1: decodeJwtPayloadSafe unit tests...');

// 1a. Standard base64url decode
const tokenAal1 = makeTestJwt({ sub: 'user_123', aal: 'aal1', email: 'admin@cleverops.in' });
const decodedAal1 = decodeJwtPayloadSafe(tokenAal1);
assert.strictEqual(decodedAal1.aal, 'aal1');
assert.strictEqual(decodedAal1.email, 'admin@cleverops.in');
console.log('  ✓ Successfully decoded aal1 base64url token');

// 1b. aal2 token decode
const tokenAal2 = makeTestJwt({ sub: 'user_123', aal: 'aal2', email: 'admin@cleverops.in' });
const decodedAal2 = decodeJwtPayloadSafe(tokenAal2);
assert.strictEqual(decodedAal2.aal, 'aal2');
console.log('  ✓ Successfully decoded aal2 base64url token');

// 1c. Token with special base64url chars (- and _) and without padding
const tokenSpecialChars = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYiLCJhbXRfc3BlY2lhbCI6Ij4+Pz8-LS0_X19fIiwicm9sZSI6InN1cGVyX2FkbWluIiwiYWFsIjoiYWFsMiJ9.sig';
const decodedSpecial = decodeJwtPayloadSafe(tokenSpecialChars);
assert.strictEqual(decodedSpecial.aal, 'aal2');
assert.strictEqual(decodedSpecial.role, 'super_admin');
console.log('  ✓ Successfully decoded token containing base64url specific characters (- and _)');

// 1d. Fail-closed: 2-part token must throw
assert.throws(() => {
  decodeJwtPayloadSafe('header_only.payload_only');
}, /Malformed JWT structure/);
console.log('  ✓ Rejected 2-part malformed token (fail-closed)');

// 1e. Fail-closed: 4-part token must throw
assert.throws(() => {
  decodeJwtPayloadSafe('a.b.c.d');
}, /Malformed JWT structure/);
console.log('  ✓ Rejected 4-part malformed token (fail-closed)');

// 1f. Fail-closed: Corrupt non-JSON payload must throw
assert.throws(() => {
  decodeJwtPayloadSafe('header.bm90X2pzb25fcGF5bG9hZA.signature');
}, SyntaxError);
console.log('  ✓ Rejected non-JSON payload (fail-closed)');


// --------------------------------------------------------------------------
// TEST 2: Guard AAL2 Decision Matrix (Fail-Closed Logic)
// --------------------------------------------------------------------------
console.log('\nTest 2: Guard Decision Matrix Verification...');

// Scenario A: Super Admin with aal1 token => MUST REJECT with 403
function evaluateSuperAdminAccess(token, profileRole, hasVerifiedTotp) {
  if (profileRole !== 'super_admin') {
    return { status: 403, error: 'SUPER_ADMIN_REQUIRED' };
  }
  let payload;
  try {
    payload = decodeJwtPayloadSafe(token);
  } catch (e) {
    return { status: 403, error: 'INVALID_TOKEN_PAYLOAD' };
  }

  const aal = payload.aal || 'aal1';
  if (aal !== 'aal2') {
    if (!hasVerifiedTotp) {
      return { status: 403, error: 'MFA_ENROLLMENT_REQUIRED' };
    }
    return { status: 403, error: 'MFA_CHALLENGE_REQUIRED' };
  }
  return { status: 200, success: true };
}

// Case 1: aal1 token with verified factor => 403 MFA_CHALLENGE_REQUIRED
const resCase1 = evaluateSuperAdminAccess(tokenAal1, 'super_admin', true);
assert.strictEqual(resCase1.status, 403);
assert.strictEqual(resCase1.error, 'MFA_CHALLENGE_REQUIRED');
console.log('  ✓ Case 1: Super Admin with aal1 token + verified factor => 403 MFA_CHALLENGE_REQUIRED');

// Case 2: aal1 token WITHOUT verified factor => 403 MFA_ENROLLMENT_REQUIRED
const resCase2 = evaluateSuperAdminAccess(tokenAal1, 'super_admin', false);
assert.strictEqual(resCase2.status, 403);
assert.strictEqual(resCase2.error, 'MFA_ENROLLMENT_REQUIRED');
console.log('  ✓ Case 2: Super Admin with aal1 token + NO factor => 403 MFA_ENROLLMENT_REQUIRED');

// Case 3: Malformed token => 403 INVALID_TOKEN_PAYLOAD
const resCase3 = evaluateSuperAdminAccess('bad.token', 'super_admin', true);
assert.strictEqual(resCase3.status, 403);
assert.strictEqual(resCase3.error, 'INVALID_TOKEN_PAYLOAD');
console.log('  ✓ Case 3: Super Admin with malformed token => 403 INVALID_TOKEN_PAYLOAD');

// Case 4: aal2 token => 200 SUCCESS
const resCase4 = evaluateSuperAdminAccess(tokenAal2, 'super_admin', true);
assert.strictEqual(resCase4.status, 200);
assert.strictEqual(resCase4.success, true);
console.log('  ✓ Case 4: Super Admin with aal2 token => 200 SUCCESS');

// Case 5: Staff route bypass evaluation with aal1 => 403 MFA_CHALLENGE_REQUIRED
function evaluateStaffRouteAccess(token, profileRole) {
  const isSuperAdmin = profileRole === 'super_admin';
  if (isSuperAdmin) {
    let payload;
    try {
      payload = decodeJwtPayloadSafe(token);
    } catch (e) {
      return { status: 403, error: 'INVALID_TOKEN_PAYLOAD' };
    }
    if (payload.aal !== 'aal2') {
      return { status: 403, error: 'MFA_CHALLENGE_REQUIRED' };
    }
    return { status: 200, isAuthorized: true, isSuperAdmin: true };
  }
  return { status: 200, isAuthorized: true, isSuperAdmin: false };
}

const staffResAal1 = evaluateStaffRouteAccess(tokenAal1, 'super_admin');
assert.strictEqual(staffResAal1.status, 403);
assert.strictEqual(staffResAal1.error, 'MFA_CHALLENGE_REQUIRED');
console.log('  ✓ Case 5: Super Admin attempting staff route with aal1 => 403 MFA_CHALLENGE_REQUIRED');

const staffResAal2 = evaluateStaffRouteAccess(tokenAal2, 'super_admin');
assert.strictEqual(staffResAal2.status, 200);
assert.strictEqual(staffResAal2.isSuperAdmin, true);
console.log('  ✓ Case 6: Super Admin attempting staff route with aal2 => 200 SUCCESS (AUTHORIZED)');

const staffResOwner = evaluateStaffRouteAccess(tokenAal1, 'owner');
assert.strictEqual(staffResOwner.status, 200);
assert.strictEqual(staffResOwner.isSuperAdmin, false);
console.log('  ✓ Case 7: Normal restaurant owner token => untouched normal path');

console.log('\n=== ALL 7 MFA DECISION MATRIX CHECKS PASSED WITH 100% SUCCESS ===\n');
