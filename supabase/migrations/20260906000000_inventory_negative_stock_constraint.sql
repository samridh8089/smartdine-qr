-- ==============================================================================
-- Migration: 20260906000000_inventory_negative_stock_constraint.sql
-- Fix: BUG-INV-008 Database Negative Stock Guard
-- Target: CHECK (current_stock >= 0) on public.inventory_items
-- ==============================================================================

-- 1. Ensure any anomalous negative values are reset to 0 before constraint enforcement
UPDATE public.inventory_items 
SET current_stock = 0 
WHERE current_stock < 0;

UPDATE public.inventory_items 
SET reserved_stock = 0 
WHERE reserved_stock < 0;

-- 2. Add database CHECK constraint to prevent negative physical stock
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'chk_inventory_items_current_stock_non_negative'
  ) THEN
    ALTER TABLE public.inventory_items 
    ADD CONSTRAINT chk_inventory_items_current_stock_non_negative 
    CHECK (current_stock >= 0);
  END IF;
END $$;

-- 3. Add database CHECK constraint to prevent negative reserved stock
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'chk_inventory_items_reserved_stock_non_negative'
  ) THEN
    ALTER TABLE public.inventory_items 
    ADD CONSTRAINT chk_inventory_items_reserved_stock_non_negative 
    CHECK (reserved_stock >= 0);
  END IF;
END $$;
