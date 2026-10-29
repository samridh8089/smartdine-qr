-- Migration: 20261028000001_enforce_mfa_aal2_remaining_policies.sql
-- Description: Patch remaining 24 policies so all super_admin access bypasses require mandatory AAL2 (TOTP).

-- ============================================================================
-- 1. DROP OBSOLETE DUPLICATE INVENTORY POLICIES (staff_scoped_*)
-- (These tables already have staff_manage_* policies strictly enforcing AAL2)
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.inventory_alerts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_alerts" ON public.inventory_alerts;
  END IF;
  IF to_regclass('public.inventory_categories') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_categories" ON public.inventory_categories;
  END IF;
  IF to_regclass('public.inventory_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_items" ON public.inventory_items;
  END IF;
  IF to_regclass('public.inventory_purchase_items') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_purchase_items" ON public.inventory_purchase_items;
  END IF;
  IF to_regclass('public.inventory_purchases') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_purchases" ON public.inventory_purchases;
  END IF;
  IF to_regclass('public.inventory_recipe_ingredients') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_recipe_ingredients" ON public.inventory_recipe_ingredients;
  END IF;
  IF to_regclass('public.inventory_recipes') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_recipes" ON public.inventory_recipes;
  END IF;
  IF to_regclass('public.inventory_reservations') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_reservations" ON public.inventory_reservations;
  END IF;
  IF to_regclass('public.inventory_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_transactions" ON public.inventory_transactions;
  END IF;
  IF to_regclass('public.inventory_waste') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_inventory_waste" ON public.inventory_waste;
  END IF;
  IF to_regclass('public.prepared_food_dispositions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "staff_scoped_prepared_food_dispositions" ON public.prepared_food_dispositions;
  END IF;
END $$;

-- ============================================================================
-- 2. ORDER BATCHES
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.order_batches') IS NOT NULL THEN
    ALTER TABLE public.order_batches ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow owners/staff to manage order_batches" ON public.order_batches;

    CREATE POLICY "Allow owners/staff to manage order_batches"
      ON public.order_batches FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_batches.order_id 
            AND (
              o.restaurant_id = public.get_user_restaurant_id(auth.uid())
              OR (
                EXISTS (
                  SELECT 1 FROM public.profiles p 
                  WHERE p.id = auth.uid() AND p.role = 'super_admin'
                )
                AND (auth.jwt() ->> 'aal') = 'aal2'
              )
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_batches.order_id 
            AND (
              o.restaurant_id = public.get_user_restaurant_id(auth.uid())
              OR (
                EXISTS (
                  SELECT 1 FROM public.profiles p 
                  WHERE p.id = auth.uid() AND p.role = 'super_admin'
                )
                AND (auth.jwt() ->> 'aal') = 'aal2'
              )
            )
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 3. PRICING PLANS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.pricing_plans') IS NOT NULL THEN
    ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow super admin to manage pricing plans" ON public.pricing_plans;

    CREATE POLICY "Allow super admin to manage pricing plans"
      ON public.pricing_plans FOR ALL
      TO authenticated
      USING (
        (
          (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
          OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      )
      WITH CHECK (
        (
          (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
          OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      );
  END IF;
END $$;

-- ============================================================================
-- 4. PROFILES
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow super admin to manage all profiles" ON public.profiles;

    CREATE POLICY "Allow super admin to manage all profiles"
      ON public.profiles FOR ALL
      TO authenticated
      USING (
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      )
      WITH CHECK (
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      );
  END IF;
END $$;

-- ============================================================================
-- 5. RESTAURANTS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.restaurants') IS NOT NULL THEN
    ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow super admin to manage all restaurants" ON public.restaurants;

    CREATE POLICY "Allow super admin to manage all restaurants"
      ON public.restaurants FOR ALL
      TO authenticated
      USING (
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      )
      WITH CHECK (
        (
          (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
          OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
        )
        AND (auth.jwt() ->> 'aal') = 'aal2'
      );
  END IF;
END $$;

-- ============================================================================
-- 6. RESTAURANT EXPENSES
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.restaurant_expenses') IS NOT NULL THEN
    ALTER TABLE public.restaurant_expenses ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Allow owners to view expenses" ON public.restaurant_expenses;
    DROP POLICY IF EXISTS "Allow owners to insert expenses" ON public.restaurant_expenses;
    DROP POLICY IF EXISTS "Allow owners to update expenses" ON public.restaurant_expenses;
    DROP POLICY IF EXISTS "Allow owners to delete expenses" ON public.restaurant_expenses;

    CREATE POLICY "Allow owners to view expenses"
      ON public.restaurant_expenses FOR SELECT
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p
          WHERE p.id = auth.uid() AND (
            p.role = 'owner'
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      );

    CREATE POLICY "Allow owners to insert expenses"
      ON public.restaurant_expenses FOR INSERT
      TO authenticated
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p
          WHERE p.id = auth.uid() AND (
            p.role = 'owner'
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      );

    CREATE POLICY "Allow owners to update expenses"
      ON public.restaurant_expenses FOR UPDATE
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p
          WHERE p.id = auth.uid() AND (
            p.role = 'owner'
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p
          WHERE p.id = auth.uid() AND (
            p.role = 'owner'
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      );

    CREATE POLICY "Allow owners to delete expenses"
      ON public.restaurant_expenses FOR DELETE
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p
          WHERE p.id = auth.uid() AND (
            p.role = 'owner'
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 7. SYSTEM EVENTS
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.system_events') IS NOT NULL THEN
    ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_insert_system_events" ON public.system_events;

    CREATE POLICY "staff_insert_system_events"
      ON public.system_events FOR INSERT
      TO authenticated
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p
          WHERE p.id = auth.uid() AND (
            p.restaurant_id IS NOT NULL 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
        OR (
          (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
          AND (auth.jwt() ->> 'aal') = 'aal2'
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 8. TABLE MERGE POLICIES
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.table_merge_groups') IS NOT NULL THEN
    ALTER TABLE public.table_merge_groups ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_table_merge_groups_policy" ON public.table_merge_groups;

    CREATE POLICY "staff_table_merge_groups_policy"
      ON public.table_merge_groups FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p 
          WHERE p.id = auth.uid() AND (
            p.restaurant_id IS NOT NULL 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p 
          WHERE p.id = auth.uid() AND (
            p.restaurant_id IS NOT NULL 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      );
  END IF;

  IF to_regclass('public.table_merge_members') IS NOT NULL THEN
    ALTER TABLE public.table_merge_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_table_merge_members_policy" ON public.table_merge_members;

    CREATE POLICY "staff_table_merge_members_policy"
      ON public.table_merge_members FOR ALL
      TO authenticated
      USING (
        merge_group_id IN (
          SELECT g.id FROM public.table_merge_groups g
          JOIN public.profiles p ON p.restaurant_id = g.restaurant_id 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          WHERE p.id = auth.uid()
        )
      )
      WITH CHECK (
        merge_group_id IN (
          SELECT g.id FROM public.table_merge_groups g
          JOIN public.profiles p ON p.restaurant_id = g.restaurant_id 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          WHERE p.id = auth.uid()
        )
      );
  END IF;

  IF to_regclass('public.table_merge_sessions') IS NOT NULL THEN
    ALTER TABLE public.table_merge_sessions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_table_merge_sessions_policy" ON public.table_merge_sessions;

    CREATE POLICY "staff_table_merge_sessions_policy"
      ON public.table_merge_sessions FOR ALL
      TO authenticated
      USING (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p 
          WHERE p.id = auth.uid() AND (
            p.restaurant_id IS NOT NULL 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      )
      WITH CHECK (
        restaurant_id IN (
          SELECT p.restaurant_id FROM public.profiles p 
          WHERE p.id = auth.uid() AND (
            p.restaurant_id IS NOT NULL 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          )
        )
      );
  END IF;

  IF to_regclass('public.table_merge_session_members') IS NOT NULL THEN
    ALTER TABLE public.table_merge_session_members ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "staff_table_merge_session_members_policy" ON public.table_merge_session_members;

    CREATE POLICY "staff_table_merge_session_members_policy"
      ON public.table_merge_session_members FOR ALL
      TO authenticated
      USING (
        session_id IN (
          SELECT s.id FROM public.table_merge_sessions s
          JOIN public.profiles p ON p.restaurant_id = s.restaurant_id 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          WHERE p.id = auth.uid()
        )
      )
      WITH CHECK (
        session_id IN (
          SELECT s.id FROM public.table_merge_sessions s
          JOIN public.profiles p ON p.restaurant_id = s.restaurant_id 
            OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
          WHERE p.id = auth.uid()
        )
      );
  END IF;
END $$;
