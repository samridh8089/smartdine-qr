/**
 * SmartDine Shared Core Billing Engine
 * Pure business logic for financial calculations, tax models, round-offs,
 * and split billing conservation.
 * Free of UI and framework dependencies.
 */

import { SplitBillPortion, SplitBillResult } from './types';

// Re-export production billing engine
export {
  calculateBillingTotals,
  type BillingInput,
  type BillingResult,
  type BillingItem,
  type CustomCharge
} from '../../src/lib/billingEngine';

// Re-export production tax engine
export {
  calculateOrderTax,
  type RestaurantTaxSettings,
  type TaxCalculationResult
} from '../../src/lib/tax';

/**
 * Calculates equal split portions conserving the exact total down to the rupee.
 * Non-divisible remainders are distributed 1 rupee at a time to the first guests.
 * Example: ₹1000 among 3 guests -> [334, 333, 333] (Sum: 1000)
 */
export function calculateEqualSplit(totalAmount: number, guestCount: number): SplitBillResult {
  if (guestCount <= 0) {
    throw new Error('Guest count must be greater than zero');
  }

  const basePortion = Math.floor(totalAmount / guestCount);
  const remainder = Math.round(totalAmount - basePortion * guestCount);

  const portions: SplitBillPortion[] = [];
  let sum = 0;

  for (let i = 0; i < guestCount; i++) {
    const amount = i < remainder ? basePortion + 1 : basePortion;
    portions.push({
      guestIndex: i + 1,
      amount,
      paid: false
    });
    sum += amount;
  }

  return {
    type: 'equal',
    total: totalAmount,
    portions,
    isConserved: sum === totalAmount
  };
}

/**
 * Validates whether custom split amounts equal the target total.
 */
export function validateCustomSplit(
  customAmounts: number[],
  targetTotal: number
): { valid: boolean; difference: number; sum: number } {
  const sum = customAmounts.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  const difference = Number((targetTotal - sum).toFixed(2));
  return {
    valid: Math.abs(difference) === 0,
    difference,
    sum
  };
}

/**
 * Standard round-off calculation (50-paise boundary).
 */
export function calculateRoundOff(amount: number): { rounded: number; roundOffDiff: number } {
  const rounded = Math.round(amount);
  const roundOffDiff = Number((rounded - amount).toFixed(2));
  return { rounded, roundOffDiff };
}
