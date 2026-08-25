
-- Migration: Add menu_item_variants table and has_variants flag to menu_items

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.menu_item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    display_order INT DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & grants
ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select menu_item_variants" ON public.menu_item_variants;
CREATE POLICY "Public select menu_item_variants" ON public.menu_item_variants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "All operations for menu_item_variants" ON public.menu_item_variants;
CREATE POLICY "All operations for menu_item_variants" ON public.menu_item_variants
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.menu_item_variants TO anon, authenticated, service_role;
