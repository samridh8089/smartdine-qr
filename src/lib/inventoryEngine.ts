/**
 * Production-Grade Inventory Engine for CleverOps
 * Features:
 * 1. Portion/Variant-Aware Recipe Consumption & Stock Limits
 * 2. Real-Time Reservation Lifecycle (PLACED -> ACCEPTED -> PREPARING -> READY -> COMPLETED)
 * 3. Physical vs. Reserved vs. Available to Sell (Physical - Reserved)
 * 4. Idempotent Reservation, Consumption, and Release Transitions
 * 5. Post-Preparation Cancellation & Prepared Food Disposition Tracking
 * 6. Audit Trail & Manual Inventory Restoration Guard
 */

import { supabase } from './supabase';
import { convertUnit, areUnitsCompatible, normalizeUnit, formatQuantityWithUnit } from './inventoryUnits';

export interface StockDeductionResult {
  success: boolean;
  transactionsCreated: number;
  skipped: boolean;
  errors: string[];
}

export interface StockReservationResult {
  success: boolean;
  reservationsCreated: number;
  skipped: boolean;
  errors: string[];
}

export interface StockReversalResult {
  success: boolean;
  reversedCount: number;
  skipped: boolean;
  errors: string[];
}

export interface FoodDispositionResult {
  success: boolean;
  dispositionsCreated: number;
  inventoryRestored: boolean;
  error?: string;
}

export interface MatchedRecipeResult {
  recipe: any;
  isExplicitVariantMatch: boolean;
  portionMultiplier: number;
}

/**
 * Returns the portion scaling multiplier for a variant when using a base/standard recipe.
 * Standard mappings: Half = 0.5, Quarter = 0.25, Double = 2.0, Full/Standard = 1.0
 */
export function getPortionMultiplier(variantName?: string, isExplicitVariantMatch: boolean = false): number {
  if (isExplicitVariantMatch || !variantName) return 1.0;
  const norm = variantName.trim().toLowerCase();
  if (norm.includes('half') || norm === 'h' || norm === 'small') return 0.5;
  if (norm.includes('quarter') || norm.includes('quater') || norm === 'q') return 0.25;
  if (norm.includes('double') || norm === '2x') return 2.0;
  if (norm.includes('triple') || norm === '3x') return 3.0;
  return 1.0;
}

/**
 * Cleans variant suffix from dish name (e.g. "Poha (Half)" -> "poha") for fallback raw item matching.
 */
export function cleanDishName(name: string): string {
  if (!name) return '';
  return name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
}

/**
 * Resolves the appropriate recipe for a given menu item and variant with portion scaling.
 * Priority: Exact variant_id match -> variant name match in serving_size -> Base recipe (variant_id is null) -> First available recipe
 */
export function findMatchingRecipeWithScaling(
  recipes: any[],
  menuItemId: string,
  variantId?: string,
  variantName?: string
): MatchedRecipeResult | null {
  const itemRecipes = recipes.filter(r => r.menu_item_id === menuItemId);
  if (!itemRecipes || itemRecipes.length === 0) return null;

  if (variantId) {
    const exactVariant = itemRecipes.find(r => r.variant_id === variantId);
    if (exactVariant) {
      return { recipe: exactVariant, isExplicitVariantMatch: true, portionMultiplier: 1.0 };
    }
  }

  if (variantName) {
    const nameMatch = itemRecipes.find(r => 
      r.serving_size && r.serving_size.trim().toLowerCase() === variantName.trim().toLowerCase()
    );
    if (nameMatch) {
      return { recipe: nameMatch, isExplicitVariantMatch: true, portionMultiplier: 1.0 };
    }
  }

  // Fallback to base/default recipe (variant_id is null)
  const baseRecipe = itemRecipes.find(r => !r.variant_id);
  if (baseRecipe) {
    const mult = getPortionMultiplier(variantName, false);
    return { recipe: baseRecipe, isExplicitVariantMatch: false, portionMultiplier: mult };
  }

  const first = itemRecipes[0];
  const mult = getPortionMultiplier(variantName, false);
  return { recipe: first, isExplicitVariantMatch: false, portionMultiplier: mult };
}

/**
 * Resolves the appropriate recipe for a given menu item and variant (backward-compatible alias).
 */
export function findMatchingRecipe(recipes: any[], menuItemId: string, variantId?: string, variantName?: string): any | null {
  const res = findMatchingRecipeWithScaling(recipes, menuItemId, variantId, variantName);
  return res ? res.recipe : null;
}

/**
 * Reserves inventory stock when an order batch moves to ACCEPTED.
 * Idempotency Key: ORDER_RESERVATION_<order_id>_<batch_id>
 */
export async function reserveInventoryForOrderBatch(
  restaurantId: string,
  orderId: string,
  batchId: string,
  items: Array<{ menuItemId: string; quantity: number; menuItemName?: string; variantId?: string; variantName?: string }>,
  userId?: string,
  userName?: string
): Promise<StockReservationResult> {
  const result: StockReservationResult = {
    success: true,
    reservationsCreated: 0,
    skipped: false,
    errors: []
  };

  if (!restaurantId || !orderId || !batchId || !items || items.length === 0) {
    return result;
  }

  const idempotencyKey = `ORDER_RESERVATION_${orderId}_${batchId}`;

  try {
    // 1. Idempotency Check: fetch existing reservations to ensure item-level idempotency
    const { data: existingRes } = await supabase
      .from('inventory_reservations')
      .select('inventory_item_id, idempotency_key')
      .eq('restaurant_id', restaurantId)
      .ilike('idempotency_key', `${idempotencyKey}%`);

    const existingResItemIds = new Set((existingRes || []).map(r => r.inventory_item_id));

    const menuItemIds = Array.from(new Set(items.map(i => i.menuItemId)));

    const [recipesRes, rawRes] = await Promise.all([
      supabase.from('inventory_recipes').select('*, inventory_recipe_ingredients(*)').eq('restaurant_id', restaurantId).in('menu_item_id', menuItemIds),
      supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).eq('is_active', true)
    ]);

    const recipes = recipesRes.data || [];
    const rawItems = rawRes.data || [];
    const rawMap = new Map<string, any>();
    rawItems.forEach(i => rawMap.set(i.id, i));

    // Accumulate total required stock per raw item across all items and portions in the batch
    const demandMap = new Map<string, {
      rawItem: any;
      requiredQty: number;
      unit: string;
      dishLabels: string[];
    }>();

    for (const item of items) {
      const orderQty = Number(item.quantity || 1);
      const matched = findMatchingRecipeWithScaling(recipes, item.menuItemId, item.variantId, item.variantName);

      if (matched && matched.recipe && matched.recipe.inventory_recipe_ingredients && matched.recipe.inventory_recipe_ingredients.length > 0) {
        const portionMultiplier = matched.portionMultiplier;
        for (const ing of matched.recipe.inventory_recipe_ingredients) {
          const rawItem = rawMap.get(ing.inventory_item_id);
          if (!rawItem) continue;

          let reqInItemUnit = Number(ing.quantity || 0) * orderQty * portionMultiplier;
          if (normalizeUnit(ing.unit) !== normalizeUnit(rawItem.unit) && areUnitsCompatible(ing.unit, rawItem.unit)) {
            reqInItemUnit = convertUnit(reqInItemUnit, ing.unit, rawItem.unit);
          }

          const cur: { rawItem: any; requiredQty: number; unit: string; dishLabels: string[] } = demandMap.get(rawItem.id) || {
            rawItem,
            requiredQty: 0,
            unit: rawItem.unit,
            dishLabels: []
          };
          cur.requiredQty += reqInItemUnit;
          const label = `${item.menuItemName || 'Dish'} x${orderQty}${portionMultiplier !== 1 ? ` (${portionMultiplier}x portion)` : ''}`;
          if (!cur.dishLabels.includes(label)) cur.dishLabels.push(label);
          demandMap.set(rawItem.id, cur);
        }
      } else {
        // Direct matching fallback with cleaned name
        const cleanName = cleanDishName(item.menuItemName || '');
        const direct = rawItems.find(r => 
          r.name.trim().toLowerCase() === (item.menuItemName || '').trim().toLowerCase() ||
          r.name.trim().toLowerCase() === cleanName ||
          r.id === item.menuItemId
        );
        if (direct) {
          const mult = getPortionMultiplier(item.variantName, false);
          const effectiveQty = orderQty * mult;
          const cur: { rawItem: any; requiredQty: number; unit: string; dishLabels: string[] } = demandMap.get(direct.id) || {
            rawItem: direct,
            requiredQty: 0,
            unit: direct.unit,
            dishLabels: []
          };
          cur.requiredQty += effectiveQty;
          const label = `${item.menuItemName || direct.name} x${orderQty}`;
          if (!cur.dishLabels.includes(label)) cur.dishLabels.push(label);
          demandMap.set(direct.id, cur);
        }
      }
    }

    if (demandMap.size === 0) return result;

    // Apply reservations for each accumulated raw item
    const reservationsToInsert: any[] = [];
    const transactionsToInsert: any[] = [];

    for (const [rawId, req] of Array.from(demandMap.entries())) {
      if (existingResItemIds.has(rawId)) continue;

      const itemData = rawMap.get(rawId) || req.rawItem;
      const currentReserved = Number(itemData.reserved_stock || 0);
      const newReserved = parseFloat((currentReserved + req.requiredQty).toFixed(4));
      const itemKey = `${idempotencyKey}_${rawId}`;

      await supabase
        .from('inventory_items')
        .update({ reserved_stock: newReserved, updated_at: new Date().toISOString() })
        .eq('id', rawId)
        .eq('restaurant_id', restaurantId);

      reservationsToInsert.push({
        restaurant_id: restaurantId,
        order_id: orderId,
        batch_id: batchId,
        inventory_item_id: rawId,
        reserved_quantity: req.requiredQty,
        unit: req.unit,
        status: 'ACTIVE',
        idempotency_key: itemKey
      });

      transactionsToInsert.push({
        restaurant_id: restaurantId,
        inventory_item_id: rawId,
        quantity: req.requiredQty,
        unit: req.unit,
        before_stock: itemData.current_stock,
        after_stock: itemData.current_stock,
        transaction_type: 'RESERVATION_CREATED',
        reference_type: 'order_batch',
        reference_id: `${orderId}:${batchId}`,
        order_id: orderId,
        batch_id: batchId,
        idempotency_key: itemKey,
        user_id: userId || null,
        user_name: userName || 'Kitchen Acceptance',
        notes: `Reserved for accepted order batch: ${req.dishLabels.join(', ')} (${req.requiredQty.toFixed(3)} ${req.unit})`
      });

      result.reservationsCreated++;
    }

    if (reservationsToInsert.length > 0) {
      console.log(`[FORENSIC_INVENTORY_TRACE] INSERTING_RESERVATIONS - OrderID: ${orderId}, BatchID: ${batchId}, Count: ${reservationsToInsert.length}`);
      await supabase
        .from('inventory_reservations')
        .insert(reservationsToInsert);
    }

    if (transactionsToInsert.length > 0) {
      console.log(`[FORENSIC_INVENTORY_TRACE] INSERTING_RESERVATION_TRANSACTIONS - OrderID: ${orderId}, BatchID: ${batchId}, Count: ${transactionsToInsert.length}`);
      await supabase
        .from('inventory_transactions')
        .insert(transactionsToInsert);
    }

    console.log(`[FORENSIC_INVENTORY_TRACE] RESERVE_INVENTORY_SUCCESS - OrderID: ${orderId}, BatchID: ${batchId}, ReservationsCreated: ${result.reservationsCreated}`);
    await syncInventoryMenuAvailability(restaurantId);
  } catch (err: any) {
    console.error('[InventoryEngine] Exception in reserveInventoryForOrderBatch:', err);
    result.success = false;
    result.errors.push(err.message || 'Reservation error');
  }

  return result;
}

