-- Migration: 20261031000000_staff_petty_cash_and_requisitions.sql
-- Description: Extends restaurant_expenses with cashier approval workflow and store requisition tracking, and opens RLS to staff (Cashier/Manager) with strict Owner protection.

DO $$
BEGIN
  -- 1. Add approval_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant_expenses' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE public.restaurant_expenses 
      ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved' 
      CHECK (approval_status IN ('approved', 'pending_approval', 'rejected'));
  END IF;

  -- 2. Add approved_by column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant_expenses' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.restaurant_expenses 
      ADD COLUMN approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- 3. Add approved_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant_expenses' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.restaurant_expenses 
      ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  -- 4. Add staff_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant_expenses' AND column_name = 'staff_name'
  ) THEN
    ALTER TABLE public.restaurant_expenses 
      ADD COLUMN staff_name TEXT;
  END IF;

  -- 5. Add expense_source column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant_expenses' AND column_name = 'expense_source'
  ) THEN
    ALTER TABLE public.restaurant_expenses 
      ADD COLUMN expense_source TEXT DEFAULT 'cash_counter' 
      CHECK (expense_source IN ('cash_counter', 'store_inventory', 'vendor_invoice', 'direct'));
  END IF;

  -- 6. Add inventory_item_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'restaurant_expenses' AND column_name = 'inventory_item_id'
  ) THEN
    ALTER TABLE public.restaurant_expenses 
      ADD COLUMN inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL;
  END IF;

  -- 7. Update payment_mode check constraint to include 'store_inventory'
  ALTER TABLE public.restaurant_expenses DROP CONSTRAINT IF EXISTS restaurant_expenses_payment_mode_check;
  ALTER TABLE public.restaurant_expenses 
    ADD CONSTRAINT restaurant_expenses_payment_mode_check 
    CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'store_inventory'));

END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_restaurant_expenses_approval 
  ON public.restaurant_expenses(restaurant_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_restaurant_expenses_source 
  ON public.restaurant_expenses(restaurant_id, expense_source);

-- Row Level Security (RLS) Enforcement
ALTER TABLE public.restaurant_expenses ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Allow Owners, Managers, Cashiers, Supervisors
DROP POLICY IF EXISTS "Allow staff to view expenses" ON public.restaurant_expenses;
DROP POLICY IF EXISTS "Allow owners to view expenses" ON public.restaurant_expenses;
CREATE POLICY "Allow staff to view expenses"
  ON public.restaurant_expenses FOR SELECT
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.role IN ('owner', 'manager', 'cashier', 'supervisor')
        OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
      )
    )
  );

-- 2. INSERT: Allow Owners, Managers, Cashiers, Supervisors (with explicit WITH CHECK)
DROP POLICY IF EXISTS "Allow staff to insert expenses" ON public.restaurant_expenses;
DROP POLICY IF EXISTS "Allow owners to insert expenses" ON public.restaurant_expenses;
CREATE POLICY "Allow staff to insert expenses"
  ON public.restaurant_expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.role IN ('owner', 'manager', 'cashier', 'supervisor')
        OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
      )
    )
  );

-- 3. UPDATE: Allow Owners and Managers (for approval/rejection workflows)
DROP POLICY IF EXISTS "Allow managers and owners to update expenses" ON public.restaurant_expenses;
DROP POLICY IF EXISTS "Allow owners to update expenses" ON public.restaurant_expenses;
CREATE POLICY "Allow managers and owners to update expenses"
  ON public.restaurant_expenses FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.role IN ('owner', 'manager')
        OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
      )
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT p.restaurant_id FROM public.profiles p
      WHERE p.id = auth.uid() AND (
        p.role IN ('owner', 'manager')
        OR (p.role = 'super_admin' AND (auth.jwt() ->> 'aal') = 'aal2')
      )
    )
  );

-- 4. DELETE: Strictly Owners and Super Admin
DROP POLICY IF EXISTS "Allow owners to delete expenses" ON public.restaurant_expenses;
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
