-- Migration: Waiter Module Atomic Fixes (BUG-W1 Partial Unique Index, BUG-W2 Columns & Status Constraint, BUG-W3 RPC)
BEGIN;

-- 1. Partial Unique Index to prevent duplicate active customer requests for same table & type (BUG-W1)
CREATE UNIQUE INDEX IF NOT EXISTS unq_pending_customer_requests 
ON public.customer_requests (restaurant_id, table_id, type) 
WHERE status IN ('pending', 'accepted');

-- 2. Update status check constraint to include 'accepted', 'cancelled', 'expired' (BUG-W2)
ALTER TABLE public.customer_requests DROP CONSTRAINT IF EXISTS customer_requests_status_check;
ALTER TABLE public.customer_requests ADD CONSTRAINT customer_requests_status_check CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled', 'expired'));

-- 3. Add lifecycle timestamp & staff columns to customer_requests (BUG-W2)
ALTER TABLE public.customer_requests 
ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
ADD COLUMN IF NOT EXISTS accepted_by text,
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- 4. Atomic Order & Batch Serving Function (BUG-W3)
CREATE OR REPLACE FUNCTION public.serve_order_atomic(
    p_order_id uuid,
    p_served_by text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_now timestamptz := now();
    v_order record;
BEGIN
    -- Lock parent order row for update
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    -- Update parent order status to served
    UPDATE public.orders
    SET status = 'served',
        updated_at = v_now
    WHERE id = p_order_id;

    -- Update all non-cancelled batches to served
    UPDATE public.order_batches
    SET status = 'served',
        served_at = v_now,
        served_by = p_served_by,
        updated_at = v_now
    WHERE order_id = p_order_id
      AND status != 'cancelled'
      AND (special_instructions IS NULL OR special_instructions NOT LIKE '%[CANCELLED]%');

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

COMMIT;
