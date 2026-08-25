-- Migration: Portion Recipes, Inventory Reservations, and Prepared Food Dispositions

-- 1. Extend order_items with variant tracking
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.menu_item_variants(id) ON DELETE SET NULL;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS is_served BOOLEAN DEFAULT false;

-- 2. Extend inventory_items with reserved stock
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS reserved_stock NUMERIC(12,4) NOT NULL DEFAULT 0;

-- 3. Extend inventory_recipes to support variant / portion specific recipes
ALTER TABLE public.inventory_recipes ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.menu_item_variants(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_recipes DROP CONSTRAINT IF EXISTS uq_inventory_recipe_menu_item;
DROP INDEX IF EXISTS uq_inventory_recipes_restaurant_menu_item_variant;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_recipes_restaurant_menu_item_variant 
  ON public.inventory_recipes (restaurant_id, menu_item_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 4. Create inventory_reservations table
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.order_batches(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  reserved_quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CONSUMED', 'RELEASED')),
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_res_order_batch ON public.inventory_reservations(restaurant_id, order_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_inv_res_item ON public.inventory_reservations(inventory_item_id, status);

-- 5. Create prepared_food_dispositions table
CREATE TABLE IF NOT EXISTS public.prepared_food_dispositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.order_batches(id) ON DELETE SET NULL,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL,
  variant_name TEXT,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  was_served BOOLEAN DEFAULT false,
  disposition_type TEXT NOT NULL CHECK (disposition_type IN ('reallocated', 'staff_meal', 'complimentary', 'owner_internal', 'waste', 'other')),
  destination_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  destination_order_display_id TEXT,
  waste_reason TEXT,
  notes TEXT,
  handled_by TEXT NOT NULL,
  inventory_restored BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_food_disp_order ON public.prepared_food_dispositions(restaurant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_food_disp_type ON public.prepared_food_dispositions(restaurant_id, disposition_type);

-- 6. Extend orders table with lifecycle and cancellation metadata
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_from_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_consumed BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_restored BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none';

-- 7. Enable RLS and permissions
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prepared_food_dispositions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public select inventory_reservations" ON public.inventory_reservations;
CREATE POLICY "Public select inventory_reservations" ON public.inventory_reservations FOR SELECT USING (true);

DROP POLICY IF EXISTS "All operations inventory_reservations" ON public.inventory_reservations;
CREATE POLICY "All operations inventory_reservations" ON public.inventory_reservations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select prepared_food_dispositions" ON public.prepared_food_dispositions;
CREATE POLICY "Public select prepared_food_dispositions" ON public.prepared_food_dispositions FOR SELECT USING (true);

DROP POLICY IF EXISTS "All operations prepared_food_dispositions" ON public.prepared_food_dispositions;
CREATE POLICY "All operations prepared_food_dispositions" ON public.prepared_food_dispositions FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.inventory_reservations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.prepared_food_dispositions TO anon, authenticated, service_role;
