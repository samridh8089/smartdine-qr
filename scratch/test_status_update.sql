SELECT id, status, updated_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 1;

SELECT id, order_id, status, accepted_by, accepted_at, updated_at
FROM public.order_batches
ORDER BY created_at DESC
LIMIT 1;
