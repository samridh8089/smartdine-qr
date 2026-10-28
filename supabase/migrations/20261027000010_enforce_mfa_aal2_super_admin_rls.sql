-- Migration: 20261027000002_enforce_mfa_aal2_super_admin_rls.sql
-- Description: Enforce mandatory AAL2 (TOTP Two-Factor Authentication) check on all RLS policies granting super_admin access bypass.

-- ============================================================================
-- 1. INVENTORY RESERVATIONS & PREPARED FOOD DISPOSITIONS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.inventory_reservations') IS NOT NULL THEN
    ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_reservations" ON public.inventory_reservations;

    CREATE POLICY "staff_manage_inventory_reservations"
      ON public.inventory_reservations
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.prepared_food_dispositions') IS NOT NULL THEN
    ALTER TABLE public.prepared_food_dispositions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_prepared_food_dispositions" ON public.prepared_food_dispositions;

    CREATE POLICY "staff_manage_prepared_food_dispositions"
      ON public.prepared_food_dispositions
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 2. CUSTOMER REQUESTS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.customer_requests') IS NOT NULL THEN
    ALTER TABLE public.customer_requests ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_customer_requests" ON public.customer_requests;

    CREATE POLICY "staff_manage_customer_requests"
      ON public.customer_requests
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 3. SYSTEM EVENTS (Audit Event Bus)
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.system_events') IS NOT NULL THEN
    ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "super_admin_all_system_events" ON public.system_events;

    CREATE POLICY "super_admin_all_system_events"
      ON public.system_events
      FOR ALL
      TO authenticated
      USING (
        (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      )
      WITH CHECK (
        (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      );
  END IF;
END $$;

-- ============================================================================
-- 4. MENU ITEM VARIANTS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.menu_item_variants') IS NOT NULL THEN
    ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_menu_item_variants" ON public.menu_item_variants;

    CREATE POLICY "staff_manage_menu_item_variants"
      ON public.menu_item_variants
      FOR ALL
      TO authenticated
      USING (
        menu_item_id IN (
          SELECT mi.id FROM public.menu_items mi
          JOIN public.restaurants r ON mi.restaurant_id = r.id
          JOIN public.profiles p ON p.restaurant_id = r.id
          WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        menu_item_id IN (
          SELECT mi.id FROM public.menu_items mi
          JOIN public.restaurants r ON mi.restaurant_id = r.id
          JOIN public.profiles p ON p.restaurant_id = r.id
          WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 5. STAFF PROFILES & ATTENDANCE MANAGEMENT TABLES
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.staff_profiles') IS NOT NULL THEN
    ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_staff_profiles" ON public.staff_profiles;

    CREATE POLICY "staff_manage_staff_profiles"
      ON public.staff_profiles
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.shifts') IS NOT NULL THEN
    ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_shifts" ON public.shifts;

    CREATE POLICY "staff_manage_shifts"
      ON public.shifts
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.staff_shifts') IS NOT NULL THEN
    ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_staff_shifts" ON public.staff_shifts;

    CREATE POLICY "staff_manage_staff_shifts"
      ON public.staff_shifts
      FOR ALL
      TO authenticated
      USING (
        shift_id IN (
          SELECT s.id FROM public.shifts s
          JOIN public.profiles p ON p.restaurant_id = s.restaurant_id
          WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        shift_id IN (
          SELECT s.id FROM public.shifts s
          JOIN public.profiles p ON p.restaurant_id = s.restaurant_id
          WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.staff_attendance') IS NOT NULL THEN
    ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_staff_attendance" ON public.staff_attendance;

    CREATE POLICY "staff_manage_staff_attendance"
      ON public.staff_attendance
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.salary_records') IS NOT NULL THEN
    ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_salary_records" ON public.salary_records;

    CREATE POLICY "staff_manage_salary_records"
      ON public.salary_records
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 6. INVENTORY ENGINE EXTENDED TABLES (Strict RLS Super Admin AAL2)
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.inventory_categories') IS NOT NULL THEN
    ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_categories" ON public.inventory_categories;

    CREATE POLICY "staff_manage_inventory_categories"
      ON public.inventory_categories
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_items" ON public.inventory_items;

    CREATE POLICY "staff_manage_inventory_items"
      ON public.inventory_items
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_recipes') IS NOT NULL THEN
    ALTER TABLE public.inventory_recipes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_recipes" ON public.inventory_recipes;

    CREATE POLICY "staff_manage_inventory_recipes"
      ON public.inventory_recipes
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_recipe_ingredients') IS NOT NULL THEN
    ALTER TABLE public.inventory_recipe_ingredients ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_recipe_ingredients" ON public.inventory_recipe_ingredients;

    CREATE POLICY "staff_manage_inventory_recipe_ingredients"
      ON public.inventory_recipe_ingredients
      FOR ALL
      TO authenticated
      USING (
        recipe_id IN (
          SELECT r.id FROM public.inventory_recipes r
          JOIN public.profiles p ON p.restaurant_id = r.restaurant_id
          WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        recipe_id IN (
          SELECT r.id FROM public.inventory_recipes r
          JOIN public.profiles p ON p.restaurant_id = r.restaurant_id
          WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_transactions') IS NOT NULL THEN
    ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_transactions" ON public.inventory_transactions;

    CREATE POLICY "staff_manage_inventory_transactions"
      ON public.inventory_transactions
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_purchases') IS NOT NULL THEN
    ALTER TABLE public.inventory_purchases ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_purchases" ON public.inventory_purchases;

    CREATE POLICY "staff_manage_inventory_purchases"
      ON public.inventory_purchases
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_purchase_items') IS NOT NULL THEN
    ALTER TABLE public.inventory_purchase_items ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_purchase_items" ON public.inventory_purchase_items;

    CREATE POLICY "staff_manage_inventory_purchase_items"
      ON public.inventory_purchase_items
      FOR ALL
      TO authenticated
      USING (
        purchase_id IN (
          SELECT p.id FROM public.inventory_purchases p
          JOIN public.profiles prof ON prof.restaurant_id = p.restaurant_id
          WHERE prof.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        purchase_id IN (
          SELECT p.id FROM public.inventory_purchases p
          JOIN public.profiles prof ON prof.restaurant_id = p.restaurant_id
          WHERE prof.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_waste') IS NOT NULL THEN
    ALTER TABLE public.inventory_waste ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_waste" ON public.inventory_waste;

    CREATE POLICY "staff_manage_inventory_waste"
      ON public.inventory_waste
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.inventory_alerts') IS NOT NULL THEN
    ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_manage_inventory_alerts" ON public.inventory_alerts;

    CREATE POLICY "staff_manage_inventory_alerts"
      ON public.inventory_alerts
      FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;
