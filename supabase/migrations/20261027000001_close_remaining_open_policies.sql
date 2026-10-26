-- Migration: 20261027000001_close_remaining_open_policies.sql
-- Description: Close remaining open public/anon RLS policies, scope inventory, reservations, food dispositions, customer requests, variants, system events, and attendance tables to staff/service-role, and enforce 100% RLS coverage with zero open public policies.

-- ============================================================================
-- 1. INVENTORY RESERVATIONS & PREPARED FOOD DISPOSITIONS
-- ============================================================================

-- inventory_reservations
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select inventory_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "All operations inventory_reservations" ON public.inventory_reservations;
DROP POLICY IF EXISTS "staff_manage_inventory_reservations" ON public.inventory_reservations;

REVOKE ALL ON TABLE public.inventory_reservations FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_reservations TO authenticated, service_role;

CREATE POLICY "staff_manage_inventory_reservations"
  ON public.inventory_reservations
  FOR ALL
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- prepared_food_dispositions
ALTER TABLE public.prepared_food_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select prepared_food_dispositions" ON public.prepared_food_dispositions;
DROP POLICY IF EXISTS "All operations prepared_food_dispositions" ON public.prepared_food_dispositions;
DROP POLICY IF EXISTS "staff_manage_prepared_food_dispositions" ON public.prepared_food_dispositions;

REVOKE ALL ON TABLE public.prepared_food_dispositions FROM anon, PUBLIC;
GRANT ALL ON TABLE public.prepared_food_dispositions TO authenticated, service_role;

CREATE POLICY "staff_manage_prepared_food_dispositions"
  ON public.prepared_food_dispositions
  FOR ALL
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- ============================================================================
-- 2. CUSTOMER REQUESTS (Waiter Call / Request Bill)
-- ============================================================================

ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public to read customer requests" ON public.customer_requests;
DROP POLICY IF EXISTS "Allow public to insert customer requests" ON public.customer_requests;
DROP POLICY IF EXISTS "Allow owners/staff to manage customer requests" ON public.customer_requests;
DROP POLICY IF EXISTS "staff_manage_customer_requests" ON public.customer_requests;
DROP POLICY IF EXISTS "customer_insert_valid_requests" ON public.customer_requests;

REVOKE SELECT, UPDATE, DELETE ON TABLE public.customer_requests FROM anon, PUBLIC;
GRANT ALL ON TABLE public.customer_requests TO authenticated, service_role;
GRANT INSERT ON TABLE public.customer_requests TO anon;

-- Staff-scoped policy (read, update, delete)
CREATE POLICY "staff_manage_customer_requests"
  ON public.customer_requests
  FOR ALL
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- Strict customer insert policy: only allowed if table actually exists in that restaurant
CREATE POLICY "customer_insert_valid_requests"
  ON public.customer_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND restaurant_id IS NOT NULL
    AND table_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.tables t
      WHERE t.id = customer_requests.table_id
        AND t.restaurant_id = customer_requests.restaurant_id
    )
  );

-- ============================================================================
-- 3. SYSTEM EVENTS (Audit Event Bus)
-- ============================================================================

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_insert_system_events" ON public.system_events;
DROP POLICY IF EXISTS "staff_insert_system_events" ON public.system_events;
DROP POLICY IF EXISTS "service_role_insert_system_events" ON public.system_events;

REVOKE ALL ON TABLE public.system_events FROM anon, PUBLIC;
GRANT ALL ON TABLE public.system_events TO authenticated, service_role;

-- Allow service_role explicit insert (super_admin has super_admin_all_system_events)
CREATE POLICY "service_role_insert_system_events"
  ON public.system_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- 4. MENU ITEM VARIANTS
-- ============================================================================

ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All operations for menu_item_variants" ON public.menu_item_variants;
DROP POLICY IF EXISTS "staff_manage_menu_item_variants" ON public.menu_item_variants;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.menu_item_variants FROM anon, PUBLIC;
GRANT SELECT ON TABLE public.menu_item_variants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.menu_item_variants TO authenticated, service_role;

