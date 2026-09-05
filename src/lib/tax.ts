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
  gst_number?: string;
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
 * Authoritative check whether GST is active for a given restaurant configuration.
 */
export function isGstActive(
  settings?: RestaurantTaxSettings | any | null,
  gstNumber?: string | null
): boolean {
  if (!settings) return false;
  if (settings.gst_enabled === false) return false;
  if (settings.tax_mode === 'none') return false;
  if (settings.gst_enabled === true) return true;

  // When gst_enabled is undefined / not explicitly configured:
  // If GST number is present, or positive GST/CGST percentage is configured, treat as enabled.
  const gstNum = gstNumber || settings.gst_number;
  if (gstNum && String(gstNum).trim().length > 0) return true;
  if (typeof settings.gst_percentage === 'number' && settings.gst_percentage > 0) return true;
  if (typeof settings.cgst_percentage === 'number' && settings.cgst_percentage > 0) return true;

  return false;
}

/**
 * Authoritative tax rate resolver.
 */
export function getTaxRates(
  settings?: RestaurantTaxSettings | any | null,
  gstNumber?: string | null
): {
  active: boolean;
  taxMode: 'cgst_sgst' | 'igst' | 'none';
  totalRate: number;
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
} {
  const active = isGstActive(settings, gstNumber);
  if (!active) {
    return {
      active: false,
      taxMode: 'none',
      totalRate: 0,
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage: 0
    };
  }

  const taxMode: 'cgst_sgst' | 'igst' = settings?.tax_mode === 'igst' ? 'igst' : 'cgst_sgst';

  if (taxMode === 'igst') {
    const igstRate = typeof settings?.igst_percentage === 'number'
      ? settings.igst_percentage
      : (typeof settings?.gst_percentage === 'number' ? settings.gst_percentage : 5.0);
    return {
      active: true,
      taxMode: 'igst',
      totalRate: igstRate,
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage: igstRate
    };
  }

  // Intrastate CGST + SGST mode
  let cgstPercentage = 0;
  let sgstPercentage = 0;

  if (typeof settings?.cgst_percentage === 'number' && typeof settings?.sgst_percentage === 'number') {
    cgstPercentage = settings.cgst_percentage;
    sgstPercentage = settings.sgst_percentage;
  } else if (typeof settings?.gst_percentage === 'number') {
    cgstPercentage = roundCurrency(settings.gst_percentage / 2);
    sgstPercentage = roundCurrency(settings.gst_percentage - cgstPercentage);
  } else {
    // Default standard restaurant GST: 5% (2.5% CGST + 2.5% SGST)
    cgstPercentage = 2.5;
    sgstPercentage = 2.5;
  }

  return {
    active: true,
    taxMode: 'cgst_sgst',
    totalRate: roundCurrency(cgstPercentage + sgstPercentage),
    cgstPercentage,
    sgstPercentage,
    igstPercentage: 0
  };
}

/**
 * Calculates complete tax breakdown and grand total for an order or cart.
 *
 * @param subtotal Sum of item prices x quantities
 * @param discount Amount of discount applied (fixed value or calculated from offer)
 * @param settings Restaurant tax settings snapshot
 * @param gstNumber Optional GST identification number
 */
export function calculateOrderTax(
  subtotal: number,
  discount: number = 0,
  settings?: RestaurantTaxSettings | any | null,
  gstNumber?: string | null
): TaxCalculationResult {
  const safeSubtotal = roundCurrency(Math.max(0, subtotal));
  const safeDiscount = roundCurrency(Math.min(safeSubtotal, Math.max(0, discount)));
  const taxableAmount = roundCurrency(Math.max(0, safeSubtotal - safeDiscount));

  const rates = getTaxRates(settings, gstNumber);

  if (!rates.active || rates.taxMode === 'none') {
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

  if (rates.taxMode === 'igst') {
    const igstAmount = roundCurrency((taxableAmount * rates.igstPercentage) / 100);
    const taxTotal = igstAmount;
    const grandTotal = roundCurrency(taxableAmount + taxTotal);

    return {
      subtotal: safeSubtotal,
      discountTotal: safeDiscount,
      taxableAmount,
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage: rates.igstPercentage,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
      taxTotal,
      grandTotal,
      taxTypeSnapshot: 'igst',
      taxRateSnapshot: rates.igstPercentage
    };
  }

  // Default mode: Intrastate CGST + SGST
  const totalGstAmount = roundCurrency((taxableAmount * rates.totalRate) / 100);
  let cgstAmount = roundCurrency((taxableAmount * rates.cgstPercentage) / 100);
  let sgstAmount = roundCurrency((taxableAmount * rates.sgstPercentage) / 100);

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
    cgstPercentage: rates.cgstPercentage,
    sgstPercentage: rates.sgstPercentage,
    igstPercentage: 0,
    cgstAmount,
    sgstAmount,
    igstAmount: 0,
    taxTotal: totalGstAmount,
    grandTotal,
    taxTypeSnapshot: 'cgst_sgst',
    taxRateSnapshot: rates.totalRate
  };
}
