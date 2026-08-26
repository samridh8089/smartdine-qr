-- Enable UPDATE policy on order_batches and orders for anon role
DROP POLICY IF EXISTS "Allow public update order_batches" ON public.order_batches;
CREATE POLICY "Allow public update order_batches" ON public.order_batches
FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update orders" ON public.orders;
CREATE POLICY "Allow public update orders" ON public.orders
FOR UPDATE USING (true) WITH CHECK (true);

-- Ensure RLS is enabled and permissions granted
ALTER TABLE public.order_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.order_batches TO anon, authenticated, service_role;
GRANT ALL ON public.orders TO anon, authenticated, service_role;
