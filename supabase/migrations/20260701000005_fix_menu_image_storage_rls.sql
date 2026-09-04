-- ==============================================================================
-- Migration: 20260701000005_fix_menu_image_storage_rls.sql
-- Fix: BUG-001 Menu Image Storage RLS & Unique Isolation
-- Ensures:
-- 1. get_user_restaurant_id uses aliased column check to avoid shadowing
-- 2. Storage INSERT/SELECT/UPDATE/DELETE policies permit uploads matching:
--    menu_items/<restaurant_id>/<filename>
--    or <restaurant_id>/menu-items/<filename>
-- ==============================================================================

-- 1. Fix helper function to prevent column name shadowing (profiles.id = profiles.user_id bug)
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(user_id UUID)
RETURNS UUID AS $$
  SELECT p.restaurant_id FROM public.profiles p WHERE p.id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Ensure both buckets exist and are public
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('smartdine-images', 'smartdine-images', true),
  ('menu-item-images', 'menu-item-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. SELECT Policy (Public Read)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
USING (bucket_id IN ('smartdine-images', 'menu-item-images'));

-- 4. INSERT Policy (Authenticated staff upload to their restaurant folder)
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow staff to upload images" ON storage.objects;
CREATE POLICY "Allow staff to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('smartdine-images', 'menu-item-images')
  AND (
    -- Path format: menu_items/<restaurant_id>/<file>
    (
      (storage.foldername(name))[1] = 'menu_items'
      AND (
        (storage.foldername(name))[2] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
        OR (storage.foldername(name))[2] = public.get_user_restaurant_id(auth.uid())::text
      )
    )
    -- Path format: <restaurant_id>/...
    OR (
      (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
      OR (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
    )
    -- Super admin bypass
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
);

-- 5. UPDATE Policy (Staff can update their restaurant's images)
DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow staff to update images" ON storage.objects;
CREATE POLICY "Allow staff to update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('smartdine-images', 'menu-item-images')
  AND (
    (
      (storage.foldername(name))[1] = 'menu_items'
      AND (
        (storage.foldername(name))[2] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
        OR (storage.foldername(name))[2] = public.get_user_restaurant_id(auth.uid())::text
      )
    )
    OR (
      (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
      OR (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
);

-- 6. DELETE Policy (Staff can delete only their restaurant's images)
DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow staff to delete images" ON storage.objects;
CREATE POLICY "Allow staff to delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('smartdine-images', 'menu-item-images')
  AND (
    (
      (storage.foldername(name))[1] = 'menu_items'
      AND (
        (storage.foldername(name))[2] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
        OR (storage.foldername(name))[2] = public.get_user_restaurant_id(auth.uid())::text
      )
    )
    OR (
      (storage.foldername(name))[1] = (auth.jwt() -> 'user_metadata' ->> 'restaurant_id')
      OR (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
    )
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  )
);
