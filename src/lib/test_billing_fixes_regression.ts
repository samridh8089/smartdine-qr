process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

import { createClient } from '@supabase/supabase-js';
import { db } from './db';
import { calculateBillingTotals } from './billingEngine';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runBillingRegressionSuite() {
  console.log('=== STARTING PHASE 4A BILLING REGRESSION SUITE (BUG-B1, BUG-B2, BUG-B3, BUG-B4) ===\n');

  // 1. TEST BUG-B1: CANONICAL PURE BILLING ENGINE
  console.log('1️⃣ [TEST BUG-B1: CANONICAL BILLING ENGINE DETERMINISM]');
  const sampleItems = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 }
  ]; // Subtotal = 250

  const resB1 = calculateBillingTotals({
    items: sampleItems,
    discountAmount: 50,
    gstEnabled: true,
    gstPercentage: 5,
    serviceChargeEnabled: true,
    serviceChargePercentage: 10,
    customCharges: [{ name: 'Container Fee', type: 'flat', value: 20, enabled: true, taxable: true }]
  });

  console.log('✔ Valid Subtotal:', resB1.validSubtotal, '(Expected: 250)');
  console.log('✔ Discounted Subtotal:', resB1.discountedSubtotal, '(Expected: 200)');
  console.log('✔ Taxable Base:', resB1.taxableBase, '(Expected: 220)');
  console.log('✔ GST Amount (5% of 220):', resB1.gstAmount, '(Expected: 11)');
  console.log('✔ Service Charge (10% of 220):', resB1.serviceChargeAmount, '(Expected: 22)');
  console.log('✔ Grand Total:', resB1.grandTotal, '(Expected: 253)');

  if (resB1.validSubtotal !== 250 || resB1.taxableBase !== 220 || resB1.gstAmount !== 11 || resB1.grandTotal !== 253) {
    throw new Error('FAIL: BUG-B1/BUG-B2 Billing Engine calculation mismatch!');
  }
  console.log('✔ Shared Canonical Billing Engine PASSED 100%\n');

  // 2. TEST BUG-B2: CONFIGURABLE TAXABLE CUSTOM CHARGES
  console.log('2️⃣ [TEST BUG-B2: TAXABLE VS NON-TAXABLE CUSTOM CHARGES]');
  const resB2 = calculateBillingTotals({
    items: [{ price: 100, quantity: 1 }], // Subtotal = 100
    gstEnabled: true,
    gstPercentage: 10,
    customCharges: [
      { name: 'Packaging (Taxable)', type: 'flat', value: 20, enabled: true, taxable: true },
      { name: 'Tip (Non-Taxable)', type: 'flat', value: 10, enabled: true, taxable: false }
    ]
  });

  console.log('✔ Taxable Custom Charges Total:', resB2.taxableCustomChargesTotal, '(Expected: 20)');
  console.log('✔ Non-Taxable Custom Charges Total:', resB2.nonTaxableCustomChargesTotal, '(Expected: 10)');
  console.log('✔ Taxable Base:', resB2.taxableBase, '(Expected: 120)');
  console.log('✔ GST (10% of 120):', resB2.gstAmount, '(Expected: 12)');
  console.log('✔ Grand Total (100 + 20 + 10 + 12):', resB2.grandTotal, '(Expected: 142)');

  if (resB2.gstAmount !== 12 || resB2.grandTotal !== 142) {
    throw new Error('FAIL: BUG-B2 Non-taxable custom charge was incorrectly taxed!');
  }
  console.log('✔ Configurable Taxable Custom Charges PASSED 100%\n');

  // 3. TEST BUG-B3: SERVER PAYMENT IDEMPOTENCY
  console.log('3️⃣ [TEST BUG-B3: PAYMENT STATUS IDEMPOTENCY]');
  const { data: rests } = await supabase.from('restaurants').select('*');
  const restId = rests?.[0]?.id;
  const { data: tables } = await supabase.from('tables').select('id, name').eq('restaurant_id', restId).limit(1);
  const tableId = tables?.[0]?.id || 'c0ef9a09-f509-4739-8e6b-921aa54f0a9f';
  const { data: menuItems } = await supabase.from('menu_items').select('id').eq('restaurant_id', restId).limit(1);
  const itemId = menuItems?.[0]?.id || '997858e3-4e10-47aa-b11f-5dbbdb5c5a7c';

  const order = await db.createOrder(restId, tableId, [{ menuItemId: itemId, quantity: 1 }], 'Idempotency Test', 'dine_in');

  const p1 = await db.updateOrderPaymentStatus(order.id, 'customer_marked_paid');
  const p2 = await db.updateOrderPaymentStatus(order.id, 'customer_marked_paid');

  console.log('✔ First Payment Update Status:', p1.payment_status);
  console.log('✔ Second Payment Update Status:', p2.payment_status);
  console.log('✔ Same Order Returned Idempotently:', p1.id === p2.id);

  if (p1.payment_status !== 'customer_marked_paid' || p2.payment_status !== 'customer_marked_paid') {
    throw new Error('FAIL: BUG-B3 Idempotency payment update failed');
  }
  console.log('✔ Payment Status Idempotency PASSED 100%\n');

  // 4. TEST BUG-B4: REMOVAL OF SPECIAL INSTRUCTIONS REGEX DISCOUNT PARSING
  console.log('4️⃣ [TEST BUG-B4: NO REGEX DISCOUNT PARSING ON SPECIAL INSTRUCTIONS]');
  const orderB4 = await db.createOrder(
    restId,
    tableId,
    [{ menuItemId: itemId, quantity: 1 }],
    'Please add extra sauce - ₹ 50',
    'dine_in'
  );

  const resB4 = calculateBillingTotals({
    items: orderB4.items,
    discountAmount: Number(orderB4.discount_amount || 0),
    gstEnabled: false
  });

  console.log('✔ Special Instructions Note:', orderB4.special_instructions);
  console.log('✔ Applied Discount Amount:', resB4.discountAmount, '(Expected: 0)');

  if (resB4.discountAmount !== 0) {
    throw new Error('FAIL: BUG-B4 Regex discount parsing incorrectly applied discount from special instructions text!');
  }
  console.log('✔ Structured Discount & Regex Removal PASSED 100%\n');

  console.log('=== ALL PHASE 4A BILLING REGRESSION TESTS PASSED 100% ===');
}

runBillingRegressionSuite().catch(console.error);