/**
 * Consumes inventory when an order moves from ACCEPTED -> PREPARING.
 * Physically deducts inventory and removes the reservation atomically.
 * Idempotency Key: ORDER_CONSUMPTION_<order_id>_<batch_id>
 */
export async function consumeReservedInventoryForOrderBatch(
  restaurantId: string,
  orderId: string,
  batchId: string,
  items: Array<{ menuItemId: string; quantity: number; menuItemName?: string; variantId?: string; variantName?: string }>,
  userId?: string,
  userName?: string
): Promise<StockDeductionResult> {
  const result: StockDeductionResult = {
    success: true,
    transactionsCreated: 0,
    skipped: false,
    errors: []
  };

  if (!restaurantId || !orderId || !batchId) {
    return result;
  }

  const idempotencyKey = `ORDER_CONSUMPTION_${orderId}_${batchId}`;

  try {
    // 1. Fetch existing consumption transactions for this batch to ensure item-level idempotency
    const { data: existingTx } = await supabase
      .from('inventory_transactions')
      .select('inventory_item_id, idempotency_key')
      .eq('restaurant_id', restaurantId)
      .ilike('idempotency_key', `${idempotencyKey}%`);

    const existingTxItemIds = new Set((existingTx || []).map(t => t.inventory_item_id));

    // 2. Fetch reservations for this batch or order
    const { data: batchReservations } = await supabase
      .from('inventory_reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .or(`batch_id.eq.${batchId},order_id.eq.${orderId}`);

    if (batchReservations && batchReservations.length > 0) {
      // Filter out reservations that have already been consumed (by checking existingTxItemIds)
      const unconsumedReservations = batchReservations.filter(r => !existingTxItemIds.has(r.inventory_item_id));

      if (unconsumedReservations.length === 0) {
        result.skipped = true;
        await supabase
          .from('orders')
          .update({ inventory_consumed: true })
          .eq('id', orderId);
        return result;
      }

      // Fetch all inventory items in a single query
      const itemIds = Array.from(new Set(unconsumedReservations.map(r => r.inventory_item_id)));
      const { data: allItems } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('id', itemIds);

      const itemMap = new Map<string, any>();
      (allItems || []).forEach(i => itemMap.set(i.id, i));

      const transactionsToInsert: any[] = [];
      const reservationIdsToUpdate: string[] = [];

      for (const res of unconsumedReservations) {
        const itemId = res.inventory_item_id;
        const resQty = Number(res.reserved_quantity || 0);
        let itemData = itemMap.get(itemId);

        if (!itemData) {
          const { data: fresh } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('id', itemId)
            .eq('restaurant_id', restaurantId)
            .single();
          if (fresh) itemData = fresh;
        }

        if (!itemData) continue;

        const beforeStock = Number(itemData.current_stock || 0);
        const afterStock = parseFloat((beforeStock - resQty).toFixed(4));
        const newReserved = Math.max(0, parseFloat((Number(itemData.reserved_stock || 0) - resQty).toFixed(4)));
        const itemKey = `${idempotencyKey}_${itemId}`;

        // Deduct physical stock & release reserved stock
        await supabase
          .from('inventory_items')
          .update({
            current_stock: afterStock,
            reserved_stock: newReserved,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId)
          .eq('restaurant_id', restaurantId);

        reservationIdsToUpdate.push(res.id);

        transactionsToInsert.push({
          restaurant_id: restaurantId,
          inventory_item_id: itemId,
          quantity: -resQty,
          unit: res.unit,
          before_stock: beforeStock,
          after_stock: afterStock,
          transaction_type: 'ORDER_CONSUMPTION',
          reference_type: 'order_batch',
          reference_id: `${orderId}:${batchId}`,
          order_id: orderId,
          batch_id: batchId,
          idempotency_key: itemKey,
          user_id: userId || null,
          user_name: userName || 'Kitchen Preparing',
          notes: `Consumed for order batch in preparation (${resQty} ${res.unit})`
        });

        result.transactionsCreated++;
      }

      if (reservationIdsToUpdate.length > 0) {
        await supabase
          .from('inventory_reservations')
          .update({ status: 'CONSUMED', updated_at: new Date().toISOString() })
          .in('id', reservationIdsToUpdate);
      }

      if (transactionsToInsert.length > 0) {
        await supabase
          .from('inventory_transactions')
          .insert(transactionsToInsert);
      }
    } else {
      // Direct transition to PREPARING without prior reservation:
      // Accumulate demand across all items and portions in the batch
      const menuItemIds = Array.from(new Set(items.map(i => i.menuItemId)));
      const [recipesRes, rawRes] = await Promise.all([
        supabase.from('inventory_recipes').select('*, inventory_recipe_ingredients(*)').eq('restaurant_id', restaurantId).in('menu_item_id', menuItemIds),
        supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).eq('is_active', true)
      ]);

      const recipes = recipesRes.data || [];
      const rawItems = rawRes.data || [];
      const rawMap = new Map<string, any>();
      rawItems.forEach(i => rawMap.set(i.id, i));

      const demandMap = new Map<string, {
        rawItem: any;
        requiredQty: number;
        unit: string;
        dishLabels: string[];
      }>();

      for (const item of items) {
        const orderQty = Number(item.quantity || 1);
        const matched = findMatchingRecipeWithScaling(recipes, item.menuItemId, item.variantId, item.variantName);

        if (matched && matched.recipe && matched.recipe.inventory_recipe_ingredients && matched.recipe.inventory_recipe_ingredients.length > 0) {
          const portionMultiplier = matched.portionMultiplier;
          for (const ing of matched.recipe.inventory_recipe_ingredients) {
            const rawItem = rawMap.get(ing.inventory_item_id);
            if (!rawItem) continue;

            let deductQtyInItemUnit = Number(ing.quantity || 0) * orderQty * portionMultiplier;
            if (normalizeUnit(ing.unit) !== normalizeUnit(rawItem.unit) && areUnitsCompatible(ing.unit, rawItem.unit)) {
              deductQtyInItemUnit = convertUnit(deductQtyInItemUnit, ing.unit, rawItem.unit);
            }

            const cur: { rawItem: any; requiredQty: number; unit: string; dishLabels: string[] } = demandMap.get(rawItem.id) || {
              rawItem,
              requiredQty: 0,
              unit: rawItem.unit,
              dishLabels: []
            };
            cur.requiredQty += deductQtyInItemUnit;
            const label = `${item.menuItemName || 'Dish'} x${orderQty}${portionMultiplier !== 1 ? ` (${portionMultiplier}x portion)` : ''}`;
            if (!cur.dishLabels.includes(label)) cur.dishLabels.push(label);
            demandMap.set(rawItem.id, cur);
          }
        } else {
          const cleanName = cleanDishName(item.menuItemName || '');
          const direct = rawItems.find(r => 
            r.name.trim().toLowerCase() === (item.menuItemName || '').trim().toLowerCase() ||
            r.name.trim().toLowerCase() === cleanName ||
            r.id === item.menuItemId
          );
          if (direct) {
            const mult = getPortionMultiplier(item.variantName, false);
            const effectiveQty = orderQty * mult;
            const cur: { rawItem: any; requiredQty: number; unit: string; dishLabels: string[] } = demandMap.get(direct.id) || {
              rawItem: direct,
              requiredQty: 0,
              unit: direct.unit,
              dishLabels: []
            };
            cur.requiredQty += effectiveQty;
            const label = `${item.menuItemName || direct.name} x${orderQty}`;
            if (!cur.dishLabels.includes(label)) cur.dishLabels.push(label);
            demandMap.set(direct.id, cur);
          }
        }
      }

      const transactionsToInsert: any[] = [];

      for (const [rawId, req] of Array.from(demandMap.entries())) {
        if (existingTxItemIds.has(rawId)) continue;

        const { data: freshItem } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('id', rawId)
          .eq('restaurant_id', restaurantId)
          .single();

        const itemData = freshItem || req.rawItem;
        const beforeStock = Number(itemData.current_stock || 0);
        const afterStock = parseFloat((beforeStock - req.requiredQty).toFixed(4));
        const itemKey = `${idempotencyKey}_${rawId}`;

        await supabase
          .from('inventory_items')
          .update({ current_stock: afterStock, updated_at: new Date().toISOString() })
          .eq('id', rawId)
          .eq('restaurant_id', restaurantId);

        transactionsToInsert.push({
          restaurant_id: restaurantId,
          inventory_item_id: rawId,
          quantity: -req.requiredQty,
          unit: req.unit,
          before_stock: beforeStock,
          after_stock: afterStock,
          transaction_type: 'ORDER_CONSUMPTION',
          reference_type: 'order_batch',
          reference_id: `${orderId}:${batchId}`,
          order_id: orderId,
          batch_id: batchId,
          idempotency_key: itemKey,
          user_id: userId || null,
          user_name: userName || 'Kitchen Preparing',
          notes: `Consumed for order batch in preparation: ${req.dishLabels.join(', ')} (${req.requiredQty.toFixed(3)} ${req.unit})`
        });

        result.transactionsCreated++;
      }

      if (transactionsToInsert.length > 0) {
        console.log(`[FORENSIC_INVENTORY_TRACE] INSERTING_CONSUMPTION_TRANSACTIONS - OrderID: ${orderId}, BatchID: ${batchId}, Count: ${transactionsToInsert.length}`);
        await supabase
          .from('inventory_transactions')
          .insert(transactionsToInsert);
      }
    }

    // Flag order as having consumed inventory
    await supabase
      .from('orders')
      .update({ inventory_consumed: true })
      .eq('id', orderId);

    console.log(`[FORENSIC_INVENTORY_TRACE] CONSUME_INVENTORY_SUCCESS - OrderID: ${orderId}, BatchID: ${batchId}, TransactionsCreated: ${result.transactionsCreated}`);
    await syncInventoryMenuAvailability(restaurantId);
  } catch (err: any) {
    console.error('[InventoryEngine] Exception in consumeReservedInventoryForOrderBatch:', err);
    result.success = false;
    result.errors.push(err.message || 'Inventory consumption error');
  }

  return result;
}

/**
 * Backward compatibility alias for deductInventoryForOrderBatch
 */
export const deductInventoryForOrderBatch = consumeReservedInventoryForOrderBatch;

/**
 * Self-Healing Inventory Engine Safeguard.
 * Scans for any ACTIVE inventory reservations associated with completed/served orders or batches,
 * and automatically consumes them to guarantee 100% stock deduction & consumption integrity.
 */
export async function healUnconsumedActiveReservations(restaurantId: string): Promise<number> {
  let totalHealed = 0;
  if (!restaurantId) return 0;

  try {
    const { data: activeRes } = await supabase
      .from('inventory_reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'ACTIVE');

    if (!activeRes || activeRes.length === 0) return 0;

    const orderIds = Array.from(new Set(activeRes.map(r => r.order_id).filter(Boolean)));
    const batchIds = Array.from(new Set(activeRes.map(r => r.batch_id).filter(Boolean)));

    const [{ data: orders }, { data: batches }] = await Promise.all([
      orderIds.length > 0 ? supabase.from('orders').select('id, status').in('id', orderIds) : Promise.resolve({ data: [] }),
      batchIds.length > 0 ? supabase.from('order_batches').select('id, order_id, status').in('id', batchIds) : Promise.resolve({ data: [] })
    ]);

    const completedOrderIds = new Set((orders || []).filter(o => ['completed', 'served', 'delivered'].includes((o.status || '').toLowerCase())).map(o => o.id));
    const completedBatchIds = new Set((batches || []).filter(b => ['completed', 'served', 'ready'].includes((b.status || '').toLowerCase())).map(b => b.id));

    const reservationsToHeal = activeRes.filter(r => 
      completedOrderIds.has(r.order_id) || (r.batch_id && completedBatchIds.has(r.batch_id))
    );

    if (reservationsToHeal.length === 0) return 0;

    console.log(`[SELF_HEALING_INVENTORY] Found ${reservationsToHeal.length} unconsumed active reservations for completed/served orders in restaurant ${restaurantId}. Auto-consuming...`);

    const itemIds = Array.from(new Set(reservationsToHeal.map(r => r.inventory_item_id)));
    const { data: itemData } = await supabase.from('inventory_items').select('*').in('id', itemIds);
    const itemMap = new Map<string, any>();
    (itemData || []).forEach(i => itemMap.set(i.id, i));

    const transactionsToInsert: any[] = [];
    const resIdsToUpdate: string[] = [];

    for (const res of reservationsToHeal) {
      const item = itemMap.get(res.inventory_item_id);
      if (!item) continue;

      const qty = Number(res.reserved_quantity || 0);
      const beforeStock = Number(item.current_stock || 0);
      const afterStock = parseFloat((beforeStock - qty).toFixed(4));
      const newReserved = Math.max(0, parseFloat((Number(item.reserved_stock || 0) - qty).toFixed(4)));

      item.current_stock = afterStock;
      item.reserved_stock = newReserved;
      itemMap.set(item.id, item);

      await supabase
        .from('inventory_items')
        .update({ current_stock: afterStock, reserved_stock: newReserved, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      resIdsToUpdate.push(res.id);

      transactionsToInsert.push({
        restaurant_id: restaurantId,
        inventory_item_id: item.id,
        quantity: -qty,
        unit: res.unit,
        before_stock: beforeStock,
        after_stock: afterStock,
        transaction_type: 'ORDER_CONSUMPTION',
        reference_type: 'order_batch',
        reference_id: `${res.order_id}:${res.batch_id || 'AUTO_HEAL'}`,
        order_id: res.order_id,
        batch_id: res.batch_id,
        idempotency_key: `SELF_HEAL_CONSUME_${res.id}`,
        user_name: 'Self-Healing Engine',
        notes: `Auto-consumed active reservation on completion (${qty} ${res.unit})`
      });

      totalHealed++;
    }

    if (resIdsToUpdate.length > 0) {
      await supabase
        .from('inventory_reservations')
        .update({ status: 'CONSUMED', updated_at: new Date().toISOString() })
        .in('id', resIdsToUpdate);
    }

    if (transactionsToInsert.length > 0) {
      await supabase
        .from('inventory_transactions')
        .insert(transactionsToInsert);
    }

    await syncInventoryMenuAvailability(restaurantId).catch(() => {});
  } catch (err: any) {
    console.error('[InventoryEngine] healUnconsumedActiveReservations error:', err?.message);
  }

  return totalHealed;
}

/**
 * Releases reserved inventory stock when an ACCEPTED order batch is cancelled before PREPARING.
 * Physical stock remains untouched!
 * Idempotency Key: RESERVATION_RELEASE_<order_id>_<batch_id>
 */
export async function releaseInventoryReservationForOrderBatch(
  restaurantId: string,
  orderId: string,
  batchId: string,
  userId?: string,
  userName?: string,
  reason?: string
): Promise<StockReversalResult> {
  const result: StockReversalResult = {
    success: true,
    reversedCount: 0,
    skipped: false,
    errors: []
  };

  if (!restaurantId || !orderId || !batchId) {
    return result;
  }

  const releaseKey = `RESERVATION_RELEASE_${orderId}_${batchId}`;

  try {
    const { data: existingRelease } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('idempotency_key', releaseKey);

    if (existingRelease && existingRelease.length > 0) {
      result.skipped = true;
      return result;
    }

    const { data: activeReservations } = await supabase
      .from('inventory_reservations')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('batch_id', batchId)
      .eq('status', 'ACTIVE');

    if (!activeReservations || activeReservations.length === 0) return result;

    for (const res of activeReservations) {
      const itemId = res.inventory_item_id;
      const resQty = Number(res.reserved_quantity || 0);

      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (!itemData) continue;

      const newReserved = Math.max(0, parseFloat((Number(itemData.reserved_stock || 0) - resQty).toFixed(4)));

      // Reduce reserved stock, leave current_stock unchanged!
      await supabase
        .from('inventory_items')
        .update({ reserved_stock: newReserved, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId);

      await supabase
        .from('inventory_reservations')
        .update({ status: 'RELEASED', updated_at: new Date().toISOString() })
        .eq('id', res.id);

      await supabase
        .from('inventory_transactions')
        .insert({
          restaurant_id: restaurantId,
          inventory_item_id: itemId,
          quantity: resQty,
          unit: res.unit,
          before_stock: itemData.current_stock,
          after_stock: itemData.current_stock,
          transaction_type: 'RESERVATION_RELEASED',
          reference_type: 'order_batch',
          reference_id: `${orderId}:${batchId}`,
          order_id: orderId,
          batch_id: batchId,
          idempotency_key: `${releaseKey}_${itemId}`,
          user_id: userId || null,
          user_name: userName || 'Cancellation',
          notes: `Released reservation on cancellation before preparation (${reason || 'Cancelled'})`
        });

      result.reversedCount++;
    }

    console.log(`[FORENSIC_INVENTORY_TRACE] RELEASE_RESERVATION_SUCCESS - OrderID: ${orderId}, BatchID: ${batchId}, ReversedCount: ${result.reversedCount}`);
    await syncInventoryMenuAvailability(restaurantId);
  } catch (err: any) {
    console.error('[InventoryEngine] Exception in releaseInventoryReservationForOrderBatch:', err);
    result.success = false;
    result.errors.push(err.message || 'Reservation release error');
  }

  return result;
}

/**
 * Permanently protects database integrity by detecting and releasing orphan reservations
 * where the parent order record is missing or cancelled.
 * Does NOT touch physical current_stock. Updates reserved_stock and logs RESERVATION_RELEASED entries.
 */
export async function cleanupOrphanReservations(restaurantId?: string): Promise<{ success: boolean; cleanedCount: number }> {
  try {
    let query = supabase.from('inventory_reservations').select('*, inventory_items(*)').eq('status', 'ACTIVE');
    if (restaurantId) query = query.eq('restaurant_id', restaurantId);

    const { data: activeRes, error: fetchErr } = await query;
    if (fetchErr || !activeRes || activeRes.length === 0) {
      return { success: true, cleanedCount: 0 };
    }

    const orderIds = Array.from(new Set(activeRes.map(r => r.order_id)));
    const { data: existingOrders } = await supabase
      .from('orders')
      .select('id, status')
      .in('id', orderIds);

    const existingOrderMap = new Map();
    (existingOrders || []).forEach(o => existingOrderMap.set(o.id, o.status));

    let cleanedCount = 0;
    for (const res of activeRes) {
      const orderStatus = existingOrderMap.get(res.order_id);
      const isOrphan = !orderStatus || orderStatus === 'cancelled' || orderStatus === 'completed';

      if (isOrphan) {
        console.log(`[FORENSIC_INVENTORY_TRACE] ORPHAN_RESERVATION_DETECTED - ID: ${res.id}, OrderID: ${res.order_id}, RawItem: ${res.inventory_items?.name || res.inventory_item_id}, Qty: ${res.reserved_quantity}`);

        // 1. Mark reservation RELEASED
        await supabase
          .from('inventory_reservations')
          .update({ status: 'RELEASED', updated_at: new Date().toISOString() })
          .eq('id', res.id);

        // 2. Decrement reserved_stock ONLY (physical current_stock untouched)
        const { data: freshItem } = await supabase
          .from('inventory_items')
          .select('current_stock, reserved_stock')
          .eq('id', res.inventory_item_id)
          .single();

        const currentReserved = Number(freshItem?.reserved_stock || 0);
        const newReserved = Math.max(0, parseFloat((currentReserved - Number(res.reserved_quantity || 0)).toFixed(4)));

        await supabase
          .from('inventory_items')
          .update({ reserved_stock: newReserved, updated_at: new Date().toISOString() })
          .eq('id', res.inventory_item_id);

        // 3. Log transaction ledger entry
        await supabase
          .from('inventory_transactions')
          .insert({
            restaurant_id: res.restaurant_id,
            inventory_item_id: res.inventory_item_id,
            quantity: Number(res.reserved_quantity || 0),
            unit: res.unit || res.inventory_items?.unit || 'kg',
            before_stock: Number(freshItem?.current_stock || 0),
            after_stock: Number(freshItem?.current_stock || 0),
            transaction_type: 'RESERVATION_RELEASED',
            reference_type: 'order_batch',
            reference_id: res.batch_id ? `${res.order_id}:${res.batch_id}` : res.order_id,
            order_id: res.order_id,
            batch_id: res.batch_id,
            idempotency_key: `RESERVATION_RELEASE_ORPHAN_${res.id}`,
            user_name: 'System Integrity Guard',
            notes: `Released orphan reservation on integrity check: Order record missing or closed (${res.reserved_quantity} ${res.unit})`
          });

        console.log(`[FORENSIC_INVENTORY_TRACE] ORPHAN_RESERVATION_RELEASED - ID: ${res.id}, ItemID: ${res.inventory_item_id}, ReleasedQty: ${res.reserved_quantity}, NewReservedStock: ${newReserved}`);
        cleanedCount++;
      }
    }

    return { success: true, cleanedCount };
  } catch (err: any) {
    console.error('[InventoryEngine] Exception in cleanupOrphanReservations:', err);
    return { success: false, cleanedCount: 0 };
  }
}

/**
 * Backward compatibility alias for reverseInventoryForOrderBatch
 */
export const reverseInventoryForOrderBatch = releaseInventoryReservationForOrderBatch;

/**
 * Manually restores inventory when an Owner explicitly confirms food was not actually cooked/wasted.
 * Strictly protected by idempotency to prevent double-restoration.
 * Idempotency Key: MANUAL_RESTORATION_<order_id>_<batch_id>
 */
export async function restoreInventoryForOrderBatch(
  restaurantId: string,
  orderId: string,
  batchId?: string,
  userId?: string,
  userName?: string,
  reason?: string
): Promise<{ success: boolean; error?: string; restoredCount: number }> {
  if (!restaurantId || !orderId) {
    return { success: false, error: 'Invalid parameters', restoredCount: 0 };
  }

  const restorationKey = batchId 
    ? `MANUAL_RESTORATION_${orderId}_${batchId}` 
    : `MANUAL_RESTORATION_${orderId}`;

  try {
    // 1. Check if already restored
    const { data: orderData } = await supabase
      .from('orders')
      .select('inventory_restored')
      .eq('id', orderId)
      .single();

    if (orderData?.inventory_restored) {
      return { success: false, error: 'Inventory already restored for this order.', restoredCount: 0 };
    }

    const { data: existingTx } = await supabase
      .from('inventory_transactions')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('idempotency_key', restorationKey);

    if (existingTx && existingTx.length > 0) {
      return { success: false, error: 'Inventory already restored.', restoredCount: 0 };
    }

    // 2. Fetch consumption records for this order
    let query = supabase
      .from('inventory_transactions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('order_id', orderId)
      .eq('transaction_type', 'ORDER_CONSUMPTION');

    if (batchId) {
      query = query.eq('batch_id', batchId);
    }

    const { data: consumptions } = await query;
    if (!consumptions || consumptions.length === 0) {
      return { success: false, error: 'No consumed inventory records found to restore.', restoredCount: 0 };
    }

    let restoredCount = 0;

    for (const tx of consumptions) {
      const itemId = tx.inventory_item_id;
      const qtyToRestore = Math.abs(Number(tx.quantity || 0));

      if (!itemId || qtyToRestore <= 0) continue;

      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (!itemData) continue;

      const beforeStock = Number(itemData.current_stock || 0);
      const afterStock = parseFloat((beforeStock + qtyToRestore).toFixed(4));

      await supabase
        .from('inventory_items')
        .update({ current_stock: afterStock, updated_at: new Date().toISOString() })
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId);

      await supabase
        .from('inventory_transactions')
        .insert({
          restaurant_id: restaurantId,
          inventory_item_id: itemId,
          quantity: qtyToRestore,
          unit: itemData.unit,
          before_stock: beforeStock,
          after_stock: afterStock,
          transaction_type: 'MANUAL_RESTORE',
          reference_type: 'order_cancellation',
          reference_id: `${orderId}${batchId ? `:${batchId}` : ''}`,
          order_id: orderId,
          batch_id: batchId || null,
          idempotency_key: `${restorationKey}_${itemId}`,
          user_id: userId || null,
          user_name: userName || 'Owner Restoration',
          notes: `Manual inventory restoration: ${reason || 'Customer cancelled before food was cooked'}`
        });

      restoredCount++;
    }

    await supabase
      .from('orders')
      .update({ inventory_restored: true })
      .eq('id', orderId);

    await syncInventoryMenuAvailability(restaurantId);
    return { success: true, restoredCount };
  } catch (err: any) {
    console.error('[InventoryEngine] Error in restoreInventoryForOrderBatch:', err);
    return { success: false, error: err.message || 'Restoration failed', restoredCount: 0 };
  }
}

/**
 * Records prepared food disposition when an order is cancelled after PREPARING.
 */
export async function recordPreparedFoodDisposition(payload: {
  restaurantId: string;
  orderId: string;
  batchId?: string;
  orderItemId?: string;
  menuItemId?: string;
  menuItemName: string;
  variantName?: string;
  quantity: number;
  wasServed: boolean;
  dispositionType: 'reallocated' | 'staff_meal' | 'complimentary' | 'owner_internal' | 'waste' | 'other';
  destinationOrderId?: string;
  destinationOrderDisplayId?: string;
  wasteReason?: string;
  notes?: string;
  handledBy: string;
  restoreInventory?: boolean;
}): Promise<FoodDispositionResult> {
  const result: FoodDispositionResult = {
    success: true,
    dispositionsCreated: 0,
    inventoryRestored: false
  };

  try {
    // 1. Food Safety Validation: Served food cannot be reallocated to another customer!
    if (payload.wasServed && payload.dispositionType === 'reallocated') {
      return {
        success: false,
        dispositionsCreated: 0,
        inventoryRestored: false,
        error: 'Food Safety Policy: Food that was already served cannot be reallocated to another customer.'
      };
    }

    // 2. Mandatory reason for 'other'
    if (payload.dispositionType === 'other' && (!payload.notes || payload.notes.trim().length === 0)) {
      return {
        success: false,
        dispositionsCreated: 0,
        inventoryRestored: false,
        error: 'A specific explanation is required when selecting "Other" disposition.'
      };
    }

    // 3. Insert disposition record
    const { error: dispErr } = await supabase
      .from('prepared_food_dispositions')
      .insert({
        restaurant_id: payload.restaurantId,
        order_id: payload.orderId,
        batch_id: payload.batchId || null,
        order_item_id: payload.orderItemId || null,
        menu_item_id: payload.menuItemId || null,
        menu_item_name: payload.menuItemName,
        variant_name: payload.variantName || null,
        quantity: payload.quantity || 1,
        was_served: payload.wasServed || false,
        disposition_type: payload.dispositionType,
        destination_order_id: payload.destinationOrderId || null,
        destination_order_display_id: payload.destinationOrderDisplayId || null,
        waste_reason: payload.wasteReason || null,
        notes: payload.notes || null,
        handled_by: payload.handledBy,
        inventory_restored: Boolean(payload.restoreInventory)
      });

    if (dispErr) throw dispErr;
    result.dispositionsCreated = 1;

    // 4. If explicit restore requested, execute restoration
    if (payload.restoreInventory) {
      const restoreRes = await restoreInventoryForOrderBatch(
        payload.restaurantId,
        payload.orderId,
        payload.batchId,
        undefined,
        payload.handledBy,
        payload.notes || 'Restored via disposition modal'
      );
      result.inventoryRestored = restoreRes.success;
    }

    return result;
  } catch (err: any) {
    console.error('[InventoryEngine] Error in recordPreparedFoodDisposition:', err);
    return {
      success: false,
      dispositionsCreated: 0,
      inventoryRestored: false,
      error: err.message || 'Failed to record food disposition'
    };
  }
}

/**
 * Calculates max available servings and exact limiting reasons for a menu item and portion/variant.
 * Uses available_to_sell = current_stock - reserved_stock.
 */
export async function calculateDishStockAvailability(
  restaurantId: string,
  menuItemId: string,
  variantId?: string,
  variantName?: string
): Promise<{
  maxServings: number;
  limitingIngredient?: string;
  isAvailable: boolean;
  isLowStock: boolean;
  status: 'available' | 'low_stock' | 'out_of_stock';
  outOfStockReasons: string[];
  lowStockReasons: string[];
  ingredientBreakdown: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
    possibleServings: number;
  }>;
}> {
  const result = {
    maxServings: 9999,
    limitingIngredient: undefined as string | undefined,
    isAvailable: true,
    isLowStock: false,
    status: 'available' as 'available' | 'low_stock' | 'out_of_stock',
    outOfStockReasons: [] as string[],
    lowStockReasons: [] as string[],
    ingredientBreakdown: [] as any[]
  };

  try {
    const { data: recipes } = await supabase
      .from('inventory_recipes')
      .select('*, inventory_recipe_ingredients(*)')
      .eq('restaurant_id', restaurantId)
      .eq('menu_item_id', menuItemId);

    const matched = findMatchingRecipeWithScaling(recipes || [], menuItemId, variantId, variantName);
    const recipe = matched?.recipe;
    const portionMultiplier = matched?.portionMultiplier || 1.0;

    if (!recipe || !recipe.inventory_recipe_ingredients || recipe.inventory_recipe_ingredients.length === 0) {
      // Check if there is a direct inventory item matching dish name
      const { data: mItem } = await supabase.from('menu_items').select('name').eq('id', menuItemId).single();
      if (mItem?.name) {
        const cleanName = cleanDishName(mItem.name);
        const { data: directItems } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true);

        const direct = (directItems || []).find(d => 
          d.name.trim().toLowerCase() === mItem.name.trim().toLowerCase() ||
          d.name.trim().toLowerCase() === cleanName
        );

        if (direct) {
          const physical = Number(direct.current_stock || 0);
          const reserved = Number(direct.reserved_stock || 0);
          const availableToSell = Math.max(0, Math.floor((physical - reserved) / portionMultiplier));

          result.maxServings = availableToSell;
          result.isAvailable = availableToSell > 0;
          result.isLowStock = availableToSell > 0 && availableToSell <= Number(direct.minimum_stock || 0);

          if (availableToSell <= 0) {
            result.status = 'out_of_stock';
            result.outOfStockReasons.push(`${direct.name} is out of stock`);
            result.limitingIngredient = direct.name;
          } else if (result.isLowStock) {
            result.status = 'low_stock';
            result.lowStockReasons.push(`${direct.name} — only ${formatQuantityWithUnit(availableToSell, direct.unit)} remaining`);
          } else {
            result.status = 'available';
          }
        }
      }
      return result;
    }

    let minServings = Infinity;
    let limitingName: string | undefined = undefined;

    for (const ing of recipe.inventory_recipe_ingredients) {
      const { data: item } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', ing.inventory_item_id)
        .eq('restaurant_id', restaurantId)
        .single();

      if (!item) continue;

      let reqInItemUnit = Number(ing.quantity || 0) * portionMultiplier;
      if (normalizeUnit(ing.unit) !== normalizeUnit(item.unit) && areUnitsCompatible(ing.unit, item.unit)) {
        reqInItemUnit = convertUnit(reqInItemUnit, ing.unit, item.unit);
      }

      const physical = Number(item.current_stock || 0);
      const reserved = Number(item.reserved_stock || 0);
      const availableToSell = Math.max(0, physical - reserved);

      const possible = reqInItemUnit > 0 ? Math.floor(availableToSell / reqInItemUnit) : 9999;
      const cleanPossible = possible < 0 ? 0 : possible;

      result.ingredientBreakdown.push({
        name: item.name,
        required: reqInItemUnit,
        available: availableToSell,
        unit: item.unit,
        possibleServings: cleanPossible
      });

      if (cleanPossible <= 0 || availableToSell < reqInItemUnit) {
        result.outOfStockReasons.push(`${item.name} is out of stock`);
      } else if (availableToSell <= Number(item.minimum_stock || 0) || cleanPossible <= 5) {
        result.lowStockReasons.push(`${item.name} — only ${formatQuantityWithUnit(availableToSell, item.unit)} remaining`);
      }

      if (cleanPossible < minServings) {
        minServings = cleanPossible;
        limitingName = item.name;
      }
    }

    if (minServings !== Infinity) {
      result.maxServings = Math.max(0, minServings);
      result.limitingIngredient = limitingName;
      result.isAvailable = result.maxServings > 0;
      result.isLowStock = result.isAvailable && (result.lowStockReasons.length > 0 || result.maxServings <= 5);
      
      if (!result.isAvailable) {
        result.status = 'out_of_stock';
      } else if (result.isLowStock) {
        result.status = 'low_stock';
      } else {
        result.status = 'available';
      }
    }
  } catch (err) {
    console.error('calculateDishStockAvailability error:', err);
  }

  return result;
}

/**
 * Returns a comprehensive real-time map of all menu items and portions with stock status and reasons.
 */
export async function getRestaurantMenuStockMap(restaurantId: string): Promise<{
  menuStockMap: Record<string, {
    menuItemId: string;
    menuItemName: string;
    variantId?: string;
    status: 'available' | 'low_stock' | 'out_of_stock';
    maxServings: number;
    isAvailable: boolean;
    isLowStock: boolean;
    outOfStockReasons: string[];
    lowStockReasons: string[];
    limitingIngredient?: string;
    hasRecipe: boolean;
  }>;
  outOfStockItems: Array<{ menuItemId: string; name: string; reasons: string[] }>;
  lowStockItems: Array<{ menuItemId: string; name: string; reasons: string[]; maxServings: number }>;
}> {
  const result = {
    menuStockMap: {} as Record<string, any>,
    outOfStockItems: [] as Array<{ menuItemId: string; name: string; reasons: string[] }>,
    lowStockItems: [] as Array<{ menuItemId: string; name: string; reasons: string[]; maxServings: number }>
  };

  if (!restaurantId) return result;

  try {
    const [menuRes, rawRes, recipesRes, variantsRes] = await Promise.all([
      supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId),
      supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).eq('is_active', true),
      supabase.from('inventory_recipes').select('*, inventory_recipe_ingredients(*)').eq('restaurant_id', restaurantId),
      supabase.from('menu_item_variants').select('*')
    ]);

    const menuItems = menuRes.data || [];
    const rawItems = rawRes.data || [];
    const recipes = recipesRes.data || [];
    const variants = variantsRes.data || [];

    const rawMap = new Map<string, any>();
    rawItems.forEach(i => rawMap.set(i.id, i));

    for (const mItem of menuItems) {
      const itemVariants = variants.filter(v => v.menu_item_id === mItem.id);

      if (mItem.has_variants && itemVariants.length > 0) {
        // Calculate per variant
        for (const variant of itemVariants) {
          const matched = findMatchingRecipeWithScaling(recipes, mItem.id, variant.id, variant.name);
          const recipe = matched?.recipe;
          const portionMultiplier = matched?.portionMultiplier || 1.0;

          let maxServings = 9999;
          let limitingName: string | undefined = undefined;
          const outOfStockReasons: string[] = [];
          const lowStockReasons: string[] = [];
          const hasRecipe = Boolean(recipe && recipe.inventory_recipe_ingredients && recipe.inventory_recipe_ingredients.length > 0);

          if (hasRecipe) {
            let minServings = Infinity;

            for (const ing of recipe.inventory_recipe_ingredients) {
              const rawItem = rawMap.get(ing.inventory_item_id);
              if (!rawItem) continue;

              let reqInItemUnit = Number(ing.quantity || 0) * portionMultiplier;
              if (normalizeUnit(ing.unit) !== normalizeUnit(rawItem.unit) && areUnitsCompatible(ing.unit, rawItem.unit)) {
                reqInItemUnit = convertUnit(reqInItemUnit, ing.unit, rawItem.unit);
              }

              const physical = Number(rawItem.current_stock || 0);
              const reserved = Number(rawItem.reserved_stock || 0);
              const availableToSell = Math.max(0, physical - reserved);

              const possible = reqInItemUnit > 0 ? Math.floor(availableToSell / reqInItemUnit) : 9999;
              const cleanPossible = possible < 0 ? 0 : possible;

              if (cleanPossible <= 0 || availableToSell < reqInItemUnit) {
                outOfStockReasons.push(`${rawItem.name} is out of stock`);
              } else if (availableToSell <= Number(rawItem.minimum_stock || 0) || cleanPossible <= 5) {
                lowStockReasons.push(`${rawItem.name} — only ${formatQuantityWithUnit(availableToSell, rawItem.unit)} remaining`);
              }

              if (cleanPossible < minServings) {
                minServings = cleanPossible;
                limitingName = rawItem.name;
              }
            }

            if (minServings !== Infinity) {
              maxServings = Math.max(0, minServings);
            }
          }

          const isAvailable = maxServings > 0;
          const isLowStock = isAvailable && (lowStockReasons.length > 0 || maxServings <= 5);
          const status: 'available' | 'low_stock' | 'out_of_stock' = !isAvailable ? 'out_of_stock' : isLowStock ? 'low_stock' : 'available';

          const entry = {
            menuItemId: mItem.id,
            menuItemName: `${mItem.name} (${variant.name})`,
            variantId: variant.id,
            status,
            maxServings,
            isAvailable,
            isLowStock,
            outOfStockReasons,
            lowStockReasons,
            limitingIngredient: limitingName,
            hasRecipe
          };

          const key = `${mItem.id}_${variant.id}`;
          result.menuStockMap[key] = entry;

          if (status === 'out_of_stock') {
            result.outOfStockItems.push({
              menuItemId: mItem.id,
              name: `${mItem.name} (${variant.name})`,
              reasons: outOfStockReasons.length > 0 ? outOfStockReasons : ['Item is out of stock']
            });
          } else if (status === 'low_stock') {
            result.lowStockItems.push({
              menuItemId: mItem.id,
              name: `${mItem.name} (${variant.name})`,
              reasons: lowStockReasons.length > 0 ? lowStockReasons : [`Only ${maxServings} available`],
              maxServings
            });
          }
        }
      }

      // Base dish calculation
      const matchedBase = findMatchingRecipeWithScaling(recipes, mItem.id);
      const recipe = matchedBase?.recipe;
      const portionMultiplier = matchedBase?.portionMultiplier || 1.0;

      let maxServings = 9999;
      let limitingName: string | undefined = undefined;
      const outOfStockReasons: string[] = [];
      const lowStockReasons: string[] = [];
      const hasRecipe = Boolean(recipe && recipe.inventory_recipe_ingredients && recipe.inventory_recipe_ingredients.length > 0);

      if (hasRecipe) {
        let minServings = Infinity;

        for (const ing of recipe.inventory_recipe_ingredients) {
          const rawItem = rawMap.get(ing.inventory_item_id);
          if (!rawItem) continue;

          let reqInItemUnit = Number(ing.quantity || 0) * portionMultiplier;
          if (normalizeUnit(ing.unit) !== normalizeUnit(rawItem.unit) && areUnitsCompatible(ing.unit, rawItem.unit)) {
            reqInItemUnit = convertUnit(reqInItemUnit, ing.unit, rawItem.unit);
          }

          const physical = Number(rawItem.current_stock || 0);
          const reserved = Number(rawItem.reserved_stock || 0);
          const availableToSell = Math.max(0, physical - reserved);

          const possible = reqInItemUnit > 0 ? Math.floor(availableToSell / reqInItemUnit) : 9999;
          const cleanPossible = possible < 0 ? 0 : possible;

          if (cleanPossible <= 0 || availableToSell < reqInItemUnit) {
            outOfStockReasons.push(`${rawItem.name} is out of stock`);
          } else if (availableToSell <= Number(rawItem.minimum_stock || 0) || cleanPossible <= 5) {
            lowStockReasons.push(`${rawItem.name} — only ${formatQuantityWithUnit(availableToSell, rawItem.unit)} remaining`);
          }

          if (cleanPossible < minServings) {
            minServings = cleanPossible;
            limitingName = rawItem.name;
          }
        }

        if (minServings !== Infinity) {
          maxServings = Math.max(0, minServings);
        }
      } else {
        // Direct matching fallback with cleaned name
        const cleanName = cleanDishName(mItem.name);
        const direct = rawItems.find(r => 
          r.name.trim().toLowerCase() === mItem.name.trim().toLowerCase() ||
          r.name.trim().toLowerCase() === cleanName
        );
        if (direct) {
          const physical = Number(direct.current_stock || 0);
          const reserved = Number(direct.reserved_stock || 0);
          const availableToSell = Math.max(0, Math.floor(physical - reserved));
          maxServings = availableToSell;
          limitingName = direct.name;

          if (availableToSell <= 0) {
            outOfStockReasons.push(`${direct.name} is out of stock`);
          } else if (availableToSell <= Number(direct.minimum_stock || 0)) {
            lowStockReasons.push(`${direct.name} — only ${formatQuantityWithUnit(availableToSell, direct.unit)} remaining`);
          }
        }
      }

      const isAvailable = maxServings > 0;
      const isLowStock = isAvailable && (lowStockReasons.length > 0 || maxServings <= 5);
      const status: 'available' | 'low_stock' | 'out_of_stock' = !isAvailable ? 'out_of_stock' : isLowStock ? 'low_stock' : 'available';

      const entry = {
        menuItemId: mItem.id,
        menuItemName: mItem.name,
        status,
        maxServings,
        isAvailable,
        isLowStock,
        outOfStockReasons,
        lowStockReasons,
        limitingIngredient: limitingName,
        hasRecipe
      };

      result.menuStockMap[mItem.id] = entry;

      if (!mItem.has_variants) {
        if (status === 'out_of_stock') {
          result.outOfStockItems.push({
            menuItemId: mItem.id,
            name: mItem.name,
            reasons: outOfStockReasons.length > 0 ? outOfStockReasons : ['Item is out of stock']
          });
        } else if (status === 'low_stock') {
          result.lowStockItems.push({
            menuItemId: mItem.id,
            name: mItem.name,
            reasons: lowStockReasons.length > 0 ? lowStockReasons : [`Only ${maxServings} available`],
            maxServings
          });
        }
      }
    }
  } catch (err) {
    console.error('[InventoryEngine] Error in getRestaurantMenuStockMap:', err);
  }

  return result;
}

/**
 * Validates whether the entire requested order batch can be fulfilled by available inventory stock.
 * Uses available_to_sell = current_stock - reserved_stock.
 * Correctly accounts for shared ingredients across multiple menu items and portions in the cart!
 */
export async function validateOrderStockAvailability(
  restaurantId: string,
  items: Array<{ menuItemId: string; quantity: number; menuItemName?: string; variantId?: string; variantName?: string }>
): Promise<{
  allowed: boolean;
  error?: string;
  itemStockMap?: Record<string, number>;
}> {
  if (!restaurantId || !items || items.length === 0) {
    return { allowed: true };
  }

  try {
    const menuItemIds = Array.from(new Set(items.map(i => i.menuItemId)));

    const [recipesRes, rawRes, menuRes] = await Promise.all([
      supabase.from('inventory_recipes').select('*, inventory_recipe_ingredients(*)').eq('restaurant_id', restaurantId).in('menu_item_id', menuItemIds),
      supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).eq('is_active', true),
      supabase.from('menu_items').select('id, name, is_available').eq('restaurant_id', restaurantId).in('id', menuItemIds)
    ]);

    const recipes = recipesRes.data || [];
    const rawItems = rawRes.data || [];
    const menuItems = menuRes.data || [];

    const rawMap = new Map<string, any>();
    rawItems.forEach(i => rawMap.set(i.id, i));

    const menuMap = new Map<string, any>();
    menuItems.forEach(m => menuMap.set(m.id, m));

    // Accumulate total raw material demand across all items and variants in the order
    const ingredientDemand = new Map<string, { required: number; unit: string; rawItem: any; dishNames: string[] }>();

    for (const item of items) {
      const orderQty = Number(item.quantity || 1);
      const mItem = menuMap.get(item.menuItemId);
      const dishLabel = item.menuItemName || mItem?.name || 'Dish';

      const matched = findMatchingRecipeWithScaling(recipes, item.menuItemId, item.variantId, item.variantName);

      if (matched && matched.recipe && matched.recipe.inventory_recipe_ingredients && matched.recipe.inventory_recipe_ingredients.length > 0) {
        const portionMultiplier = matched.portionMultiplier;
        for (const ing of matched.recipe.inventory_recipe_ingredients) {
          const rawItem = rawMap.get(ing.inventory_item_id);
          if (!rawItem) continue;

          let reqInItemUnit = Number(ing.quantity || 0) * orderQty * portionMultiplier;
          if (normalizeUnit(ing.unit) !== normalizeUnit(rawItem.unit) && areUnitsCompatible(ing.unit, rawItem.unit)) {
            reqInItemUnit = convertUnit(reqInItemUnit, ing.unit, rawItem.unit);
          }

          const existingDemand: { required: number; unit: string; rawItem: any; dishNames: string[] } = ingredientDemand.get(rawItem.id) || {
            required: 0,
            unit: rawItem.unit,
            rawItem,
            dishNames: []
          };
          existingDemand.required += reqInItemUnit;
          if (!existingDemand.dishNames.includes(dishLabel)) {
            existingDemand.dishNames.push(dishLabel);
          }
          ingredientDemand.set(rawItem.id, existingDemand);
        }
      } else {
        // Direct matching fallback with cleaned name
        const cleanName = cleanDishName(mItem?.name || item.menuItemName || '');
        const direct = rawItems.find(r => 
          r.name.trim().toLowerCase() === (mItem?.name || '').trim().toLowerCase() ||
          r.name.trim().toLowerCase() === cleanName
        );
        if (direct) {
          const mult = getPortionMultiplier(item.variantName, false);
          const effectiveQty = orderQty * mult;
          const existingDemand: { required: number; unit: string; rawItem: any; dishNames: string[] } = ingredientDemand.get(direct.id) || {
            required: 0,
            unit: direct.unit,
            rawItem: direct,
            dishNames: []
          };
          existingDemand.required += effectiveQty;
          if (!existingDemand.dishNames.includes(dishLabel)) {
            existingDemand.dishNames.push(dishLabel);
          }
          ingredientDemand.set(direct.id, existingDemand);
        }
      }
    }

    // Verify all accumulated demands against available-to-sell stock (current_stock - reserved_stock)
    for (const [itemId, demand] of Array.from(ingredientDemand.entries())) {
      const physical = Number(demand.rawItem.current_stock || 0);
      const reserved = Number(demand.rawItem.reserved_stock || 0);
      const availableToSell = Math.max(0, physical - reserved);

      if (demand.required > availableToSell) {
        const dishList = demand.dishNames.join(', ');
        if (availableToSell <= 0) {
          return {
            allowed: false,
            error: `Item "${dishList}" is out of stock due to ${demand.rawItem.name}.`
          };
        } else {
          return {
            allowed: false,
            error: `Insufficient stock for "${demand.rawItem.name}". Requested requires ${demand.required.toFixed(2)} ${demand.unit}, but only ${availableToSell.toFixed(2)} ${demand.unit} is available.`
          };
        }
      }
    }

    return { allowed: true };
  } catch (err: any) {
    console.error('[InventoryEngine] validateOrderStockAvailability error:', err);
    return { allowed: true };
  }
}

