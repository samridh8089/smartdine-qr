-- Migration: Create order_discounts table and trigger for cached orders.discount_amount
BEGIN;

CREATE TABLE IF NOT EXISTS public.order_discounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    batch_id UUID REFERENCES public.order_batches(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
    offer_id UUID,
    type TEXT NOT NULL CHECK (type IN ('flat', 'percentage', 'item_level', 'category_discount', 'happy_hour', 'loyalty', 'manual_discount', 'external_coupon', 'swiggy_coupon', 'zomato_coupon')),
    source TEXT NOT NULL DEFAULT 'restaurant' CHECK (source IN ('restaurant', 'swiggy', 'zomato', 'loyalty', 'staff', 'api', 'campaign')),
    code TEXT,
    title TEXT NOT NULL,
    value NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    applied_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    priority INTEGER NOT NULL DEFAULT 0,
    stackable BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for order_discounts
ALTER TABLE public.order_discounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public to read order_discounts" ON public.order_discounts;
DROP POLICY IF EXISTS "Allow public to insert order_discounts" ON public.order_discounts;
DROP POLICY IF EXISTS "Allow owners/staff to manage order_discounts" ON public.order_discounts;

CREATE POLICY "Allow public to read order_discounts"
    ON public.order_discounts FOR SELECT
    USING (true);

CREATE POLICY "Allow public to insert order_discounts"
    ON public.order_discounts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow owners/staff to manage order_discounts"
    ON public.order_discounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.orders o ON o.id = order_discounts.order_id
            WHERE p.id = auth.uid()
              AND p.restaurant_id = o.restaurant_id
        )
    );

-- Backfill legacy orders with discounts into order_discounts table
INSERT INTO public.order_discounts (order_id, type, source, code, title, value, applied_amount, priority, stackable)
SELECT 
    id AS order_id,
    CASE 
        WHEN special_instructions LIKE '%OFF%' AND special_instructions LIKE '%\%%' THEN 'percentage' 
        ELSE 'flat' 
    END AS type,
    'restaurant' AS source,
    COALESCE(offer_code, 'PROMO') AS code,
    COALESCE(offer_code, 'Promo Offer') AS title,
    COALESCE(discount_amount, 0.00) AS value,
    COALESCE(discount_amount, 0.00) AS applied_amount,
    0 AS priority,
    true AS stackable
FROM public.orders
WHERE discount_amount IS NOT NULL AND discount_amount > 0
ON CONFLICT DO NOTHING;

-- Enable Realtime for order_discounts
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.order_discounts;
EXCEPTION WHEN OTHERS THEN NULL;
END;

COMMIT;
