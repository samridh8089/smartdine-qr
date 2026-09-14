/**
 * SmartDine Shared Core Inventory Engine Contract
 * 
 * CRITICAL GUARD: INVENTORY ENGINE IS FROZEN.
 * This module establishes the shared core contract without modifying,
 * refactoring, or touching the frozen engine implementation in src/lib/inventoryEngine.ts.
 */

// Re-export verified frozen inventory engine contracts
export {
  getPortionMultiplier,
  cleanDishName,
  findMatchingRecipeWithScaling,
  findMatchingRecipe,
  reserveInventoryForOrderBatch,
  consumeReservedInventoryForOrderBatch,
  restoreInventoryForOrderBatch,
  recordPreparedFoodDisposition,
  calculateDishStockAvailability,
  validateOrderStockAvailability,
  syncInventoryMenuAvailability,
  getItemStockStatus,
  type StockDeductionResult,
  type StockReservationResult,
  type StockReversalResult,
  type FoodDispositionResult,
  type MatchedRecipeResult
} from '../../src/lib/inventoryEngine';

// Re-export verified frozen unit conversion contracts
export {
  convertUnit,
  areUnitsCompatible,
  normalizeUnit,
  formatQuantityWithUnit
} from '../../src/lib/inventoryUnits';

/**
 * Checks if an item has sufficient available stock for a requested quantity.
 */
export function isStockSufficient(availableStock: number, requestedQuantity: number): boolean {
  if (availableStock === Infinity) return true;
  return availableStock >= requestedQuantity;
}

/**
 * Determines if an inventory item has fallen below its critical reorder threshold.
 */
export function isLowStockThresholdBreached(currentStock: number, minThreshold: number): boolean {
  return currentStock <= minThreshold;
}

/**
 * Pure calculation for scaling recipe ingredients by portion and batch multiplier.
 */
export function calculateScaledIngredientQuantity(
  baseQuantity: number,
  portionMultiplier: number,
  orderQuantity: number
): number {
  return Number((baseQuantity * portionMultiplier * orderQuantity).toFixed(4));
}
