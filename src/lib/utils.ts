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
 * Generates a deterministic 3-character alphanumeric code for a restaurant ID/name
 * if one is not explicitly configured in restaurant.settings.restaurant_code.
 */
export function getDeterministicRestaurantCode(restaurantIdOrName: string = ''): string {
  const clean = String(restaurantIdOrName).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean === 'THEFOODYHUBJAIPUR' || clean === 'FOODYHUBJAIPUR') return 'Q4M';
  if (clean === 'THEFOODYHUBDELHI' || clean === 'FOODYHUBDELHI') return 'X9R';
  if (clean.includes('81FA8201') || clean === 'THEFOODYHUBUDAIPUR' || clean === 'FOODYHUBUDAIPUR' || clean === 'FOODYHUB' || clean === 'THEFOODYHUB') {
    return 'A7K';
  }
  if (!clean) return 'A7K';
  
  const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 5381;
  for (let i = 0; i < clean.length; i++) {
    hash = ((hash << 5) + hash) ^ clean.charCodeAt(i);
  }
  const h1 = Math.abs(hash) % CHARSET.length;
  const h2 = Math.abs(Math.floor(hash / CHARSET.length)) % CHARSET.length;
  const h3 = Math.abs(Math.floor(hash / (CHARSET.length * CHARSET.length))) % CHARSET.length;
  return `${CHARSET[h1]}${CHARSET[h2]}${CHARSET[h3]}`;
}

/**
 * Formats order ID into standard production code:
 * Staff/Owner facing: <RestaurantCode>-<YY><Type><Sequence> (e.g. A7K-26T0001, A7K-26D0001)
 * Customer facing: #<YY><Type><Sequence> (e.g. Order #26T0001)
 */
export function getFormattedOrderId(
  order: any,
  restaurantName: string = '',
  allOrders: any[] = [],
  isCustomerFacing: boolean = false
): string {
  try {
    if (!order) {
      return isCustomerFacing ? 'Order #26D0001' : 'A7K-26D0001';
    }

    // Check if order already has a valid production display_order_id (e.g. A7K-26T0001)
    const existingCode = order.display_order_id || order.order_number;
    const match = existingCode && String(existingCode).match(/^([A-Z0-9]{3,4})-(\d{2}[DTRP]\d{4,})$/);
    if (match) {
      return isCustomerFacing ? `Order #${match[2]}` : `${match[1]}-${match[2]}`;
    }

    // 1. Restaurant Code (3 chars: A-Z, 0-9)
    let restCode = order.restaurant_code 
      || order.restaurant?.settings?.restaurant_code 
      || order.restaurant?.restaurant_code;

    if (!restCode) {
      const restKey = order.restaurant_id || order.restaurant?.id || restaurantName || 'The Foody Hub';
      restCode = getDeterministicRestaurantCode(restKey);
    }
    restCode = String(restCode).toUpperCase().slice(0, 4);

    // 2. Year: YY (2 digits)
    const orderDate = new Date(order.created_at || Date.now());
    const validDate = isNaN(orderDate.getTime()) ? new Date() : orderDate;
    const yy = String(validDate.getFullYear()).slice(-2);

    // 3. Type: D (Dine-In), T (Takeaway), R (Reservation), P (Punch)
    let typeChar = 'D';
    const rawType = String(order.order_type || '').toLowerCase();
    const rawTable = String(order.table_name || order.table?.name || '').toLowerCase();

    if (rawType === 'takeaway' || rawTable.includes('takeaway')) {
      typeChar = 'T';
    } else if (rawType === 'reservation' || rawTable.includes('reservation')) {
      typeChar = 'R';
    } else if (rawType === 'punch') {
      typeChar = 'P';
    } else {
      typeChar = 'D';
    }

    // 4. Restaurant Sequence (4 digits, annual sequence)
    let sequence = 1;
    if (order.daily_sequence || order.order_sequence || order.order_number) {
      sequence = Number(order.daily_sequence || order.order_sequence || order.order_number);
    } else if (Array.isArray(allOrders) && allOrders.length > 0) {
      const index = allOrders.findIndex(o => o?.id === order.id || o?.order_id === order.id);
      if (index >= 0) {
        sequence = index + 1;
      }
    } else if (order.id) {
      const numOnly = String(order.id).replace(/\D/g, '');
      sequence = numOnly ? (parseInt(numOnly.slice(-4), 10) || 1) : 1;
    }
    const seqStr = String(sequence).padStart(4, '0');

    const suffix = `${yy}${typeChar}${seqStr}`;

    if (isCustomerFacing) {
      return `Order #${suffix}`;
    }

    return `${restCode}-${suffix}`;
  } catch (err) {
    return isCustomerFacing ? 'Order #26D0001' : 'A7K-26D0001';
  }
}

