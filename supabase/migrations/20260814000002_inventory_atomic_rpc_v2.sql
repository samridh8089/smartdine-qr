-- Migration: 20260814000002_inventory_atomic_rpc_v2.sql
-- Description: Updated Atomic PostgreSQL RPC functions for Inventory Stock Deduction and Cancellation Reversal handling foreign key validation safely

-- Add unique constraint for idempotency key
ALTER TABLE public.inventory_transactions 
DROP CONSTRAINT IF EXISTS uq_inventory_tx_idempotency;

ALTER TABLE public.inventory_transactions 
ADD CONSTRAINT uq_inventory_tx_idempotency UNIQUE (restaurant_id, idempotency_key);

-- 1. Atomic Batch Stock Deduction RPC
CREATE OR REPLACE FUNCTION public.deduct_inventory_batch_atomic(
  p_restaurant_id UUID,
  p_order_id UUID,
  p_batch_id UUID,
  p_idempotency_key TEXT,
  p_user_name TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx_exists BOOLEAN;
  v_valid_order_id UUID := NULL;
  v_valid_batch_id UUID := NULL;
  v_item JSONB;
  v_menu_item_id UUID;
  v_order_qty NUMERIC;
  v_item_name TEXT;
  v_recipe_rec RECORD;
  v_ing_rec RECORD;
  v_inv_item RECORD;
  v_deduct_qty NUMERIC;
  v_before_stock NUMERIC;
  v_after_stock NUMERIC;
  v_tx_count INT := 0;
BEGIN
  -- Idempotency Check
  SELECT EXISTS (
    SELECT 1 FROM public.inventory_transactions
    WHERE restaurant_id = p_restaurant_id AND idempotency_key = p_idempotency_key
  ) INTO v_tx_exists;

  IF v_tx_exists THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'transactions_created', 0);
  END IF;

  -- Validate Foreign Key References safely
  IF p_order_id IS NOT NULL THEN
    SELECT id INTO v_valid_order_id FROM public.orders WHERE id = p_order_id;
  END IF;
  IF p_batch_id IS NOT NULL THEN
    SELECT id INTO v_valid_batch_id FROM public.order_batches WHERE id = p_batch_id;
  END IF;

  -- Loop through ordered items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := (v_item->>'menuItemId')::UUID;
    v_order_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);
    v_item_name := COALESCE(v_item->>'menuItemName', 'Dish');

    -- Find recipe for this menu item
    SELECT * INTO v_recipe_rec FROM public.inventory_recipes
    WHERE restaurant_id = p_restaurant_id AND menu_item_id = v_menu_item_id;

    IF FOUND THEN
      -- Loop through recipe ingredients
      FOR v_ing_rec IN SELECT * FROM public.inventory_recipe_ingredients WHERE recipe_id = v_recipe_rec.id
      LOOP
        -- Fetch current inventory item
        SELECT * INTO v_inv_item FROM public.inventory_items
        WHERE id = v_ing_rec.inventory_item_id AND restaurant_id = p_restaurant_id FOR UPDATE;

        IF FOUND THEN
          v_deduct_qty := v_ing_rec.quantity * v_order_qty;
          
          -- Unit factor conversion if gram vs kg or ml vs litre
          IF LOWER(v_ing_rec.unit) = 'gram' AND LOWER(v_inv_item.unit) = 'kg' THEN
            v_deduct_qty := v_deduct_qty / 1000.0;
          ELSIF LOWER(v_ing_rec.unit) = 'kg' AND LOWER(v_inv_item.unit) = 'gram' THEN
            v_deduct_qty := v_deduct_qty * 1000.0;
          ELSIF LOWER(v_ing_rec.unit) = 'ml' AND LOWER(v_inv_item.unit) = 'litre' THEN
            v_deduct_qty := v_deduct_qty / 1000.0;
          ELSIF LOWER(v_ing_rec.unit) = 'litre' AND LOWER(v_inv_item.unit) = 'ml' THEN
            v_deduct_qty := v_deduct_qty * 1000.0;
          END IF;

          v_before_stock := v_inv_item.current_stock;
          v_after_stock := v_before_stock - v_deduct_qty;

          -- Update inventory item current_stock
          UPDATE public.inventory_items
          SET current_stock = v_after_stock, updated_at = now()
          WHERE id = v_inv_item.id AND restaurant_id = p_restaurant_id;

          -- Insert immutable ledger transaction
          INSERT INTO public.inventory_transactions (
            restaurant_id, inventory_item_id, quantity, unit,
            before_stock, after_stock, transaction_type, reference_type,
            reference_id, order_id, batch_id, idempotency_key, user_name, notes
          ) VALUES (
            p_restaurant_id, v_inv_item.id, -v_deduct_qty, v_inv_item.unit,
            v_before_stock, v_after_stock, 'ORDER_CONSUMPTION', 'order_batch',
            COALESCE(p_order_id::text, '') || ':' || COALESCE(p_batch_id::text, ''),
            v_valid_order_id, v_valid_batch_id,
            p_idempotency_key, COALESCE(p_user_name, 'Customer Order'),
            'Consumed for item: ' || v_item_name || ' x' || v_order_qty::text
          );

          v_tx_count := v_tx_count + 1;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'skipped', false, 'transactions_created', v_tx_count);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Atomic inventory deduction failed: %', SQLERRM;
