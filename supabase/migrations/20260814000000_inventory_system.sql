-- Migration: 20260814000000_inventory_system.sql
-- Description: Complete Inventory, Recipe Management, Transactions Ledger, Purchases, Waste, and Alerts schema

-- 1. Inventory Categories
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_categories_rest ON public.inventory_categories(restaurant_id);

-- 2. Inventory Items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'gram', -- gram, kg, ml, litre, piece, packet, bottle, etc.
  current_stock NUMERIC(12,4) NOT NULL DEFAULT 0,
  minimum_stock NUMERIC(12,4) NOT NULL DEFAULT 0,
  opening_stock NUMERIC(12,4) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  sku TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_rest ON public.inventory_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON public.inventory_items(restaurant_id, is_active);

-- 3. Inventory Recipes (Menu Item Recipes)
CREATE TABLE IF NOT EXISTS public.inventory_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  preparation_steps TEXT,
  serving_size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_inventory_recipe_menu_item UNIQUE (restaurant_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_recipes_menu_item ON public.inventory_recipes(menu_item_id);

-- 4. Inventory Recipe Ingredients
CREATE TABLE IF NOT EXISTS public.inventory_recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.inventory_recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON public.inventory_recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_item ON public.inventory_recipe_ingredients(inventory_item_id);

-- 5. Inventory Transaction Ledger (Immutable)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL, -- Negative for consumption/waste, positive for addition/reversal
  unit TEXT NOT NULL,
  before_stock NUMERIC(12,4) NOT NULL,
  after_stock NUMERIC(12,4) NOT NULL,
  transaction_type TEXT NOT NULL, -- OPENING_STOCK, PURCHASE, MANUAL_ADJUSTMENT, ORDER_CONSUMPTION, CANCELLATION_REVERSAL, WASTE, SPOILAGE, STOCK_TRANSFER, RETURN
  reference_type TEXT, -- order_batch, purchase, waste, manual
  reference_id TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  batch_id UUID REFERENCES public.order_batches(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  user_id UUID,
  user_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_rest ON public.inventory_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_idempotency ON public.inventory_transactions(restaurant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_batch ON public.inventory_transactions(batch_id);

-- 6. Inventory Purchases
CREATE TABLE IF NOT EXISTS public.inventory_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  supplier_name TEXT,
  invoice_number TEXT,
  purchase_date TIMESTAMPTZ DEFAULT now(),
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.inventory_purchases(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL
);

-- 7. Inventory Waste / Spoilage
CREATE TABLE IF NOT EXISTS public.inventory_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  waste_reason TEXT NOT NULL, -- Spoiled, Expired, Damaged, Spilled, Other
  cost_impact NUMERIC(12,2) NOT NULL DEFAULT 0,
  recorded_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Inventory Low Stock Alerts
CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- LOW_STOCK, OUT_OF_STOCK
  current_stock NUMERIC(12,4) NOT NULL,
  minimum_stock NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  is_acknowledged BOOLEAN DEFAULT false,
  last_notified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_rest ON public.inventory_alerts(restaurant_id, is_acknowledged);