CREATE POLICY "staff_manage_menu_item_variants"
  ON public.menu_item_variants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE mi.id = menu_item_variants.menu_item_id
        AND (
          p.role = 'super_admin'
          OR (p.role IN ('owner', 'manager') AND p.restaurant_id = mi.restaurant_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE mi.id = menu_item_variants.menu_item_id
        AND (
          p.role = 'super_admin'
          OR (p.role IN ('owner', 'manager') AND p.restaurant_id = mi.restaurant_id)
        )
    )
  );

-- ============================================================================
-- 5. OTP SESSIONS & HELPER FUNCTION GRANTS
-- ============================================================================

ALTER TABLE public.otp_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated and anon" ON public.otp_sessions;

REVOKE ALL ON TABLE public.otp_sessions FROM anon, PUBLIC;
GRANT ALL ON TABLE public.otp_sessions TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_restaurant_id(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_restaurant_id(uuid) TO authenticated, service_role;

-- ============================================================================
-- 6. ATTENDANCE & PAYROLL TABLES (Scope to Restaurant Staff)
-- ============================================================================

-- staff_profiles
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_profiles_allow_all" ON public.staff_profiles;
DROP POLICY IF EXISTS "staff_manage_staff_profiles" ON public.staff_profiles;
REVOKE ALL ON TABLE public.staff_profiles FROM anon, PUBLIC;
GRANT ALL ON TABLE public.staff_profiles TO authenticated, service_role;
CREATE POLICY "staff_manage_staff_profiles"
  ON public.staff_profiles FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_allow_all" ON public.shifts;
DROP POLICY IF EXISTS "staff_manage_shifts" ON public.shifts;
REVOKE ALL ON TABLE public.shifts FROM anon, PUBLIC;
GRANT ALL ON TABLE public.shifts TO authenticated, service_role;
CREATE POLICY "staff_manage_shifts"
  ON public.shifts FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- staff_shifts
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_shifts_allow_all" ON public.staff_shifts;
DROP POLICY IF EXISTS "staff_manage_staff_shifts" ON public.staff_shifts;
REVOKE ALL ON TABLE public.staff_shifts FROM anon, PUBLIC;
GRANT ALL ON TABLE public.staff_shifts TO authenticated, service_role;
CREATE POLICY "staff_manage_staff_shifts"
  ON public.staff_shifts FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- staff_attendance
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_attendance_allow_all" ON public.staff_attendance;
DROP POLICY IF EXISTS "staff_manage_staff_attendance" ON public.staff_attendance;
REVOKE ALL ON TABLE public.staff_attendance FROM anon, PUBLIC;
GRANT ALL ON TABLE public.staff_attendance TO authenticated, service_role;
CREATE POLICY "staff_manage_staff_attendance"
  ON public.staff_attendance FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- salary_records
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_records_allow_all" ON public.salary_records;
DROP POLICY IF EXISTS "staff_manage_salary_records" ON public.salary_records;
REVOKE ALL ON TABLE public.salary_records FROM anon, PUBLIC;
GRANT ALL ON TABLE public.salary_records TO authenticated, service_role;
CREATE POLICY "staff_manage_salary_records"
  ON public.salary_records FOR ALL TO authenticated
  USING (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

-- ============================================================================
-- 7. CORE INVENTORY TABLES (Ensure RLS & Staff Scoping on 9 Core Tables)
-- ============================================================================

-- inventory_categories
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_categories" ON public.inventory_categories;
REVOKE ALL ON TABLE public.inventory_categories FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_categories TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_categories" ON public.inventory_categories FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin')
  WITH CHECK (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin');

-- inventory_items
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_items" ON public.inventory_items;
REVOKE ALL ON TABLE public.inventory_items FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_items TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_items" ON public.inventory_items FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin')
  WITH CHECK (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin');

-- inventory_recipes
ALTER TABLE public.inventory_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_recipes" ON public.inventory_recipes;
REVOKE ALL ON TABLE public.inventory_recipes FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_recipes TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_recipes" ON public.inventory_recipes FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin')
  WITH CHECK (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin');

-- inventory_recipe_ingredients
ALTER TABLE public.inventory_recipe_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_recipe_ingredients" ON public.inventory_recipe_ingredients;
REVOKE ALL ON TABLE public.inventory_recipe_ingredients FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_recipe_ingredients TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_recipe_ingredients" ON public.inventory_recipe_ingredients FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_recipes r
      WHERE r.id = inventory_recipe_ingredients.recipe_id
        AND (
          r.restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_recipes r
      WHERE r.id = inventory_recipe_ingredients.recipe_id
        AND (
          r.restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
    )
  );

-- inventory_transactions
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_transactions" ON public.inventory_transactions;
REVOKE ALL ON TABLE public.inventory_transactions FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_transactions TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_transactions" ON public.inventory_transactions FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin')
  WITH CHECK (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin');

-- inventory_purchases
ALTER TABLE public.inventory_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_purchases" ON public.inventory_purchases;
REVOKE ALL ON TABLE public.inventory_purchases FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_purchases TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_purchases" ON public.inventory_purchases FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin')
  WITH CHECK (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin');

-- inventory_purchase_items
ALTER TABLE public.inventory_purchase_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_purchase_items" ON public.inventory_purchase_items;
REVOKE ALL ON TABLE public.inventory_purchase_items FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_purchase_items TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_purchase_items" ON public.inventory_purchase_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inventory_purchases p
      WHERE p.id = inventory_purchase_items.purchase_id
        AND (
          p.restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.inventory_purchases p
      WHERE p.id = inventory_purchase_items.purchase_id
        AND (
          p.restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
    )
  );

-- inventory_waste
ALTER TABLE public.inventory_waste ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_waste" ON public.inventory_waste;
REVOKE ALL ON TABLE public.inventory_waste FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_waste TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_waste" ON public.inventory_waste FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin')
  WITH CHECK (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin');

-- inventory_alerts
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_manage_inventory_alerts" ON public.inventory_alerts;
REVOKE ALL ON TABLE public.inventory_alerts FROM anon, PUBLIC;
GRANT ALL ON TABLE public.inventory_alerts TO authenticated, service_role;
CREATE POLICY "staff_manage_inventory_alerts" ON public.inventory_alerts FOR ALL TO authenticated
  USING (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin')
  WITH CHECK (restaurant_id IN (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()) OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin');

-- ============================================================================
-- 8. COMPREHENSIVE RLS ENFORCEMENT ON ALL PUBLIC SCHEMA TABLES
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
      AND c.relname NOT IN ('spatial_ref_sys')
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.relname);
  END LOOP;
END $$;

-- Verify 100% of tables in public schema have RLS enabled
DO $$
DECLARE
  v_unsecured TEXT;
BEGIN
  SELECT string_agg(c.relname, ', ')
  INTO v_unsecured
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = false
    AND c.relname NOT IN ('spatial_ref_sys');

  IF v_unsecured IS NOT NULL AND v_unsecured != '' THEN
    RAISE EXCEPTION 'CRITICAL: The following tables in public schema do not have RLS enabled: %', v_unsecured;
  END IF;
END $$;

-- ============================================================================
-- 9. STRICT ASSERTION: ZERO UNINTENDED OPEN POLICIES FOR ANON / PUBLIC
-- ============================================================================

DO $$
DECLARE
  v_rec RECORD;
  v_violations TEXT := '';
BEGIN
  FOR v_rec IN (
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (roles && ARRAY['anon'::name, 'public'::name])
      AND (qual = 'true' OR with_check = 'true')
      AND NOT (
        tablename IN ('categories', 'menu_items', 'tables', 'pricing_plans', 'menu_item_variants')
        AND cmd = 'SELECT'
      )
  ) LOOP
    v_violations := v_violations || format(
      E'\n- Table: %s | Policy: %s | Cmd: %s | Roles: %s | Qual: %s | WithCheck: %s',
      v_rec.tablename, v_rec.policyname, v_rec.cmd, array_to_string(v_rec.roles, ','), v_rec.qual, v_rec.with_check
    );
  END LOOP;

  IF v_violations != '' THEN
    RAISE EXCEPTION 'CRITICAL SECURITY VIOLATION: Unintended open policies found for anon/public:%', v_violations;
  END IF;
END $$;