END;
$$;

-- 2. Atomic Batch Cancellation Reversal RPC
CREATE OR REPLACE FUNCTION public.reverse_inventory_batch_atomic(
  p_restaurant_id UUID,
  p_order_id UUID,
  p_batch_id UUID,
  p_reversal_key TEXT,
  p_user_name TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reversal_exists BOOLEAN;
  v_valid_order_id UUID := NULL;
  v_valid_batch_id UUID := NULL;
  v_tx RECORD;
  v_inv_item RECORD;
  v_consumed_qty NUMERIC;
  v_before_stock NUMERIC;
  v_after_stock NUMERIC;
  v_reversed_count INT := 0;
BEGIN
  -- Idempotency Check for Reversal
  SELECT EXISTS (
    SELECT 1 FROM public.inventory_transactions
    WHERE restaurant_id = p_restaurant_id AND idempotency_key = p_reversal_key
  ) INTO v_reversal_exists;

  IF v_reversal_exists THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reversed_count', 0);
  END IF;

  -- Validate Foreign Key References safely
  IF p_order_id IS NOT NULL THEN
    SELECT id INTO v_valid_order_id FROM public.orders WHERE id = p_order_id;
  END IF;
  IF p_batch_id IS NOT NULL THEN
    SELECT id INTO v_valid_batch_id FROM public.order_batches WHERE id = p_batch_id;
  END IF;

  -- Fetch consumption transactions for this batch (by idempotency_key pattern or reference_id)
  FOR v_tx IN
    SELECT * FROM public.inventory_transactions
    WHERE restaurant_id = p_restaurant_id 
      AND transaction_type = 'ORDER_CONSUMPTION'
      AND (batch_id = p_batch_id OR reference_id = (COALESCE(p_order_id::text, '') || ':' || COALESCE(p_batch_id::text, '')))
  LOOP
    v_consumed_qty := ABS(v_tx.quantity);

    SELECT * INTO v_inv_item FROM public.inventory_items
    WHERE id = v_tx.inventory_item_id AND restaurant_id = p_restaurant_id FOR UPDATE;

    IF FOUND THEN
      v_before_stock := v_inv_item.current_stock;
      v_after_stock := v_before_stock + v_consumed_qty;

      -- Restore stock
      UPDATE public.inventory_items
      SET current_stock = v_after_stock, updated_at = now()
      WHERE id = v_inv_item.id AND restaurant_id = p_restaurant_id;

      -- Insert CANCELLATION_REVERSAL transaction
      INSERT INTO public.inventory_transactions (
        restaurant_id, inventory_item_id, quantity, unit,
        before_stock, after_stock, transaction_type, reference_type,
        reference_id, order_id, batch_id, idempotency_key, user_name, notes
      ) VALUES (
        p_restaurant_id, v_inv_item.id, v_consumed_qty, v_inv_item.unit,
        v_before_stock, v_after_stock, 'CANCELLATION_REVERSAL', 'order_batch',
        COALESCE(p_order_id::text, '') || ':' || COALESCE(p_batch_id::text, ''),
        v_valid_order_id, v_valid_batch_id,
        p_reversal_key, COALESCE(p_user_name, 'Staff Cancellation'),
        'Restored inventory for cancelled batch (' || COALESCE(p_reason, 'Cancelled') || ')'
      );

      v_reversed_count := v_reversed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'skipped', false, 'reversed_count', v_reversed_count);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Atomic inventory reversal failed: %', SQLERRM;
END;
$$;
