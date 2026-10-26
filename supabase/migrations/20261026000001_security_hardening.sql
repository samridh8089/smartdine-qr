-- ==============================================================================
-- Migration: 20261026000001_security_hardening.sql
-- Purpose:
-- 1. REVOKE EXECUTE from PUBLIC, anon, authenticated and GRANT only to service_role
--    for: reset_staff_password, serve_order_atomic, deduct_inventory_batch_atomic,
--    reverse_inventory_batch_atomic, create_restaurant_and_link, exec_sql.
-- 2. Replace delete_staff_user with tenant/role-safe version.
-- 3. Replace handle_new_user so raw_user_meta_data role 'super_admin' becomes 'owner'.
-- 4. ALTER DEFAULT PRIVILEGES to revoke execute on new functions from PUBLIC, anon, authenticated.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REVOKE AND RESTRICT RPC PRIVILEGES (SERVICE ROLE ONLY)
-- ------------------------------------------------------------------------------
DO $$ 
BEGIN
  -- 1.1 reset_staff_password
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_staff_password') THEN
    REVOKE EXECUTE ON FUNCTION public.reset_staff_password(target_user_id uuid, new_password text) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.reset_staff_password(target_user_id uuid, new_password text) TO service_role;
  END IF;

  -- 1.2 serve_order_atomic
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'serve_order_atomic') THEN
    REVOKE EXECUTE ON FUNCTION public.serve_order_atomic FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.serve_order_atomic TO service_role;
  END IF;

  -- 1.3 deduct_inventory_batch_atomic
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'deduct_inventory_batch_atomic') THEN
    REVOKE EXECUTE ON FUNCTION public.deduct_inventory_batch_atomic FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.deduct_inventory_batch_atomic TO service_role;
  END IF;

  -- 1.4 reverse_inventory_batch_atomic
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reverse_inventory_batch_atomic') THEN
    REVOKE EXECUTE ON FUNCTION public.reverse_inventory_batch_atomic FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.reverse_inventory_batch_atomic TO service_role;
  END IF;

  -- 1.5 create_restaurant_and_link
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_restaurant_and_link') THEN
    REVOKE EXECUTE ON FUNCTION public.create_restaurant_and_link FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.create_restaurant_and_link TO service_role;
  END IF;

  -- 1.6 exec_sql
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'exec_sql') THEN
    REVOKE EXECUTE ON FUNCTION public.exec_sql FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. REPLACE delete_staff_user WITH ROLE & TENANT ENFORCEMENT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_staff_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_caller_restaurant_id uuid;
  v_target_role text;
  v_target_restaurant_id uuid;
BEGIN
  -- Check caller permissions
  SELECT role, restaurant_id INTO v_caller_role, v_caller_restaurant_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only restaurant owners and super admins can delete staff users';
  END IF;

  -- Check target existence and role
  SELECT role, restaurant_id INTO v_target_role, v_target_restaurant_id
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Prevent deleting owner or super_admin accounts
  IF v_target_role IN ('owner', 'super_admin') THEN
    RAISE EXCEPTION 'Forbidden: Cannot delete owner or super_admin accounts';
  END IF;

  -- Prevent cross-restaurant staff deletion (unless caller is super_admin)
  IF v_caller_role != 'super_admin' THEN
    IF v_caller_restaurant_id IS NULL OR v_target_restaurant_id IS NULL OR v_caller_restaurant_id != v_target_restaurant_id THEN
      RAISE EXCEPTION 'Unauthorized: Cannot delete staff from another restaurant';
    END IF;
  END IF;

  -- Delete from auth.users (cascades to profile)
  DELETE FROM auth.users WHERE id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_staff_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_staff_user(uuid) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. REPLACE handle_new_user TRIGGER (BLOCK 'super_admin' ON SIGNUP)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, email, full_name, role, restaurant_id, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'fullName', NEW.raw_user_meta_data->>'full_name', ''),
        -- Security rule: raw_user_meta_data role 'super_admin' is NEVER accepted (becomes 'owner')
        CASE 
            WHEN LOWER(COALESCE(NEW.raw_user_meta_data->>'role', '')) IN ('super_admin', 'superadmin', 'admin') THEN 'owner'
            ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
        END,
        NULL,
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        email = EXCLUDED.email,
        full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
        updated_at = now();

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

-- ------------------------------------------------------------------------------
-- 4. ALTER DEFAULT PRIVILEGES (NEW FUNCTIONS NOT EXECUTABLE BY ANON/PUBLIC)
-- ------------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
