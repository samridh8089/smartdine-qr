-- Migration for Owner Module Fixes (BUG-O3)

-- 1. Remove plain_password column from public.profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plain_password;

-- 2. Create secure RPC for staff password reset
CREATE OR REPLACE FUNCTION public.reset_staff_password(target_user_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;