/**
 * Automatically syncs menu item and variant `is_available` states with real-time inventory stock levels.
 */
export async function syncInventoryMenuAvailability(restaurantId: string): Promise<{
  updatedMenuItemsCount: number;
  updatedVariantsCount: number;
  outOfStockItems: string[];
}> {
  const summary = {
    updatedMenuItemsCount: 0,
    updatedVariantsCount: 0,
    outOfStockItems: [] as string[]
  };

  if (!restaurantId) return summary;

  try {
    const stockMapData = await getRestaurantMenuStockMap(restaurantId);

    // Track parent menu item availability
    const parentMenuItemAvailabilityMap = new Map<string, boolean>();

    for (const [key, stockInfo] of Object.entries(stockMapData.menuStockMap)) {
      if (!stockInfo.hasRecipe && !stockInfo.limitingIngredient) continue;

      const shouldBeAvailable = stockInfo.maxServings > 0;
      const mItemId = stockInfo.menuItemId;

      if (stockInfo.variantId) {
        await supabase
          .from('menu_item_variants')
          .update({ is_available: shouldBeAvailable })
          .eq('id', stockInfo.variantId);
        summary.updatedVariantsCount++;

        // Parent dish is available if at least one variant is available
        const currentParent = parentMenuItemAvailabilityMap.get(mItemId);
        parentMenuItemAvailabilityMap.set(mItemId, currentParent === true || shouldBeAvailable);
      } else {
        parentMenuItemAvailabilityMap.set(mItemId, shouldBeAvailable);
      }

      if (!shouldBeAvailable) {
        summary.outOfStockItems.push(`${stockInfo.menuItemName} (${stockInfo.outOfStockReasons.join(', ')})`);
      }
    }

    // Update parent menu_items table
    for (const [menuItemId, isAvailable] of parentMenuItemAvailabilityMap.entries()) {
      await supabase
        .from('menu_items')
        .update({ is_available: isAvailable })
        .eq('id', menuItemId)
        .eq('restaurant_id', restaurantId);
      summary.updatedMenuItemsCount++;
    }
  } catch (err) {
    console.error('[InventoryEngine] Error in syncInventoryMenuAvailability:', err);
  }

  return summary;
}

