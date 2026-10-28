-- Migration: 20261028000002_rls_privilege_escalation.sql
-- Description: Complete privilege escalation mitigation, restaurant staff role bounding, 
-- subscription column locking trigger, and removal of user_metadata dependency in RLS.

-- ============================================================================
-- 1. RESTAURANTS: STAFF PERMISSION SCOPING & REMOVE USER_METADATA POLICIES
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.restaurants') IS NOT NULL THEN
    ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

    -- Drop legacy policies granting full ALL to any staff or relying on user_metadata
    DROP POLICY IF EXISTS "Owners manage their restaurant" ON public.restaurants;
    DROP POLICY IF EXISTS "Allow owners/staff to update their own restaurant" ON public.restaurants;
    DROP POLICY IF EXISTS "Allow public to read restaurants (for customer menu)" ON public.restaurants;
    DROP POLICY IF EXISTS "Allow public to insert restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "Allow super admin to manage all restaurants" ON public.restaurants;
    DROP POLICY IF EXISTS "staff_select_own_restaurant" ON public.restaurants;
    DROP POLICY IF EXISTS "owner_manager_update_restaurant" ON public.restaurants;
    DROP POLICY IF EXISTS "owner_delete_restaurant" ON public.restaurants;
    DROP POLICY IF EXISTS "owner_insert_restaurant" ON public.restaurants;

    -- 1.1 SELECT: All active staff of the restaurant (and super admin with aal2) can view their restaurant
    CREATE POLICY "staff_select_own_restaurant"
      ON public.restaurants FOR SELECT
      TO authenticated
      USING (
        id = public.get_user_restaurant_id(auth.uid())
        OR owner_id = auth.uid()
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      );

    -- 1.2 UPDATE: Only Owner and Manager can update restaurant settings (waiter/kitchen staff CANNOT)
    CREATE POLICY "owner_manager_update_restaurant"
      ON public.restaurants FOR UPDATE
      TO authenticated
      USING (
        (
          (id = public.get_user_restaurant_id(auth.uid()) OR owner_id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'manager')
          )
        )
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      )
      WITH CHECK (
        (
          (id = public.get_user_restaurant_id(auth.uid()) OR owner_id = auth.uid())
          AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'manager')
          )
        )
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      );

    -- 1.3 DELETE: Strictly the actual Owner or verified Super Admin (aal2)
    CREATE POLICY "owner_delete_restaurant"
      ON public.restaurants FOR DELETE
      TO authenticated
      USING (
        owner_id = auth.uid()
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      );

    -- 1.4 INSERT: Authenticated user onboarding their own restaurant or super admin with aal2
    CREATE POLICY "owner_insert_restaurant"
      ON public.restaurants FOR INSERT
      TO authenticated
      WITH CHECK (
        owner_id = auth.uid()
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      );
  END IF;
END $$;

-- ============================================================================
-- 2. RESTAURANTS: BEFORE UPDATE TRIGGER LOCKING PRIVILEGED COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.protect_restaurant_privileged_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Service role and server backend operations (e.g. webhooks, payment verification) are allowed
  IF current_user IN ('postgres', 'supabase_admin', 'service_role')
     OR (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Verified super_admin with AAL2 is allowed
  IF public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2' THEN
    RETURN NEW;
  END IF;

  -- Block any client-side caller from altering subscription, billing, trial, or owner_id
  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.billing_interval IS DISTINCT FROM OLD.billing_interval
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'Privileged restaurant columns (plan, status, billing_interval, trial_ends_at, owner_id) cannot be modified directly';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_restaurant_privileged_columns ON public.restaurants;
CREATE TRIGGER trg_protect_restaurant_privileged_columns
BEFORE UPDATE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.protect_restaurant_privileged_columns();

-- ============================================================================
-- 3. ORDERS: PURGE USER_METADATA POLICIES AND REWRITE WITH PROFILES CHECK
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.orders') IS NOT NULL THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow owners/staff to read/write their restaurant orders" ON public.orders;
    
    CREATE POLICY "Allow owners/staff to read/write their restaurant orders"
      ON public.orders FOR ALL
      TO authenticated
      USING (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      )
      WITH CHECK (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
        OR (public.is_super_admin_user() AND (auth.jwt() ->> 'aal') = 'aal2')
      );
  END IF;
END $$;

-- ============================================================================
-- 4. CUSTOMER REQUESTS: DROP OBSOLETE USER_METADATA POLICY
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.customer_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow owners/staff to manage customer requests" ON public.customer_requests;
  END IF;
END $$;

-- ============================================================================
-- 5. PROFILES: ENFORCE WITH CHECK ON USER PROFILE UPDATES
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

    CREATE POLICY "Allow users to update their own profile"
      ON public.profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
