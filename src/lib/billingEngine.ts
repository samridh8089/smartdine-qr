import { calculateOrderTax, RestaurantTaxSettings } from './tax';

export interface BillingItem {
  price: number;
  quantity: number;
  is_cancelled?: boolean;
  status?: string;
  notes?: string;
  batch_id?: string;
}

export interface BillingBatch {
  id: string;
  status: string;
  special_instructions?: string;
}

export interface CustomCharge {
  name: string;
  type: 'percentage' | 'flat' | 'fixed';
  value: number;
  enabled?: boolean;
  taxable?: boolean;
}

export interface BillingInput {
  items: BillingItem[];
  batches?: BillingBatch[];
  discountAmount?: number;
  offerCode?: string;
  specialInstructions?: string;
  offers?: any[];
  gstEnabled?: boolean;
  gstPercentage?: number;
  serviceChargeEnabled?: boolean;
  serviceChargePercentage?: number;
  customCharges?: CustomCharge[];
  settings?: RestaurantTaxSettings | any;
  gstNumber?: string;
}

export interface BillingResult {
  // Existing fields for 100% backward compatibility
  validSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  taxableCustomChargesTotal: number;
  nonTaxableCustomChargesTotal: number;
  customChargesTotal: number;
  taxableBase: number;
  gstAmount: number;
  serviceChargeAmount: number;
  grandTotal: number;
  customChargesSnapshot: Array<{
    name: string;
    type: string;
    value: number;
    calculatedAmount: number;
    taxable: boolean;
  }>;

  // New detailed tax fields for complete parity with tax.ts
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  taxType: 'cgst_sgst' | 'igst' | 'none';
  taxMode: 'cgst_sgst' | 'igst' | 'none';
  taxRateSnapshot: number;

  // Future-proof alias fields
  subtotal: number;
  discount: number;
  taxableSubtotal: number;
  gst: number;
  serviceCharge: number;
  taxableCustomCharges: number;
  nonTaxableCustomCharges: number;
  customCharges: number;
  roundOff: number;

  // Breakdown metadata object
  breakdown: {
    subtotal: number;
    discount: number;
    discountedSubtotal: number;
    taxableSubtotal: number;
    gst: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    serviceCharge: number;
    taxableCustomCharges: number;
    nonTaxableCustomCharges: number;
    customCharges: number;
    roundOff: number;
    grandTotal: number;
  };
}