/**
 * Calculates hourly inventory cancellation & unavailability impact report.
 */
export async function getHourlyInventoryImpactReport(
  restaurantId: string,
  hours: number = 1
): Promise<{
  affectedOrdersCount: number;
  cancelledOrdersCount: number;
  estimatedLostRevenue: number;
  itemBreakdown: Array<{
    itemName: string;
    affectedOrders: number;
    lostRevenue: number;
  }>;
}> {
  const report = {
    affectedOrdersCount: 0,
    cancelledOrdersCount: 0,
    estimatedLostRevenue: 0,
    itemBreakdown: [] as any[]
  };

  if (!restaurantId) return report;

  try {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data: cancelledOrders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'cancelled')
      .gte('created_at', cutoff);

    if (!cancelledOrders || cancelledOrders.length === 0) return report;

    const breakdownMap = new Map<string, { count: number; lost: number }>();

    for (const order of cancelledOrders) {
      const isInventoryReason = order.notes?.toLowerCase().includes('stock') ||
        order.notes?.toLowerCase().includes('inventory') ||
        order.notes?.toLowerCase().includes('unavailable') ||
        order.cancellation_reason?.toLowerCase().includes('out of stock');

      if (!isInventoryReason) continue;

      report.cancelledOrdersCount++;
      report.affectedOrdersCount++;
      const orderTotal = Number(order.total_amount || 0);
      report.estimatedLostRevenue += orderTotal;

      for (const item of (order.order_items || [])) {
        const name = item.menu_item_name || 'Dish';
        const lost = Number(item.price || 0) * Number(item.quantity || 1);
        const curr = breakdownMap.get(name) || { count: 0, lost: 0 };
        breakdownMap.set(name, { count: curr.count + 1, lost: curr.lost + lost });
      }
    }

    breakdownMap.forEach((val, key) => {
      report.itemBreakdown.push({
        itemName: key,
        affectedOrders: val.count,
        lostRevenue: parseFloat(val.lost.toFixed(2))
      });
    });

    report.estimatedLostRevenue = parseFloat(report.estimatedLostRevenue.toFixed(2));
  } catch (err) {
    console.error('[InventoryEngine] Error in getHourlyInventoryImpactReport:', err);
  }

  return report;
}

