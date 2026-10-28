import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

test('SECURITY REMEDIATION: Migration 20261028000002 closes RLS privilege escalation vectors', () => {
  const migPath = path.join(rootDir, 'supabase/migrations/20261028000002_rls_privilege_escalation.sql');
  assert.ok(fs.existsSync(migPath), 'Migration 20261028000002 must exist');
  const sql = fs.readFileSync(migPath, 'utf8');

  // 1. Restaurants table policies
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Owners manage their restaurant" ON public.restaurants;'), 'Must drop legacy all-access policy on restaurants');
  assert.ok(sql.includes('CREATE POLICY "staff_select_own_restaurant"'), 'Must define SELECT policy for restaurant staff');
  assert.ok(sql.includes('CREATE POLICY "owner_manager_update_restaurant"'), 'Must restrict UPDATE to owner/manager');
  assert.ok(sql.includes("role IN ('owner', 'manager')"), 'Staff update must require owner or manager role in profiles');
  assert.ok(sql.includes('CREATE POLICY "owner_delete_restaurant"'), 'Must restrict DELETE strictly to owner_id = auth.uid()');
  assert.ok(sql.includes('CREATE POLICY "owner_insert_restaurant"'), 'Must restrict INSERT strictly to owner_id = auth.uid()');

  // 2. Restaurants privileged column lock trigger
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.protect_restaurant_privileged_columns()'), 'Must define protect_restaurant_privileged_columns function');
  assert.ok(sql.includes('CREATE TRIGGER trg_protect_restaurant_privileged_columns'), 'Must create trg_protect_restaurant_privileged_columns trigger');
  assert.ok(sql.includes('NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan'), 'Must protect subscription_plan');
  assert.ok(sql.includes('NEW.subscription_status IS DISTINCT FROM OLD.subscription_status'), 'Must protect subscription_status');
  assert.ok(sql.includes('NEW.billing_interval IS DISTINCT FROM OLD.billing_interval'), 'Must protect billing_interval');
  assert.ok(sql.includes('NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at'), 'Must protect trial_ends_at');
  assert.ok(sql.includes('NEW.owner_id IS DISTINCT FROM OLD.owner_id'), 'Must protect owner_id');

  // 3. Orders: Purge user_metadata dependency
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Allow owners/staff to read/write their restaurant orders" ON public.orders;'), 'Must drop legacy orders policy');
  assert.ok(sql.includes('restaurant_id = public.get_user_restaurant_id(auth.uid())'), 'Orders must use get_user_restaurant_id instead of user_metadata');
  assert.ok(!sql.includes("auth.jwt() -> 'user_metadata' ->> 'restaurant_id'"), 'Must NOT use user_metadata restaurant_id in orders policy');

  // 4. Profiles WITH CHECK policy
  assert.ok(sql.includes('DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;'), 'Must drop legacy profiles update policy');
  assert.ok(sql.includes('WITH CHECK (auth.uid() = id)'), 'Must enforce WITH CHECK (auth.uid() = id) on profiles update');
});

test('SECURITY REMEDIATION: Browser-side supabase client delegates auto-linking to server route', () => {
  const clientPath = path.join(rootDir, 'src/lib/supabase.ts');
  const code = fs.readFileSync(clientPath, 'utf8');

  // Must not perform direct client-side profile elevation
  assert.ok(
    !code.includes(".from('profiles').upsert({ id: user.id, email: user.email, role: 'owner'"),
    'Client-side code must NOT directly upsert role: owner to profiles table'
  );

  // Must invoke server endpoint
  assert.ok(
    code.includes('/api/auth/auto-link-profile'),
    'Client-side code must call /api/auth/auto-link-profile server route'
  );
});

test('SECURITY REMEDIATION: Server auto-link route exists and validates authorization', () => {
  const routePath = path.join(rootDir, 'src/app/api/auth/auto-link-profile/route.ts');
  assert.ok(fs.existsSync(routePath), 'Auto-link API route must exist');
  const code = fs.readFileSync(routePath, 'utf8');

  // Must require Bearer token
  assert.ok(code.includes("authHeader?.startsWith('Bearer ')"), 'Must enforce Bearer authorization header');
  // Must verify restaurant ownership
  assert.ok(code.includes('isLegitimateOwner'), 'Must verify legitimate restaurant ownership before linking');
  // Must use supabaseAdmin for privileged upsert
  assert.ok(code.includes("supabaseAdmin.from('profiles').upsert"), 'Must use server-side supabaseAdmin instance for profile link');
});

test('SECURITY REMEDIATION: Supabase Admin helper module is correctly configured', () => {
  const adminHelperPath = path.join(rootDir, 'src/lib/supabaseAdmin.ts');
  assert.ok(fs.existsSync(adminHelperPath), 'supabaseAdmin helper module must exist');
  const code = fs.readFileSync(adminHelperPath, 'utf8');

  assert.ok(code.includes('getSupabaseAdmin'), 'Must export getSupabaseAdmin');
  assert.ok(code.includes('supabaseAdmin'), 'Must export supabaseAdmin proxy');
});
