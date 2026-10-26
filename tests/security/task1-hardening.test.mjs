import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 1: Supabase Security Hardening Migration Tests', () => {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261026000001_security_hardening.sql');

  it('Migration file exists and has all required revoke/grant statements', () => {
    assert.equal(fs.existsSync(migrationPath), true, 'Migration file must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Check all 6 sensitive RPCs revoked and granted only to service_role
    const expectedRpcGrants = [
      'reset_staff_password',
      'serve_order_atomic',
      'deduct_inventory_batch_atomic',
      'reverse_inventory_batch_atomic',
      'create_restaurant_and_link',
      'exec_sql'
    ];

    for (const rpc of expectedRpcGrants) {
      assert.match(sql, new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${rpc}`), `Must revoke ${rpc}`);
      assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpc}[^;]*TO service_role`), `Must grant ${rpc} only to service_role`);
    }

    // 2. Check delete_staff_user tenant & role isolation
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.delete_staff_user/);
    assert.match(sql, /v_caller_role NOT IN \('owner', 'super_admin'\)/);
    assert.match(sql, /v_target_role IN \('owner', 'super_admin'\)/);
    assert.match(sql, /v_caller_restaurant_id != v_target_restaurant_id/);

    // 3. Check handle_new_user role stripping
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.handle_new_user/);
    assert.match(sql, /LOWER\(COALESCE\(NEW\.raw_user_meta_data->>'role', ''\)\) IN \('super_admin', 'superadmin', 'admin'\) THEN 'owner'/);

    // 4. Check ALTER DEFAULT PRIVILEGES
    assert.match(sql, /ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;/);
  });

  it('Live database rejects reset_staff_password for anon role', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/reset_staff_password`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target_user_id: '00000000-0000-0000-0000-000000000000',
        new_password: 'TestPassword123!'
      })
    });

    assert.equal(res.status, 401, 'Anon execution of reset_staff_password must return 401');
    const body = await res.json();
    assert.equal(body.code, '42501', 'Error code must be 42501 (insufficient_privilege)');
  });
});