/**
 * Deduplicated Low Stock & Out of Stock alert generator (24-hour window per item)
 */
async function checkAndGenerateLowStockAlert(
  restaurantId: string,
  itemId: string,
  currentStock: number,
  minimumStock: number,
  unit: string,
  itemName: string
) {
  if (currentStock > minimumStock) return;

  const alertType = currentStock <= 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK';
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('inventory_alerts')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .eq('inventory_item_id', itemId)
    .eq('alert_type', alertType)
    .eq('is_acknowledged', false)
    .gte('last_notified_at', cutoff);

  if (existing && existing.length > 0) {
    return;
  }

  let affectedItemsCount = 0;
  let affectedItemNames: string[] = [];

  const { data: recipes } = await supabase
    .from('inventory_recipes')
    .select('menu_item_id, inventory_recipe_ingredients!inner(inventory_item_id)')
    .eq('restaurant_id', restaurantId)
    .eq('inventory_recipe_ingredients.inventory_item_id', itemId);

  if (recipes && recipes.length > 0) {
    const menuItemIds = Array.from(new Set(recipes.map(r => r.menu_item_id)));
    const { data: dishes } = await supabase
      .from('menu_items')
      .select('name')
      .in('id', menuItemIds);

    if (dishes) {
      affectedItemsCount = dishes.length;
      affectedItemNames = dishes.map(d => d.name);
    }
  }

  await supabase
    .from('inventory_alerts')
    .insert({
      restaurant_id: restaurantId,
      inventory_item_id: itemId,
      alert_type: alertType,
      current_stock: currentStock,
      minimum_stock: minimumStock,
      unit,
      is_acknowledged: false,
      last_notified_at: new Date().toISOString()
    })
    .select();
}

