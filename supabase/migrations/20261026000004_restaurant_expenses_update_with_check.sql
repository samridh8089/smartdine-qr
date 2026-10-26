-- Migration: 20261026000004_restaurant_expenses_update_with_check.sql
-- Description: Creates restaurant_expenses table (if not exists) and applies RLS with explicit WITH CHECK

CREATE TABLE IF NOT EXISTS public.restaurant_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'rent', 'electricity', 'gas_fuel', 'maintenance', 'marketing',
    'packaging', 'water_municipal', 'internet_tech', 'software_pos',
    'staff_welfare', 'tax_license', 'other'
  )),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque')),
  vendor_name TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_expenses_rest_date 
  ON public.restaurant_expenses(restaurant_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_restaurant_expenses_category 
  ON public.restaurant_expenses(restaurant_id, category);

ALTER TABLE public.restaurant_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow owners to view expenses" ON public.restaurant_expenses;
CREATE POLICY "Allow owners to view expenses"
  ON public.restaurant_expenses FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Allow owners to insert expenses" ON public.restaurant_expenses;
CREATE POLICY "Allow owners to insert expenses"
  ON public.restaurant_expenses FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'super_admin')
    )
  );

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

DROP POLICY IF EXISTS "Allow owners to delete expenses" ON public.restaurant_expenses;
CREATE POLICY "Allow owners to delete expenses"
  ON public.restaurant_expenses FOR DELETE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'super_admin')
    )
  );
