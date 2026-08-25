SELECT id, table_name, status, special_instructions, created_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;

SELECT id, order_id, batch_number, status, special_instructions, created_at
FROM public.order_batches
ORDER BY created_at DESC
LIMIT 10;
