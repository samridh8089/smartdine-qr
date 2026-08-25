-- ============================================================================
-- STRICT MULTI-TENANT RLS POLICIES FOR ORDERS & ORDER_BATCHES
-- ============================================================================

-- 1. DROP TEMPORARY PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Allow public update order_batches" ON public.order_batches;
DROP POLICY IF EXISTS "Allow public update orders" ON public.orders;
DROP POLICY IF EXISTS "Allow authenticated update order_batches" ON public.order_batches;
DROP POLICY IF EXISTS "Allow authenticated update orders" ON public.orders;

-- REVOKE ALL WRITE PERMISSIONS FROM ANON ROLE
REVOKE INSERT, UPDATE, DELETE ON public.order_batches FROM anon;
REVOKE UPDATE, DELETE ON public.orders FROM anon;

-- ENSURE ANON CAN ONLY INSERT NEW ORDERS (CUSTOMER QR ORDERING) & SELECT
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT SELECT, INSERT ON public.order_batches TO anon;

-- 2. CREATE STRICT AUTHENTICATED RLS POLICIES (OWNER & STAFF OF SAME RESTAURANT ONLY)

-- ORDERS TABLE: Authenticated users can UPDATE orders ONLY if their profile matches the restaurant_id
CREATE POLICY "Allow authenticated update orders" ON public.orders
FOR UPDATE
TO authenticated
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid() OR id = auth.uid()
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid() OR id = auth.uid()
  )
);

-- ORDER_BATCHES TABLE: Authenticated users can UPDATE order_batches ONLY if the batch belongs to their restaurant
CREATE POLICY "Allow authenticated update order_batches" ON public.order_batches
FOR UPDATE
TO authenticated
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid() OR id = auth.uid()
    )
  )
)
WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders WHERE restaurant_id IN (
      SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid() OR id = auth.uid()
    )
  )
);

-- RE-ENABLE ROW LEVEL SECURITY
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_batches ENABLE ROW LEVEL SECURITY;