export function calculateBillingTotals(input: BillingInput): BillingResult {
  const {
    items = [],
    batches = [],
    discountAmount = 0,
    offerCode,
    specialInstructions,
    offers,
    gstEnabled = true,
    gstPercentage = 0,
    serviceChargeEnabled = true,
    serviceChargePercentage = 0,
    customCharges = []
  } = input;

  let totalValidSubtotal = 0;
  let totalDiscountAmount = 0;

  // Process per-batch if batches array is provided
  if (batches && batches.length > 0) {
    batches.forEach((b, idx) => {
      const batchNum = (b as any).batch_number || idx + 1;
      const isBatchCancelled = b.status === 'cancelled' || b.special_instructions?.includes('[CANCELLED]');

      if (isBatchCancelled) {
        // Cancelled batch contributes 0 subtotal, 0 promo, 0 tax
        return;
      }

      // Filter non-cancelled items belonging to this batch
      const batchItems = items.filter(item => {
        if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return false;
        if (item.batch_id) return item.batch_id === b.id;
        // If item has no batch_id, default to Batch #1
        return batchNum === 1;
      });

      const bSubtotal = batchItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
      if (bSubtotal <= 0) return;

      totalValidSubtotal += bSubtotal;

      // Determine promo code & persisted discount value for this batch
      let bCode: string | undefined = undefined;
      let bPersistedVal: number | undefined = undefined;

      // 1. Inspect batch.special_instructions
      const bInst = b.special_instructions || '';
      const bCodeMatch = bInst.match(/PROMO OFFER (?:APPLIED: )?([A-Z0-9]+)/i) || bInst.match(/🏷️ PROMO OFFER: ([A-Z0-9]+)/i);
      if (bCodeMatch && bCodeMatch[1]) {
        bCode = bCodeMatch[1];
      }

      const bValMatch = bInst.match(/-\s*₹\s*(\d+(?:\.\d+)?)/);
      if (bValMatch && bValMatch[1]) {
        bPersistedVal = parseFloat(bValMatch[1]);
      }

      // 2. Inspect parent specialInstructions for [Batch #N]
      if (!bCode && specialInstructions) {
        const parentBatchMatch = specialInstructions.match(new RegExp(`\\[Batch #${batchNum}\\]:[^]*?PROMO OFFER: ([A-Z0-9]+)`, 'i'));
        if (parentBatchMatch && parentBatchMatch[1]) {
          bCode = parentBatchMatch[1];
        }

        const parentValMatch = specialInstructions.match(new RegExp(`\\[Batch #${batchNum}\\]:[^]*?-\\s*₹\\s*(\\d+(?:\\.\\d+)?)`, 'i'));
        if (parentValMatch && parentValMatch[1]) {
          bPersistedVal = parseFloat(parentValMatch[1]);
        }
      }

      // 3. Fallback for Batch #1 if offerCode/discountAmount provided at top level
      if (!bCode && batchNum === 1 && offerCode) {
        bCode = offerCode;
      }
      if (bPersistedVal === undefined && batchNum === 1 && discountAmount > 0) {
        bPersistedVal = discountAmount;
      }

      // Compute discount for this batch
      let bDiscAmt = 0;
      if (bCode && offers && offers.length > 0) {
        const matchedOffer = offers.find(o => o.code?.toUpperCase() === bCode?.toUpperCase());
        if (matchedOffer && bSubtotal >= (matchedOffer.min_order_amount || 0)) {
          if (matchedOffer.discount_type === 'percentage') {
            bDiscAmt = parseFloat(((bSubtotal * Number(matchedOffer.discount_value)) / 100).toFixed(2));
          } else {
            bDiscAmt = Math.min(Number(matchedOffer.discount_value), bSubtotal);
          }
        }
      }

      if (bDiscAmt === 0 && bPersistedVal && bPersistedVal > 0) {
        bDiscAmt = Math.min(bPersistedVal, bSubtotal);
      }

      bDiscAmt = Math.min(bSubtotal, Math.max(0, bDiscAmt));
      totalDiscountAmount += bDiscAmt;
    });
  } else {
    // Single batch or raw items without batches array
    const validItems = items.filter(item => {
      if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return false;
      return true;
    });

    totalValidSubtotal = validItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

    let discAmt = Math.max(0, Number(discountAmount || 0));
    const parsedCode = offerCode || specialInstructions?.match(/PROMO OFFER (?:APPLIED: )?([A-Z0-9]+)/)?.[1];

    if (parsedCode && offers && offers.length > 0) {
      const matchedOffer = offers.find(o => o.code?.toUpperCase() === parsedCode.toUpperCase());
      if (matchedOffer && totalValidSubtotal >= (matchedOffer.min_order_amount || 0)) {
        if (matchedOffer.discount_type === 'percentage') {
          discAmt = parseFloat(((totalValidSubtotal * Number(matchedOffer.discount_value)) / 100).toFixed(2));
        } else {
          discAmt = Math.min(Number(matchedOffer.discount_value), totalValidSubtotal);
        }
      }
    }

    if (discAmt === 0 && specialInstructions) {
      const match = specialInstructions.match(/-\s*₹\s*(\d+(?:\.\d+)?)/);
      if (match && match[1]) {
        const parsedVal = parseFloat(match[1]);
        if (!isNaN(parsedVal) && parsedVal > 0) {
          discAmt = Math.min(parsedVal, totalValidSubtotal);
        }
      }
    }

    discAmt = Math.min(totalValidSubtotal, Math.max(0, discAmt));
    totalDiscountAmount = discAmt;
  }

  const validSubtotal = parseFloat(totalValidSubtotal.toFixed(2));
  const finalDiscountAmount = parseFloat(totalDiscountAmount.toFixed(2));
  const discountedSubtotal = Math.max(0, parseFloat((validSubtotal - finalDiscountAmount).toFixed(2)));

  // 4. Custom charges (Separating Taxable vs Non-Taxable charges)
  let taxableCustomChargesTotal = 0;
  let nonTaxableCustomChargesTotal = 0;

  const customChargesSnapshot = customCharges
    .filter(c => c.enabled !== false)
    .map(c => {
      const calculatedAmount = c.type === 'percentage'
        ? parseFloat(((discountedSubtotal * Number(c.value)) / 100).toFixed(2))
        : Number(c.value);

      const isTaxable = c.taxable !== false; // Default to taxable if not explicitly set to false
      if (isTaxable) {
        taxableCustomChargesTotal += calculatedAmount;
      } else {
        nonTaxableCustomChargesTotal += calculatedAmount;
      }

      return {
        name: c.name,
        type: c.type,
        value: Number(c.value),
        calculatedAmount,
        taxable: isTaxable
      };
    });

  const customChargesTotal = taxableCustomChargesTotal + nonTaxableCustomChargesTotal;

  // 5. Taxable Base (Subtotal after discount + ONLY Taxable Custom Charges)
  const taxableBase = discountedSubtotal + taxableCustomChargesTotal;

  // 6. GST & Service Charge Calculation via Authoritative Tax Engine
  const effectiveSettings: RestaurantTaxSettings = {
    ...(input.settings || {}),
    gst_enabled: input.settings?.gst_enabled !== undefined
      ? input.settings.gst_enabled
      : (input.gstEnabled !== undefined ? input.gstEnabled : undefined),
    tax_mode: input.settings?.tax_mode || 'cgst_sgst',
    gst_percentage: input.settings?.gst_percentage !== undefined
      ? input.settings.gst_percentage
      : (input.gstPercentage !== undefined ? input.gstPercentage : undefined),
    cgst_percentage: input.settings?.cgst_percentage,
    sgst_percentage: input.settings?.sgst_percentage,
    igst_percentage: input.settings?.igst_percentage,
    gst_number: input.gstNumber || input.settings?.gst_number
  };

  const taxResult = calculateOrderTax(
    taxableBase,
    0,
    effectiveSettings,
    effectiveSettings.gst_number
  );

  const gstAmount = taxResult.taxTotal;

  const isScEnabled = serviceChargeEnabled !== false && (input.settings?.service_charge_enabled !== false);
  const scPct = isScEnabled ? (serviceChargePercentage || input.settings?.service_charge_percentage || 0) : 0;
  const serviceChargeAmount = parseFloat(((taxableBase * scPct) / 100).toFixed(2));

  // 7. Grand Total
  const grandTotal = parseFloat((discountedSubtotal + customChargesTotal + gstAmount + serviceChargeAmount).toFixed(2));

  const subtotalVal = parseFloat(validSubtotal.toFixed(2));
  const discountVal = parseFloat(finalDiscountAmount.toFixed(2));
  const discountedSubtotalVal = parseFloat(discountedSubtotal.toFixed(2));
  const taxableCustomChargesVal = parseFloat(taxableCustomChargesTotal.toFixed(2));
  const nonTaxableCustomChargesVal = parseFloat(nonTaxableCustomChargesTotal.toFixed(2));
  const customChargesVal = parseFloat(customChargesTotal.toFixed(2));
  const taxableSubtotalVal = parseFloat(taxableBase.toFixed(2));
  const gstVal = gstAmount;
  const serviceChargeVal = serviceChargeAmount;
  const roundOffVal = 0;
  const grandTotalVal = grandTotal;

  const breakdownObj = {
    subtotal: subtotalVal,
    discount: discountVal,
    discountedSubtotal: discountedSubtotalVal,
    taxableSubtotal: taxableSubtotalVal,
    gst: gstVal,
    cgstAmount: taxResult.cgstAmount,
    sgstAmount: taxResult.sgstAmount,
    igstAmount: taxResult.igstAmount,
    serviceCharge: serviceChargeVal,
    taxableCustomCharges: taxableCustomChargesVal,
    nonTaxableCustomCharges: nonTaxableCustomChargesVal,
    customCharges: customChargesVal,
    roundOff: roundOffVal,
    grandTotal: grandTotalVal
  };

  return {
    validSubtotal: subtotalVal,
    discountAmount: discountVal,
    discountedSubtotal: discountedSubtotalVal,
    taxableCustomChargesTotal: taxableCustomChargesVal,
    nonTaxableCustomChargesTotal: nonTaxableCustomChargesVal,
    customChargesTotal: customChargesVal,
    taxableBase: taxableSubtotalVal,
    gstAmount: gstVal,
    cgstAmount: taxResult.cgstAmount,
    sgstAmount: taxResult.sgstAmount,
    igstAmount: taxResult.igstAmount,
    cgstPercentage: taxResult.cgstPercentage,
    sgstPercentage: taxResult.sgstPercentage,
    igstPercentage: taxResult.igstPercentage,
    taxType: taxResult.taxTypeSnapshot,
    taxMode: taxResult.taxTypeSnapshot,
    taxRateSnapshot: taxResult.taxRateSnapshot,
    serviceChargeAmount: serviceChargeVal,
    grandTotal: grandTotalVal,
    customChargesSnapshot,

    // Alias fields
    subtotal: subtotalVal,
    discount: discountVal,
    taxableSubtotal: taxableSubtotalVal,
    gst: gstVal,
    serviceCharge: serviceChargeVal,
    taxableCustomCharges: taxableCustomChargesVal,
    nonTaxableCustomCharges: nonTaxableCustomChargesVal,
    customCharges: customChargesVal,
    roundOff: roundOffVal,

    breakdown: breakdownObj
  };
}
