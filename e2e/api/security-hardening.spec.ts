import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Task 1: Supabase Security Hardening Migration Audit', () => {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261026000001_security_hardening.sql');

  test('Migration 20261026000001_security_hardening.sql must exist and have complete hardening rules', () => {
    expect(fs.existsSync(migrationPath)).toBe(true);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Verify RPCs revoked from PUBLIC, anon, authenticated and granted to service_role
    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.reset_staff_password');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.reset_staff_password(target_user_id uuid, new_password text) TO service_role');

    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.serve_order_atomic');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.serve_order_atomic TO service_role');

    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.deduct_inventory_batch_atomic');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.deduct_inventory_batch_atomic TO service_role');

    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.reverse_inventory_batch_atomic');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.reverse_inventory_batch_atomic TO service_role');

    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.create_restaurant_and_link');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.create_restaurant_and_link TO service_role');

    expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.exec_sql');
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role');

    // 2. Verify delete_staff_user role & cross-tenant checks
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.delete_staff_user');
    expect(sql).toContain('v_caller_role NOT IN (\'owner\', \'super_admin\')');
    expect(sql).toContain('v_target_role IN (\'owner\', \'super_admin\')');
    expect(sql).toContain('v_caller_restaurant_id != v_target_restaurant_id');

    // 3. Verify handle_new_user blocks super_admin escalation
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.handle_new_user');
    expect(sql).toContain('LOWER(COALESCE(NEW.raw_user_meta_data->>\'role\', \'\')) IN (\'super_admin\', \'superadmin\', \'admin\') THEN \'owner\'');

    // 4. Verify ALTER DEFAULT PRIVILEGES
    expect(sql).toContain('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;');
  });

  test('Live database rejects reset_staff_password when called by anon role', async ({ request }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const res = await request.post(`${supabaseUrl}/rest/v1/rpc/reset_staff_password`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      data: {
        target_user_id: '00000000-0000-0000-0000-000000000000',
        new_password: 'TestPassword123!'
      }
    });

    // Must be 401 Unauthorized / permission denied
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('42501'); // insufficient_privilege
  });
});
