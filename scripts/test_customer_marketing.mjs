import { createClient } from '@supabase/supabase-js';

// 1. Logic Verification
function cleanIndianMobileNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
}

function validateIndianMobileNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, cleaned: '', error: 'Mobile number is required' };
  }
  const cleaned = cleanIndianMobileNumber(phone);
  if (cleaned.length === 0) {
    return { valid: false, cleaned, error: 'Mobile number cannot be empty' };
  }
  if (cleaned.length !== 10) {
    return { valid: false, cleaned, error: 'Mobile number must be exactly 10 digits' };
  }
  if (!/^[6-9]/.test(cleaned)) {
    return { valid: false, cleaned, error: 'Mobile number must start with 6, 7, 8, or 9' };
  }
  if (/^(\d)\1{9}$/.test(cleaned)) {
    return { valid: false, cleaned, error: 'Invalid dummy mobile number (all repeating digits)' };
  }
  const knownDummies = new Set([
    '1234567890', '9876543210', '0123456789', '9012345678', '8901234567',
    '7890123456', '6789012345', '9876543211', '9123456789', '9999988888',
    '8888899999', '9898989898', '9090909090', '9191919191', '9292929292',
    '8989898989', '7878787878', '6767676767'
  ]);
  if (knownDummies.has(cleaned)) {
    return { valid: false, cleaned, error: 'Invalid dummy mobile number' };
  }
  const counts = {};
  for (const d of cleaned) {
    counts[d] = (counts[d] || 0) + 1;
    if (counts[d] >= 8) {
      return { valid: false, cleaned, error: 'Invalid fake number (too many repeating digits)' };
    }
  }
  return { valid: true, cleaned };
}

function parseCustomerDetailsFromOrder(order) {
  if (!order) return { name: '', phone: '', notes: '' };
  let name = order.customer_name || order.customerName || '';
  let phone = order.customer_phone || order.customerPhone || order.phone || '';
  let notes = order.takeaway_notes || order.customer_note || order.customerNote || '';

  const textBlob = `${order.special_instructions || ''} | ${order.customer_notes || ''} | ${order.notes || ''}`;

  if (!name) {
    const nameMatch = textBlob.match(/(?:CUSTOMER|Name|Guest):\s*([^|•\n]+)/i);
    if (nameMatch) {
      name = nameMatch[1].trim();
    }
  }
  if (!phone) {
    const phoneMatch = textBlob.match(/(?:PHONE|Contact|Mobile):\s*([^|•\n\)]+)/i);
    if (phoneMatch) phone = phoneMatch[1].trim();
  }
  if (name && !phone) {
    const embeddedPhone = name.match(/\((?:[+]?91[\s\-]?)?([6-9]\d{9})\)/);
    if (embeddedPhone) {
      phone = embeddedPhone[1];
      name = name.replace(/\s*\([^)]*\)/g, '').trim();
    }
  }
  if (!phone && notes) {
    const cleanNotePhone = notes.replace(/\D/g, '');
    if (cleanNotePhone.length === 10 && /^[6-9]/.test(cleanNotePhone)) {
      phone = cleanNotePhone;
    }
  }
  if (!phone) {
    const standaloneMatch = textBlob.match(/\b([6-9]\d{9})\b/);
    if (standaloneMatch) {
      phone = standaloneMatch[1];
    }
  }
  if (name) {
    name = name.replace(/^(?:CUSTOMER|Customer|Guest|Name):\s*/i, '').replace(/\s*\([^)]*\)/g, '').trim();
  }
  if (phone) {
    phone = cleanIndianMobileNumber(phone);
  }
  return { name, phone, notes };
}

console.log('=== TEST 1: REJECTING FAKE / DUMMY NUMBERS ===');
const fakes = ['9999999999', '8888888888', '1234567890', '9876543210', '99999999999', '89786756456', '87654444444445', '9899999999'];
fakes.forEach(f => {
  const r = validateIndianMobileNumber(f);
  console.log(`Input "${f}" -> Valid: ${r.valid} | Error: ${r.error}`);
});

console.log('\n=== TEST 2: ACCEPTING VALID INDIAN MOBILES ===');
const valids = ['8949277886', '+91 8949277886', '08949277886', '9823456789', '7838123456'];
valids.forEach(v => {
  const r = validateIndianMobileNumber(v);
  console.log(`Input "${v}" -> Valid: ${r.valid} | Cleaned: ${r.cleaned}`);
});

async function main() {
  console.log('\n=== TEST 3: EXTRACTING FROM REAL ORDERS TABLE ===');
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: orders } = await s.from('orders').select('id, special_instructions, takeaway_notes, order_type, total, created_at').order('created_at', { ascending: false }).limit(60);

  const leads = {};
  for (const o of orders) {
    const cust = parseCustomerDetailsFromOrder(o);
    const val = validateIndianMobileNumber(cust.phone);
    if (val.valid) {
      if (!leads[val.cleaned]) {
        leads[val.cleaned] = {
          name: cust.name || 'Guest',
          phone: val.cleaned,
          types: new Set([o.order_type || 'dine_in']),
          orders: 1,
          spent: Number(o.total || 0),
          lastVisit: o.created_at
        };
      } else {
        leads[val.cleaned].orders++;
        leads[val.cleaned].spent += Number(o.total || 0);
        leads[val.cleaned].types.add(o.order_type || 'dine_in');
        if (cust.name && cust.name !== 'Guest') leads[val.cleaned].name = cust.name;
      }
    }
  }

  console.log(`Total verified CRM marketing leads found: ${Object.keys(leads).length}`);
  Object.values(leads).forEach((l, i) => {
    console.log(`${i+1}. ${l.name} | +91 ${l.phone} | Channels: [${Array.from(l.types).join(', ')}] | Visits: ${l.orders} | Net Spend: ₹${l.spent.toFixed(2)}`);
  });
}

main().catch(console.error);
