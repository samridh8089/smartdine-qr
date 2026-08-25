-- Add Tax Snapshot and Settings columns to orders table in public schema
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS discount_total NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_total NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS tax_rate_snapshot NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_type_snapshot TEXT DEFAULT 'none';

COMMENT ON COLUMN public.orders.discount_total IS 'Snapshot of total discount applied to order';
COMMENT ON COLUMN public.orders.cgst_amount IS 'Snapshot of CGST tax amount at order placement';
COMMENT ON COLUMN public.orders.sgst_amount IS 'Snapshot of SGST tax amount at order placement';
COMMENT ON COLUMN public.orders.igst_amount IS 'Snapshot of IGST tax amount at order placement';
COMMENT ON COLUMN public.orders.tax_total IS 'Snapshot of total tax (CGST+SGST or IGST) at order placement';
COMMENT ON COLUMN public.orders.grand_total IS 'Snapshot of total customer payment amount including taxes and discounts';
COMMENT ON COLUMN public.orders.tax_rate_snapshot IS 'Snapshot of combined tax rate percentage at order placement';
COMMENT ON COLUMN public.orders.tax_type_snapshot IS 'Snapshot of tax mode at order placement: cgst_sgst, igst, or none';
