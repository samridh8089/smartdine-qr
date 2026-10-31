-- Migration: fix_missing_columns.sql
-- Description: Idempotent migration to ensure discount_amount on orders, approval_status on restaurant_expenses, and is_archived on inventory_items.

-- 1. Orders table: discount_amount numeric DEFAULT 0
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- 2. Restaurant Expenses table: approval_status text DEFAULT 'approved'
ALTER TABLE public.restaurant_expenses 
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved';

-- 3. Inventory Items: is_archived boolean DEFAULT false
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