/**
 * Returns customer-facing order ID hiding the internal restaurant code:
 * Example: Order #26T0001
 */
export function getCustomerFacingOrderId(order: any, restaurantName: string = '', allOrders: any[] = []): string {
  return getFormattedOrderId(order, restaurantName, allOrders, true);
}

/**
 * Parses customer name, phone, notes and arrival minutes from order object
 * across structured columns and special_instructions.
 */
export function parseCustomerDetailsFromOrder(order: any): {
  name: string;
  phone: string;
  notes: string;
  arrivalMinutes?: number;
} {
  if (!order) return { name: '', phone: '', notes: '' };

  let name = order.customer_name || order.customerName || '';
  let phone = order.customer_phone || order.customerPhone || order.phone || '';
  let notes = order.takeaway_notes || order.customer_note || order.customerNote || '';
  let arrivalMinutes = order.customer_arrival_minutes || order.arrivalMinutes;

  const textBlob = `${order.special_instructions || ''} | ${order.customer_notes || ''} | ${order.notes || ''}`;

  if (!name) {
    const nameMatch = textBlob.match(/(?:CUSTOMER|Name|Guest):\s*([^|]+)/i);
    if (nameMatch) name = nameMatch[1].trim();
  }
  if (!phone) {
    const phoneMatch = textBlob.match(/(?:PHONE|Contact|Mobile):\s*([^|]+)/i);
    if (phoneMatch) phone = phoneMatch[1].trim();
  }
  if (!notes) {
    const notesMatch = textBlob.match(/(?:NOTES|Notes):\s*([^|]+)/i);
    if (notesMatch) notes = notesMatch[1].trim();
  }
  if (!arrivalMinutes) {
    const arrivalMatch = textBlob.match(/ARRIVAL:\s*(\d+)/i);
    if (arrivalMatch) arrivalMinutes = parseInt(arrivalMatch[1], 10);
  }

  return { name, phone, notes, arrivalMinutes };
}

/**
 * Universal search matcher for Orders across Live Orders, KDS, Billing, and Reports.
 * Matches full ID (A7K-26T0043), short ID (26T0043), sequence (0043),
 * customer name, phone, table number, and items.
 */
export function matchesOrderSearchQuery(
  order: any,
  query: string,
  restaurantName: string = '',
  allOrders: any[] = []
): boolean {
  if (!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();
  const qClean = q.replace(/^#/, '');

  const fullId = getFormattedOrderId(order, restaurantName, allOrders, false).toLowerCase();
  const shortId = fullId.split('-')[1] || fullId;
  const seqOnly = shortId.replace(/^[0-9]{2}[A-Z]/i, '');

  if (fullId.includes(q) || fullId.includes(qClean)) return true;
  if (shortId.includes(q) || shortId.includes(qClean)) return true;
  if (seqOnly && (seqOnly.includes(qClean) || parseInt(seqOnly, 10) === parseInt(qClean, 10))) return true;

  if (order.id && String(order.id).toLowerCase().includes(q)) return true;

  const cust = parseCustomerDetailsFromOrder(order);
  if (cust.name && cust.name.toLowerCase().includes(q)) return true;
  if (cust.phone && cust.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))) return true;

  const tblNum = order.table_number || order.table?.table_number;
  const tblName = String(order.table_name || order.table?.name || '').toLowerCase();
  const tblDisplay = tblNum ? `table ${tblNum}` : '';
  if (tblName && (tblName.includes(q) || q.includes(tblName))) return true;
  if (tblNum && (String(tblNum) === qClean || tblDisplay.includes(q) || q.includes(tblDisplay))) return true;

  // Match items
  if (Array.isArray(order.items)) {
    if (order.items.some((it: any) => (it.menu_item_name || it.name || '').toLowerCase().includes(q))) {
      return true;
    }
  }

  return false;
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

