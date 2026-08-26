-- CleverOps Migration: Enable cross-staff SELECT RLS policy on profiles table
-- Fixes Phase 10.2 Staff Persistence & Listing

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view staff profiles in same restaurant" ON public.profiles;

CREATE POLICY "Users can view staff profiles in same restaurant"
ON public.profiles FOR SELECT
USING (
  restaurant_id IS NOT NULL AND (
    id = auth.uid() OR
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);
