// General Utilities for SmartDine QR

export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Formats a number as Indian Rupee (INR) currency with standard en-IN numbering formats.
 * e.g., 150000 -> ₹1,50,000.00
 */
export function formatPrice(price: number, currency = 'INR', decimals?: number): string {
  const fractionDigits = decimals !== undefined ? decimals : (Number.isInteger(price) ? 0 : 2);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(price);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Re-export shared core business logic from packages/core
export {
  getDeterministicRestaurantCode,
  getFormattedOrderId,
  getCustomerFacingOrderId,
  parseCustomerDetailsFromOrder,
  matchesOrderSearchQuery
} from '../../packages/core';

export function getCleanSpecialInstructions(order?: any, batch?: any): string {
  const parts: string[] = [];

  const addPart = (val?: string) => {
    if (!val || typeof val !== 'string') return;
    const cleaned = val
      .replace(/^\[Batch #\d+\]:\s*/gi, '')
      .replace(/\[CANCELLED\].*/gi, '')
      .replace(/PROMO OFFER:.*/gi, '')
      .trim();
    if (cleaned && !parts.includes(cleaned)) {
      parts.push(cleaned);
    }
  };

  if (batch?.special_instructions) addPart(batch.special_instructions);
  if (order?.special_instructions) addPart(order.special_instructions);

  if (order?.batches && Array.isArray(order.batches)) {
    order.batches.forEach((b: any) => {
      if (b?.special_instructions) addPart(b.special_instructions);
    });
  }

  const items = batch?.items || batch?.order_items || order?.items || order?.order_items || [];
  if (Array.isArray(items)) {
    items.forEach((it: any) => {
      if (it?.notes) addPart(it.notes);
    });
  }

  return parts.join(' | ');
}

// Re-export shared booking logic from packages/core
export {
  parseTimeToMinutes,
  checkBookingOverlap
} from '../../packages/core';

/**
 * Computes live elapsed timer from a server timestamp (e.g. ISO string or timestamp).
 * Under 1 hour: MM:SS
 * Above 1 hour: HH:MM:SS
 * Never resets after refresh because it strictly calculates from server timestamp.
 */
export function formatLiveTimer(serverTimestamp?: string | number | null, now?: number): string {
  if (!serverTimestamp) return '00:00';
  const start = typeof serverTimestamp === 'number' ? serverTimestamp : new Date(serverTimestamp).getTime();
  if (isNaN(start) || start <= 0) return '00:00';
  const current = now || Date.now();
  const totalSeconds = Math.max(0, Math.floor((current - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

