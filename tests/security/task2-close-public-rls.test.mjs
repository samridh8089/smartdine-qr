import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Task 2: Close Public RLS & Secure Order Tracking Tests', () => {
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20261026000002_close_public_rls.sql');

  it('Migration file exists and has all required RLS closing rules', () => {
    assert.equal(fs.existsSync(migrationPath), true, 'Migration 20261026000002 must exist');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Orders / items / batches public policies dropped
    assert.match(sql, /DROP POLICY IF EXISTS "Allow public to read their specific order by ID" ON public\.orders;/);
    assert.match(sql, /DROP POLICY IF EXISTS "Allow public to read order items" ON public\.order_items;/);
    assert.match(sql, /DROP POLICY IF EXISTS "Allow public select access to order_batches" ON public\.order_batches;/);

    // 2. tracking_token added to orders
    assert.match(sql, /ALTER TABLE public\.orders\s+ADD COLUMN IF NOT EXISTS tracking_token/);
    assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking_token/);

    // 3. get_order_tracking RPC defined with token and safe fields
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_order_tracking\(p_order_id UUID, p_token TEXT/);
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_order_tracking\(UUID, TEXT\) TO anon, authenticated, service_role;/);

    // 4. restaurants public select and insert dropped
    assert.match(sql, /DROP POLICY IF EXISTS "Allow public to read restaurants \(for customer menu\)" ON public\.restaurants;/);
    assert.match(sql, /DROP POLICY IF EXISTS "Allow public to insert restaurants" ON public\.restaurants;/);

    // 5. public_restaurants view created with safe columns and granted
    assert.match(sql, /CREATE OR REPLACE VIEW public\.public_restaurants AS/);
    assert.match(sql, /GRANT SELECT ON public\.public_restaurants TO anon, authenticated, service_role;/);

    // 6. table_merge and qr_design policies scoped to authenticated staff
    assert.match(sql, /staff_table_merge_groups_policy/);
    assert.match(sql, /staff_table_merge_members_policy/);
    assert.match(sql, /staff_table_merge_sessions_policy/);
    assert.match(sql, /staff_table_merge_session_members_policy/);
    assert.match(sql, /staff_qr_design_policy/);
  });

  it('App code is updated to use get_order_tracking and public_restaurants', () => {
    const dbCode = fs.readFileSync(path.join(process.cwd(), 'src', 'lib', 'db.ts'), 'utf8');
    assert.match(dbCode, /public_restaurants/, 'db.ts must query public_restaurants view');
    assert.match(dbCode, /get_order_tracking/, 'db.ts must call get_order_tracking RPC');

    const customerOrderCode = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'api', 'customer', 'orders', 'route.ts'), 'utf8');
    assert.match(customerOrderCode, /tracking_token:/, 'customer orders must assign tracking_token');

    const customerMenuCode = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'customer', 'CustomerMenu.tsx'), 'utf8');
    assert.match(customerMenuCode, /smartdine_order_token_/, 'CustomerMenu must store tracking_token');
  });
});