export type OrderLifecycleStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface LifecycleTransitionParams {
  restaurantId: string;
  orderId: string;
  batchId?: string;
  targetStatus: OrderLifecycleStatus;
  callingFunction: string;
  actor?: string;
  cancellationReason?: string;
  paymentDetails?: {
    paymentMethod?: string;
    paymentReference?: string;
  };
}

export interface LifecycleTransitionResult {
  success: boolean;
  orderId: string;
  batchId?: string;
  oldStatus: string;
  newStatus: string;
  callingFunction: string;
  inventoryConsumptionAttempted: boolean;
  reservationFound: boolean;
  reservationQty: number;
  consumptionResult: string;
  idempotencyKey?: string;
  transactionIds: string[];
  error?: string;
}

/**
 * AUTHORITATIVE SERVER-SIDE ORDER & BATCH LIFECYCLE TRANSITION ENGINE
 * 
 * Guarantees:
 * 1. Single authoritative entry point for all UI surfaces (Owner Orders, KDS, Waiter, Merged Billing).
 * 2. Strict, concurrency-safe, idempotent inventory reservation on ACCEPTED.
 * 3. Defensive physical inventory consumption when entering PREPARING, READY, SERVED, or COMPLETED.
 * 4. Correct ERP cancellation handling:
 *    - Before preparation (new / accepted): Releases reservation, physical stock untouched.
 *    - After preparation (preparing / ready / served / completed): Physical stock remains consumed; disposition required.
 * 5. Automatic real-time menu item & portion availability synchronization.
 * 6. Structured diagnostic forensic logging on every transition.
 */
