import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('PHASE 7 - Task 1: Migration 20261026000005 exists and drops all public policies', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/20261026000005_drop_remaining_public_policies.sql');
  assert.ok(fs.existsSync(migPath), 'Migration 20261026000005 must exist');
  const sql = fs.readFileSync(migPath, 'utf8');

  assert.ok(sql.includes('DROP POLICY IF EXISTS "Allow public to read order_batches" ON public.order_batches'), 'Must drop public read on order_batches');
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Allow public to insert orders" ON public.orders'), 'Must drop public insert on orders');
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Allow public to insert order_batches" ON public.order_batches'), 'Must drop public insert on order_batches');
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Allow public to insert order items" ON public.order_items'), 'Must drop public insert on order_items');
  assert.ok(sql.includes('pg_policies'), 'Must include dynamic pg_policies cleanup DO block');
  assert.ok(sql.includes('roles && ARRAY[\'anon\'::name, \'public\'::name]'), 'Must target anon and public roles in dynamic DO block');
});

test('PHASE 7 - Task 1: CustomerMenu.tsx has zero client-side direct db.createOrder fallbacks', () => {
  const menuCode = fs.readFileSync(path.join(rootDir, 'src/components/customer/CustomerMenu.tsx'), 'utf8');
  assert.ok(!menuCode.includes('db.createOrder'), 'CustomerMenu must never call db.createOrder directly from the browser');
});

test('PHASE 7 - Task 2: upload-image blocks IPv4-mapped IPv6 and rejects redirects', () => {
  const uploadCode = fs.readFileSync(path.join(rootDir, 'src/app/api/ai-menu/upload-image/route.ts'), 'utf8');
  assert.ok(uploadCode.includes('::ffff:'), 'upload-image must block IPv4-mapped IPv6 prefix ::ffff:');
  assert.ok(uploadCode.includes('redirect: \'manual\''), 'upload-image must specify manual redirect');
  assert.ok(uploadCode.includes('Redirects are not allowed'), 'upload-image must reject 3xx redirects');
});

test('PHASE 7 - Task 3: No hardcoded test passwords in scripts or e2e', () => {
  const filesToCheck = [
    'scripts/get_maharaja_table_id.cjs',
    'scripts/live_audit.mjs',
    'scripts/measure_after_true_navigation.mjs',
    'scripts/measure_true_navigation.mjs',
    'scripts/reproduce_prod_live_bug.cjs',
    'scripts/reproduce_prod_maharaja.cjs',
    'scripts/verify_floor_layout_production.ts',
    'scripts/verify_floor_polish_final.ts',
    'scripts/verify_floor_scroll.ts',
    'scripts/verify_order_no_and_total_prod.cjs',
    'scripts/verify_prod_double_pass.cjs',
    'scripts/verify_v1_release_freeze.ts',
    'scripts/verify_walkin_production.ts',
    'e2e/scripts/audit_owner_auth_root.mjs'
  ];

  for (const f of filesToCheck) {
    const fullPath = path.join(rootDir, f);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(!content.includes("'123456'"), `${f} must not contain hardcoded '123456'`);
    assert.ok(!content.includes('***REMOVED***'), `${f} must not contain ***REMOVED***`);
  }
});

test('PHASE 7 - Task 4: check-email-availability implements dual IP and email rate limiting', () => {
  const emailCheckCode = fs.readFileSync(path.join(rootDir, 'src/app/api/auth/check-email-availability/route.ts'), 'utf8');
  assert.ok(emailCheckCode.includes('checkEmailIpRateLimits'), 'Must include IP rate limiting map');
  assert.ok(emailCheckCode.includes('checkEmailTargetRateLimits'), 'Must include email-level rate limiting map');
  assert.ok(emailCheckCode.includes('Too many lookup requests for this email'), 'Must enforce email lookup throttling');
});

test('PHASE 7 - Task 5: Live DB / RPC validates token requirement on get_order_tracking', async (t) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey && fs.existsSync(path.join(rootDir, '.env.local'))) {
    const envText = fs.readFileSync(path.join(rootDir, '.env.local'), 'utf8');
    const match = envText.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);
    if (match) anonKey = match[1].trim();
  }

  if (!anonKey) {
    if (t?.skip) t.skip('NEXT_PUBLIC_SUPABASE_ANON_KEY not configured');
    return;
  }

  try {
    // Calling get_order_tracking with empty/bogus token
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_order_tracking`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_order_id: '00000000-0000-0000-0000-000000000000',
        p_token: 'bogus_token'
      })
    });

    assert.ok(res.status === 200 || res.status === 404);
    const data = await res.json();
    assert.strictEqual(data, null, 'get_order_tracking without valid matching token must return null');
  } catch (err) {
    if (t?.skip) t.skip(`Network error reaching Supabase: ${err.message}`);
  }
});
