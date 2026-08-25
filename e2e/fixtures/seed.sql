-- Tier 1 Immutable Seed Data for SmartDine E2E Tests
-- Spec Reference: Appendix I (TDM-002)

-- 1. Test Restaurant
INSERT INTO restaurants (id, name, slug, status, plan)
VALUES 
  ('e2e-rest-1', 'SmartDine QA Restaurant', 'test-restaurant', 'active', 'pro')
ON CONFLICT (id) DO NOTHING;

-- 2. Test Users & Profiles (Assuming Auth Users created via Admin API)
INSERT INTO profiles (id, email, name, role, restaurant_id)
VALUES
  ('e2e-owner-1', 'owner@test.com', 'QA Owner', 'owner', 'e2e-rest-1'),
  ('e2e-manager-1', 'manager@test.com', 'QA Manager', 'manager', 'e2e-rest-1'),
  ('e2e-waiter-1', 'waiter@test.com', 'QA Waiter', 'waiter', 'e2e-rest-1'),
  ('e2e-kitchen-1', 'kitchen@test.com', 'QA Kitchen', 'kitchen', 'e2e-rest-1'),
  ('e2e-cashier-1', 'cashier@test.com', 'QA Cashier', 'cashier', 'e2e-rest-1'),
  ('e2e-superadmin-1', 'superadmin@test.com', 'QA SuperAdmin', 'super_admin', NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. Test Tables
INSERT INTO tables (id, restaurant_id, name, slug)
VALUES
  ('e2e-table-1', 'e2e-rest-1', 'Table 1', 'table-1'),
  ('e2e-table-2', 'e2e-rest-1', 'Table 2', 'table-2')
ON CONFLICT (id) DO NOTHING;

-- 4. Test Menu Categories
INSERT INTO categories (id, restaurant_id, name, sort_order)
VALUES
  ('e2e-cat-1', 'e2e-rest-1', 'Starters', 1),
  ('e2e-cat-2', 'e2e-rest-1', 'Main Course', 2)
ON CONFLICT (id) DO NOTHING;

-- 5. Test Menu Items
INSERT INTO menu_items (id, restaurant_id, category_id, name, price, is_available)
VALUES
  ('e2e-item-1', 'e2e-rest-1', 'e2e-cat-1', 'Paneer Tikka', 200.00, true),
  ('e2e-item-2', 'e2e-rest-1', 'e2e-cat-1', 'Chicken Tikka', 250.00, true),
  ('e2e-item-3', 'e2e-rest-1', 'e2e-cat-2', 'Butter Chicken', 400.00, true),
  ('e2e-item-4', 'e2e-rest-1', 'e2e-cat-2', 'Naan', 50.00, true),
  ('e2e-item-out-1', 'e2e-rest-1', 'e2e-cat-2', 'Truffle Pasta', 600.00, false) -- For out-of-stock validation
ON CONFLICT (id) DO NOTHING;

-- 6. Promo Codes
INSERT INTO promo_codes (id, restaurant_id, code, discount_type, discount_value, is_active)
VALUES
  ('e2e-promo-1', 'e2e-rest-1', 'QA10OFF', 'percentage', 10, true),
  ('e2e-promo-2', 'e2e-rest-1', 'QAFLAT50', 'flat', 50, true)
ON CONFLICT (id) DO NOTHING;
