-- Migration: Add explicit WITH CHECK to restaurant_expenses UPDATE policy
-- Author: Security Engineer
-- Description: Enforces that updates on restaurant_expenses cannot modify the restaurant_id
-- to a restaurant that the caller does not own/manage.

DROP POLICY IF EXISTS "Allow owners to update expenses" ON public.restaurant_expenses;

CREATE POLICY "Allow owners to update expenses"
  ON public.restaurant_expenses FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'super_admin')
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'super_admin')
    )
  );
