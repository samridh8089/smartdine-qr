-- Migration: Add 'cancelled' status to public.order_batches check constraint
BEGIN;

ALTER TABLE public.order_batches 
DROP CONSTRAINT IF EXISTS order_batches_status_check;

ALTER TABLE public.order_batches 
ADD CONSTRAINT order_batches_status_check 
CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'served', 'cancelled'));

COMMIT;