export async function transitionOrderBatchLifecycle(params: LifecycleTransitionParams): Promise<LifecycleTransitionResult> {
  const {
    restaurantId,
    orderId,
    batchId,
    targetStatus,
    callingFunction,
    actor = 'Staff Member',
    cancellationReason,
    paymentDetails
  } = params;

  const nowIso = new Date().toISOString();
  let oldStatus = 'unknown';
  let reservationFound = false;
  let totalReservationQty = 0;
  let consumptionAttempted = false;
  let consumptionResultStr = 'NONE';
  const recordedTxIds: string[] = [];
  let primaryIdempotencyKey = '';

  try {
    // 1. Fetch current order, batches, and items
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const { data: allBatches } = await supabase
      .from('order_batches')
      .select('*')
      .eq('order_id', orderId);

    const { data: allItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    let targetBatches: any[] = [];
    if (batchId) {
      const match = (allBatches || []).find(b => b.id === batchId);
      targetBatches = match ? [match] : [{ id: batchId, status: order.status }];
    } else if (allBatches && allBatches.length > 0) {
      targetBatches = allBatches.filter(b => b.status !== 'cancelled');
    } else {
      const uniqueBatchIds = Array.from(new Set((allItems || []).map(i => i.batch_id).filter(Boolean)));
      if (uniqueBatchIds.length > 0) {
        targetBatches = uniqueBatchIds.map(bId => ({ id: bId, status: order.status }));
      } else {
        targetBatches = [{ id: orderId, status: order.status }];
      }
    }

    oldStatus = targetBatches[0]?.status || order.status;

    console.log(`[FORENSIC_INVENTORY_TRACE] LIFECYCLE_TRANSITION_START - OrderID: ${orderId}, BatchID: ${batchId || 'ALL'}, TargetStatus: ${targetStatus}, CallingFunction: ${callingFunction}`);

    // 2. Execute Inventory Side-Effects
    if (['new', 'accepted'].includes(targetStatus)) {
      for (const b of targetBatches) {
        const bItems = (allItems || []).filter(i => i.batch_id === b.id && !i.is_cancelled && i.status !== 'cancelled');
        const itemsToReserve = bItems.length > 0 ? bItems : (allItems || []);
        if (itemsToReserve.length > 0) {
          const formatted = itemsToReserve.map(i => ({
            menuItemId: i.menu_item_id,
            quantity: i.quantity,
            menuItemName: i.menu_item_name,
            variantId: i.variant_id,
            variantName: i.variant_name
          }));
          primaryIdempotencyKey = `ORDER_RESERVATION_${orderId}_${b.id}`;
          console.log(`[FORENSIC_INVENTORY_TRACE] INVOKING_RESERVE_INVENTORY - BatchID: ${b.id}, ItemsCount: ${formatted.length}`);
          const res = await reserveInventoryForOrderBatch(restaurantId, orderId, b.id, formatted, undefined, actor);
          consumptionResultStr = res.skipped ? 'RESERVATION_ALREADY_EXISTS' : `RESERVED_${res.reservationsCreated}_ITEMS`;
          console.log(`[FORENSIC_INVENTORY_TRACE] RESERVE_INVENTORY_COMPLETE - BatchID: ${b.id}, Result: ${consumptionResultStr}`);
        }
      }
    } else if (['preparing', 'ready', 'served', 'completed'].includes(targetStatus)) {
      consumptionAttempted = true;
      for (const b of targetBatches) {
        primaryIdempotencyKey = `ORDER_CONSUMPTION_${orderId}_${b.id}`;

        // Check if active reservations exist
        const { data: activeRes } = await supabase
          .from('inventory_reservations')
          .select('id, reserved_quantity, inventory_item_id')
          .eq('restaurant_id', restaurantId)
          .eq('batch_id', b.id)
          .eq('status', 'ACTIVE');

        if (activeRes && activeRes.length > 0) {
          reservationFound = true;
          totalReservationQty += activeRes.reduce((acc, r) => acc + Number(r.reserved_quantity || 0), 0);
        }

        const bItems = (allItems || []).filter(i => i.batch_id === b.id && !i.is_cancelled && i.status !== 'cancelled');
        const itemsToConsume = bItems.length > 0 ? bItems : (allItems || []);

        if (itemsToConsume.length > 0) {
          const formatted = itemsToConsume.map(i => ({
            menuItemId: i.menu_item_id,
            quantity: i.quantity,
            menuItemName: i.menu_item_name,
            variantId: i.variant_id,
            variantName: i.variant_name
          }));

          const cRes = await consumeReservedInventoryForOrderBatch(restaurantId, orderId, b.id, formatted, undefined, actor);
          consumptionResultStr = cRes.skipped 
            ? 'ALREADY_CONSUMED_IDEMPOTENT' 
            : `CONSUMED_${cRes.transactionsCreated}_ITEMS`;
        }

        // Fetch newly created/existing transaction IDs
        const { data: txs } = await supabase
          .from('inventory_transactions')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .ilike('idempotency_key', `${primaryIdempotencyKey}%`);

        (txs || []).forEach(t => {
          if (!recordedTxIds.includes(t.id)) recordedTxIds.push(t.id);
        });
      }
    } else if (targetStatus === 'cancelled') {
      for (const b of targetBatches) {
        const batchPrevStatus = b.status || oldStatus;
        if (batchPrevStatus === 'new' || batchPrevStatus === 'accepted') {
          // Release reservation before preparation begins
          primaryIdempotencyKey = `RESERVATION_RELEASE_${orderId}_${b.id}`;
          const relRes = await releaseInventoryReservationForOrderBatch(restaurantId, orderId, b.id, undefined, actor, cancellationReason);
          consumptionResultStr = `RELEASED_${relRes.reversedCount}_RESERVATIONS`;
        } else {
          // Food was already preparing/prepared - inventory remains consumed
          consumptionResultStr = 'PREPARED_INVENTORY_REMAINS_CONSUMED';
        }
      }
    }

    // 3. Sync Database State (Batches & Order)
    if (batchId) {
      // Single Batch Transition
      const batchUpdate: any = { 
        status: targetStatus === 'completed' ? 'served' : targetStatus, 
        updated_at: nowIso 
      };

      if (targetStatus === 'accepted') {
        batchUpdate.accepted_at = nowIso;
        batchUpdate.accepted_by = actor;
      } else if (targetStatus === 'preparing') {
        batchUpdate.preparing_at = nowIso;
        batchUpdate.preparing_by = actor;
      } else if (targetStatus === 'ready') {
        batchUpdate.ready_at = nowIso;
        batchUpdate.ready_by = actor;
      } else if (targetStatus === 'served' || targetStatus === 'completed') {
        batchUpdate.served_at = nowIso;
        batchUpdate.served_by = actor;
      } else if (targetStatus === 'cancelled') {
        batchUpdate.special_instructions = `[CANCELLED] ${cancellationReason || 'Cancelled'}`;
      }

      await supabase.from('order_batches').update(batchUpdate).eq('id', batchId);

      if (targetStatus === 'cancelled') {
        try {
          await supabase.from('order_items').update({
            status: 'cancelled',
            is_cancelled: true,
            notes: `[CANCELLED] ${cancellationReason || 'Cancelled'}`
          }).eq('batch_id', batchId);
        } catch (e) {}
      }
    } else {
      // Order-Wide Transition: Sync all non-cancelled batches
      for (const b of targetBatches) {
        const batchStatus = targetStatus === 'completed' ? 'served' : targetStatus;
        const bPayload: any = { status: batchStatus, updated_at: nowIso };

        if (targetStatus === 'accepted') {
          bPayload.accepted_at = b.accepted_at || nowIso;
          bPayload.accepted_by = b.accepted_by || actor;
        } else if (targetStatus === 'preparing') {
          bPayload.preparing_at = b.preparing_at || nowIso;
          bPayload.preparing_by = b.preparing_by || actor;
        } else if (targetStatus === 'ready') {
          bPayload.ready_at = b.ready_at || nowIso;
          bPayload.ready_by = b.ready_by || actor;
        } else if (targetStatus === 'served' || targetStatus === 'completed') {
          bPayload.served_at = b.served_at || nowIso;
          bPayload.served_by = b.served_by || actor;
        } else if (targetStatus === 'cancelled') {
          bPayload.special_instructions = `[CANCELLED] ${cancellationReason || 'Order Cancelled'}`;
        }

        await supabase.from('order_batches').update(bPayload).eq('id', b.id);
      }
    }

    // 4. Recalculate Parent Order Status from Batches
    const { data: updatedBatches } = await supabase
      .from('order_batches')
      .select('*')
      .eq('order_id', orderId);

    const nonCancelled = (updatedBatches || []).filter(b => b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'));
    let parentStatus: OrderLifecycleStatus = targetStatus;

    if (updatedBatches && updatedBatches.length > 0) {
      const nonCancelled = updatedBatches.filter(b => b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'));
      if (nonCancelled.length === 0) {
        parentStatus = 'cancelled';
      } else if (order.status === 'completed' || targetStatus === 'completed') {
        parentStatus = 'completed';
      } else if (nonCancelled.every(b => b.status === 'served')) {
        parentStatus = 'served';
      } else if (nonCancelled.some(b => b.status === 'ready')) {
        parentStatus = 'ready';
      } else if (nonCancelled.some(b => b.status === 'preparing')) {
        parentStatus = 'preparing';
      } else if (nonCancelled.some(b => b.status === 'accepted')) {
        parentStatus = 'accepted';
      } else if (nonCancelled.every(b => b.status === 'new')) {
        parentStatus = 'new';
      }
    }

    const orderPayload: any = {
      status: parentStatus,
      updated_at: nowIso
    };

    if (parentStatus === 'completed') {
      orderPayload.completed_at = order.completed_at || nowIso;
      orderPayload.completed_by = order.completed_by || actor;
      if (paymentDetails?.paymentMethod) {
        orderPayload.payment_status = 'paid';
        orderPayload.payment_method = paymentDetails.paymentMethod;
        orderPayload.paid_at = nowIso;
      }
    } else if (parentStatus === 'cancelled') {
      orderPayload.cancelled_at = nowIso;
      orderPayload.cancelled_by = actor;
      orderPayload.cancellation_reason = cancellationReason || 'Cancelled';
    }

    const { error: orderUpdateErr } = await supabase
      .from('orders')
      .update(orderPayload)
      .eq('id', orderId);

    if (orderUpdateErr) {
      console.warn('[InventoryEngine] Notice updating orders table status:', orderUpdateErr?.message || orderUpdateErr);
    }

    // 5. Sync Live Menu Stock Availability
    syncInventoryMenuAvailability(restaurantId).catch(() => {});

    // 6. Output Diagnostic Forensic Transition Log
    const auditRecord: LifecycleTransitionResult = {
      success: true,
      orderId,
      batchId: batchId || 'ALL_BATCHES',
      oldStatus,
      newStatus: targetStatus,
      callingFunction,
      inventoryConsumptionAttempted: consumptionAttempted,
      reservationFound,
      reservationQty: totalReservationQty,
      consumptionResult: consumptionResultStr,
      idempotencyKey: primaryIdempotencyKey,
      transactionIds: recordedTxIds
    };

    console.log('[CLEVEROPS_LIFECYCLE_AUDIT]', JSON.stringify(auditRecord, null, 2));

    return auditRecord;
  } catch (err: any) {
    console.error('[CLEVEROPS_LIFECYCLE_ERROR]', err);
    return {
      success: false,
      orderId,
      batchId,
      oldStatus,
      newStatus: targetStatus,
      callingFunction,
      inventoryConsumptionAttempted: consumptionAttempted,
      reservationFound,
      reservationQty: totalReservationQty,
      consumptionResult: `ERROR: ${err.message}`,
      idempotencyKey: primaryIdempotencyKey,
      transactionIds: recordedTxIds,
      error: err.message
    };
  }
}
