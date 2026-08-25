/**
 * CleverOps Centralized Tax & GST Calculation Engine
 * Source of truth for Cart, Checkout, Receipts, Invoices, and Reports.
 */

export interface RestaurantTaxSettings {
  gst_enabled?: boolean;
  tax_mode?: 'cgst_sgst' | 'igst' | 'none';
  gst_percentage?: number;
  cgst_percentage?: number;
  sgst_percentage?: number;
  igst_percentage?: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  grandTotal: number;
  taxTypeSnapshot: 'cgst_sgst' | 'igst' | 'none';
  taxRateSnapshot: number;
}

/**
 * Helper to perform consistent 2-decimal currency rounding.
 */
export function roundCurrency(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates complete tax breakdown and grand total for an order or cart.
 *
 * @param subtotal Sum of item prices x quantities
 * @param discount Amount of discount applied (fixed value or calculated from offer)
 * @param settings Restaurant tax settings snapshot
 */
export function calculateOrderTax(
  subtotal: number,
  discount: number = 0,
  settings?: RestaurantTaxSettings | null
): TaxCalculationResult {
  const safeSubtotal = roundCurrency(Math.max(0, subtotal));
  const safeDiscount = roundCurrency(Math.min(safeSubtotal, Math.max(0, discount)));
  const taxableAmount = roundCurrency(Math.max(0, safeSubtotal - safeDiscount));

  const isGstEnabled = Boolean(settings?.gst_enabled);
  const taxMode = settings?.tax_mode || 'cgst_sgst';

  const totalGstRate = typeof settings?.gst_percentage === 'number' ? settings.gst_percentage : 2.5;

  let cgstPercentage = 0;
  let sgstPercentage = 0;
  let igstPercentage = 0;

  if (taxMode === 'igst') {
    igstPercentage = typeof settings?.igst_percentage === 'number' ? settings.igst_percentage : totalGstRate;
  } else {
    // Intrastate CGST + SGST mode
    if (typeof settings?.cgst_percentage === 'number' && typeof settings?.sgst_percentage === 'number') {
      cgstPercentage = settings.cgst_percentage;
      sgstPercentage = settings.sgst_percentage;
    } else {
      // Split total GST rate equally between CGST and SGST
      cgstPercentage = roundCurrency(totalGstRate / 2);
      sgstPercentage = roundCurrency(totalGstRate - cgstPercentage);
    }
  }

  if (!isGstEnabled || taxMode === 'none') {
    return {
      subtotal: safeSubtotal,
      discountTotal: safeDiscount,
      taxableAmount,
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      taxTotal: 0,
      grandTotal: taxableAmount,
      taxTypeSnapshot: 'none',
      taxRateSnapshot: 0
    };
  }

  if (taxMode === 'igst') {
    const igstAmount = roundCurrency((taxableAmount * igstPercentage) / 100);
    const taxTotal = igstAmount;
    const grandTotal = roundCurrency(taxableAmount + taxTotal);

    return {
      subtotal: safeSubtotal,
      discountTotal: safeDiscount,
      taxableAmount,
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      taxTotal,
      grandTotal,
      taxTypeSnapshot: 'igst',
      taxRateSnapshot: igstPercentage
    };
  }

  // Default mode: Intrastate CGST + SGST
  const totalGstAmount = roundCurrency((taxableAmount * (cgstPercentage + sgstPercentage)) / 100);
  let cgstAmount = roundCurrency((taxableAmount * cgstPercentage) / 100);
  let sgstAmount = roundCurrency((taxableAmount * sgstPercentage) / 100);

  // Guarantee cgstAmount + sgstAmount === totalGstAmount
  if (roundCurrency(cgstAmount + sgstAmount) !== totalGstAmount) {
    const diff = roundCurrency(totalGstAmount - (cgstAmount + sgstAmount));
    sgstAmount = roundCurrency(sgstAmount + diff);
  }

  const grandTotal = roundCurrency(taxableAmount + totalGstAmount);

  return {
    subtotal: safeSubtotal,
    discountTotal: safeDiscount,
    taxableAmount,
    cgstPercentage,
    sgstPercentage,
    igstPercentage: 0,
    cgstAmount,
    sgstAmount,
    igstAmount: 0,
    taxTotal: totalGstAmount,
    grandTotal,
    taxTypeSnapshot: 'cgst_sgst',
    taxRateSnapshot: roundCurrency(cgstPercentage + sgstPercentage)
  };
}
