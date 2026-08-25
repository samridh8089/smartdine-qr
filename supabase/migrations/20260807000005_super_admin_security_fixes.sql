-- Migration for Super Admin Module Hardening (BUG-SA1, BUG-SA3)

-- 1. Add deleted_at column to restaurants for soft-delete lifecycle
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT null;

-- 2. Create verify_super_admin RPC function for server-side security authorization
CREATE OR REPLACE FUNCTION public.verify_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  calling_role text;
BEGIN
  SELECT role INTO calling_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF calling_role = 'super_admin' THEN
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Unauthorized: Super Admin privileges required';
  END IF;
END;
$$;
