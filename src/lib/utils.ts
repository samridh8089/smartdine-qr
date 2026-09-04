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

/**
 * Formats order ID into standard unique code: <RestaurantPrefix>-DDMMYY-T<TableNo>-<Sequence>-<Checksum>
 * Example: TIU-250826-T07-000123-4G
 */
export function getFormattedOrderId(order: any, restaurantName: string = '', allOrders: any[] = []): string {
  try {
    if (!order) return 'CLR-010126-T01-000001-A1';

    if (order.order_number && /^[A-Z0-9]{3}-\d{6}-[A-Z0-9]{3,4}-\d{6}-[A-Z0-9]{2}$/.test(order.order_number)) {
      return order.order_number;
    }

    // 1. Prefix (3 chars)
    let rawPrefixSource = '';
    if (order.restaurant_id) {
      rawPrefixSource = String(order.restaurant_id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    } else if (order.restaurant?.id) {
      rawPrefixSource = String(order.restaurant.id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    }

    if (rawPrefixSource.length < 3) {
      const rName = (restaurantName || order.restaurant_name || order.restaurant?.name || 'CleverOps').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      rawPrefixSource = (rawPrefixSource + rName + 'CLR').slice(0, 3);
    }
    const prefix = rawPrefixSource.slice(0, 3);

    // 2. Date: DDMMYY
    const orderDate = new Date(order.created_at || Date.now());
    const validDate = isNaN(orderDate.getTime()) ? new Date() : orderDate;
    const dd = String(validDate.getDate()).padStart(2, '0');
    const mm = String(validDate.getMonth() + 1).padStart(2, '0');
    const yy = String(validDate.getFullYear()).slice(-2);
    const dateStr = `${dd}${mm}${yy}`;

    // 3. Table: T<TableNo> or TAK / RES
    let tableStr = 'T01';
    if (order.order_type === 'takeaway') {
      tableStr = 'TAK';
    } else if (order.order_type === 'reservation') {
      tableStr = 'RES';
    } else {
      const rawTable = order.table_number || order.table_name || order.table?.name || '1';
      const numMatch = String(rawTable).match(/\d+/);
      const tableNum = numMatch ? parseInt(numMatch[0], 10) : 1;
      tableStr = `T${String(tableNum).padStart(2, '0')}`;
    }

    // 4. Restaurant Sequence (6 digits)
    let sequence = 1;
    if (order.daily_sequence || order.order_sequence) {
      sequence = Number(order.daily_sequence || order.order_sequence);
    } else if (Array.isArray(allOrders) && allOrders.length > 0) {
      const index = allOrders.findIndex(o => o?.id === order.id || o?.order_id === order.id);
      if (index >= 0) {
        sequence = index + 1;
      }
    } else if (order.id) {
      const numOnly = String(order.id).replace(/\D/g, '');
      sequence = numOnly ? (parseInt(numOnly.slice(-6), 10) || 1) : 1;
    }
    const seqStr = String(sequence).padStart(6, '0');

    // 5. Checksum (2 chars)
    const combined = `${prefix}${dateStr}${tableStr}${seqStr}`;
    let sum1 = 0;
    let sum2 = 0;
    for (let i = 0; i < combined.length; i++) {
      const code = combined.charCodeAt(i);
      sum1 = (sum1 + code * (i + 1)) % 36;
      sum2 = (sum2 + code * (i + 7)) % 36;
    }
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const checksum = `${chars[sum1]}${chars[sum2]}`;

    return `${prefix}-${dateStr}-${tableStr}-${seqStr}-${checksum}`;
  } catch (err) {
    return 'CLR-230826-T01-000001-A1';
  }
}

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

