import { createClient } from '@supabase/supabase-js';
import { db } from './src/lib/db';

const supabase = createClient(
  'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-'
);

async function runAuthoritativeAudit() {
  const restId = 'c1853f65-c10c-4f8a-b379-00a60f404ef9';
  const dalMakhaniId = '487d76c5-abdb-4a2a-b022-d855dbb61b15';
  const fullVariantId = '7e7827fc-d949-4836-96b5-41831e3458d6'; // 200g paneer, 0.3kg tomatoes, 0.04L oil, 0.06kg butter, 0.02kg spices
  const halfVariantId = '7eb0e6d3-4bc4-4048-a41e-e701d8423301'; // 100g paneer, 0.15kg tomatoes, 0.02L oil, 0.03kg butter, 0.01kg spices

  const table2Id = '5627bd07-4acd-4c8e-90d8-e27cd2076a27'; // Table 2
  const table5Id = 'f4ce8ad9-d1ca-4062-b999-e8dde98ab00c'; // Table 5

  const trackedItemIds = [
    '0d545647-eba1-47bc-bc32-b1bea820c755', // TEST - Fresh Paneer
    '8d08cd90-9ed2-40e3-bb8e-b58282b83f5f', // TEST - Fresh Tomatoes
    '9acc60f5-e2de-4bbb-a7b8-f774a19974ca', // TEST - Cooking Oil
    'e480e47d-f6c0-4475-869f-ee774801bf5c', // TEST - Butter
    '20a7e4a9-ee47-4513-9a7e-098f9394e11d'  // TEST - Spice Mix
  ];

  async function getStockMap() {
    const { data } = await supabase.from('inventory_items').select('*').in('id', trackedItemIds);
    const map = new Map<string, any>();
    data?.forEach(i => map.set(i.id, i));
    return map;
  }

  // Ensure tables 2 and 5 are unoccupied by completing any previous active test orders
  await supabase.from('orders').update({ status: 'completed' }).in('table_id', [table2Id, table5Id]).neq('status', 'completed');

  // =========================================================================
  // TEST ORDER #1: 1 x Full + 1 x Half Dal Makhani on Table 2
  // =========================================================================
  console.log('========================================================================');
  console.log('STARTING REAL TEST ORDER #1: 1 x Full + 1 x Half Dal Makhani (Table 2)');
  console.log('========================================================================');

  const stockBefore1 = await getStockMap();
  console.log('INVENTORY BEFORE TEST 1:');
  trackedItemIds.forEach(id => {
    const itm = stockBefore1.get(id);
    console.log(` - ${itm.name}: Physical=${itm.current_stock} ${itm.unit}, Reserved=${itm.reserved_stock} ${itm.unit}`);
  });

  const cart1 = [
    {
      menuItemId: dalMakhaniId,
      variantId: fullVariantId,
      variantName: 'full',
      quantity: 1,
      price: 644,
      notes: 'Real Test Order #1 - Full'
    },
    {
      menuItemId: dalMakhaniId,
      variantId: halfVariantId,
      variantName: 'Half',
      quantity: 1,
      price: 300,
      notes: 'Real Test Order #1 - Half'
    }
  ];

  const order1 = await db.createOrder(restId, table2Id, cart1, 'REAL TEST ORDER #1: 1 Full + 1 Half', 'dine_in');
  console.log(`\n[ORDER 1 CREATED] ID: ${order1.id}, Table: ${order1.table_name}, Total: ₹${order1.total}`);
  order1.items.forEach(i => {
    console.log(` - ${i.menu_item_name} (Variant: ${i.variant_name}, Qty: ${i.quantity}, Price: ₹${i.price})`);
  });

  const batch1 = order1.batches![order1.batches!.length - 1];
  console.log(`Batch ID for Order 1: ${batch1.id}`);

  // Transition Order 1 to ACCEPTED
  console.log('\n---> Transitioning Order 1 to ACCEPTED...');
  await db.updateBatchStatus(batch1.id, 'accepted', 'Harshed mehta');
  const stockAccepted1 = await getStockMap();
  const { data: resAccepted1 } = await supabase.from('inventory_reservations').select('*').eq('batch_id', batch1.id);
  console.log(`Reservations created in DB: ${resAccepted1?.length}`);
  resAccepted1?.forEach(r => {
    console.log(` - Reserved: ${r.reserved_quantity} ${r.unit} (Item: ${r.inventory_item_id}) Status: ${r.status}`);
  });

  // Transition Order 1 to PREPARING
  console.log('\n---> Transitioning Order 1 to PREPARING...');
  const prepTimestamp1 = new Date().toISOString();
  await db.updateBatchStatus(batch1.id, 'preparing', 'Kitchen Staff');
  const stockPrep1 = await getStockMap();
  const { data: txPrep1 } = await supabase.from('inventory_transactions').select('*').eq('batch_id', batch1.id).eq('transaction_type', 'ORDER_CONSUMPTION');
  console.log(`Consumption transactions created in DB: ${txPrep1?.length}`);
  txPrep1?.forEach(t => {
    console.log(` - Consumed: ${t.quantity} ${t.unit} (Item: ${t.inventory_item_id}) Before: ${t.before_stock} -> After: ${t.after_stock} Key: ${t.idempotency_key}`);
  });

  const expected1: Record<string, number> = {
    '0d545647-eba1-47bc-bc32-b1bea820c755': 0.3,  // Paneer: 200g + 100g = 300g = 0.3kg
    '8d08cd90-9ed2-40e3-bb8e-b58282b83f5f': 0.45, // Tomatoes: 0.3 + 0.15 = 0.45kg
    '9acc60f5-e2de-4bbb-a7b8-f774a19974ca': 0.06, // Oil: 0.04 + 0.02 = 0.06L
    'e480e47d-f6c0-4475-869f-ee774801bf5c': 0.09, // Butter: 0.06 + 0.03 = 0.09kg
    '20a7e4a9-ee47-4513-9a7e-098f9394e11d': 0.03  // Spices: 0.02 + 0.01 = 0.03kg
  };

  console.log('\n--- VERIFICATION OF ORDER 1 INGREDIENTS ---');
  let order1Passed = true;
  trackedItemIds.forEach(id => {
    const before = stockBefore1.get(id);
    const accepted = stockAccepted1.get(id);
    const prep = stockPrep1.get(id);
    const exp = expected1[id];
    const actualDeduction = parseFloat((Number(before.current_stock) - Number(prep.current_stock)).toFixed(4));
    const pass = actualDeduction === exp && accepted.current_stock === before.current_stock && prep.reserved_stock === 0;
    if (!pass) order1Passed = false;
    console.log(`[${before.name} (${before.unit})] Expected: -${exp} | Actual: -${actualDeduction} | Reserved at Accepted: ${accepted.reserved_stock} | Reserved at Prep: ${prep.reserved_stock} -> ${pass ? 'PASS' : 'FAIL'}`);
  });

  // =========================================================================
  // TEST ORDER #2: 2 x Half Dal Makhani on Table 5
  // =========================================================================
  console.log('\n========================================================================');
  console.log('STARTING REAL TEST ORDER #2: 2 x Half Dal Makhani (Table 5)');
  console.log('========================================================================');

  const stockBefore2 = await getStockMap();
  console.log('INVENTORY BEFORE TEST 2:');
  trackedItemIds.forEach(id => {
    const itm = stockBefore2.get(id);
    console.log(` - ${itm.name}: Physical=${itm.current_stock} ${itm.unit}, Reserved=${itm.reserved_stock} ${itm.unit}`);
  });

  const cart2 = [
    {
      menuItemId: dalMakhaniId,
      variantId: halfVariantId,
      variantName: 'Half',
      quantity: 2,
      price: 300,
      notes: 'Real Test Order #2 - 2 Half portions'
    }
  ];

  const order2 = await db.createOrder(restId, table5Id, cart2, 'REAL TEST ORDER #2: 2 Half', 'dine_in');
  console.log(`\n[ORDER 2 CREATED] ID: ${order2.id}, Table: ${order2.table_name}, Total: ₹${order2.total}`);
  order2.items.forEach(i => {
    console.log(` - ${i.menu_item_name} (Variant: ${i.variant_name}, Qty: ${i.quantity}, Price: ₹${i.price})`);
  });

  const batch2 = order2.batches![order2.batches!.length - 1];
  console.log(`Batch ID for Order 2: ${batch2.id}`);

  // Transition Order 2 to ACCEPTED
  console.log('\n---> Transitioning Order 2 to ACCEPTED...');
  await db.updateBatchStatus(batch2.id, 'accepted', 'Harshed mehta');
  const stockAccepted2 = await getStockMap();
  const { data: resAccepted2 } = await supabase.from('inventory_reservations').select('*').eq('batch_id', batch2.id);
  console.log(`Reservations created in DB: ${resAccepted2?.length}`);
  resAccepted2?.forEach(r => {
    console.log(` - Reserved: ${r.reserved_quantity} ${r.unit} (Item: ${r.inventory_item_id}) Status: ${r.status}`);
  });

  // Transition Order 2 to PREPARING
  console.log('\n---> Transitioning Order 2 to PREPARING...');
  const prepTimestamp2 = new Date().toISOString();
  await db.updateBatchStatus(batch2.id, 'preparing', 'Kitchen Staff');
  const stockPrep2 = await getStockMap();
  const { data: txPrep2 } = await supabase.from('inventory_transactions').select('*').eq('batch_id', batch2.id).eq('transaction_type', 'ORDER_CONSUMPTION');
  console.log(`Consumption transactions created in DB: ${txPrep2?.length}`);
  txPrep2?.forEach(t => {
    console.log(` - Consumed: ${t.quantity} ${t.unit} (Item: ${t.inventory_item_id}) Before: ${t.before_stock} -> After: ${t.after_stock} Key: ${t.idempotency_key}`);
  });

  const expected2: Record<string, number> = {
    '0d545647-eba1-47bc-bc32-b1bea820c755': 0.2,  // Paneer: 2 * 100g = 200g = 0.2kg
    '8d08cd90-9ed2-40e3-bb8e-b58282b83f5f': 0.3,  // Tomatoes: 2 * 0.15 = 0.30kg
    '9acc60f5-e2de-4bbb-a7b8-f774a19974ca': 0.04, // Oil: 2 * 0.02 = 0.04L
    'e480e47d-f6c0-4475-869f-ee774801bf5c': 0.06, // Butter: 2 * 0.03 = 0.06kg
    '20a7e4a9-ee47-4513-9a7e-098f9394e11d': 0.02  // Spices: 2 * 0.01 = 0.02kg
  };

  console.log('\n--- VERIFICATION OF ORDER 2 INGREDIENTS ---');
  let order2Passed = true;
  trackedItemIds.forEach(id => {
    const before = stockBefore2.get(id);
    const accepted = stockAccepted2.get(id);
    const prep = stockPrep2.get(id);
    const exp = expected2[id];
    const actualDeduction = parseFloat((Number(before.current_stock) - Number(prep.current_stock)).toFixed(4));
    const pass = actualDeduction === exp && accepted.current_stock === before.current_stock && prep.reserved_stock === 0;
    if (!pass) order2Passed = false;
    console.log(`[${before.name} (${before.unit})] Expected: -${exp} | Actual: -${actualDeduction} | Reserved at Accepted: ${accepted.reserved_stock} | Reserved at Prep: ${prep.reserved_stock} -> ${pass ? 'PASS' : 'FAIL'}`);
  });

  // =========================================================================
  // DOUBLE DEDUCTION PROTECTION TEST
  // =========================================================================
  console.log('\n========================================================================');
  console.log('TESTING DOUBLE DEDUCTION IDEMPOTENCY GUARD');
  console.log('========================================================================');
  const stockBeforeDouble = await getStockMap();
  await db.updateBatchStatus(batch2.id, 'preparing', 'Kitchen Staff');
  const stockAfterDouble = await getStockMap();
  let doubleDeductionOccurred = false;
  trackedItemIds.forEach(id => {
    if (stockBeforeDouble.get(id).current_stock !== stockAfterDouble.get(id).current_stock) {
      doubleDeductionOccurred = true;
    }
  });
  console.log(`Double deduction check: ${doubleDeductionOccurred ? 'FAIL' : 'PASS (100% Idempotent)'}`);

  console.log('\n========================================================================');
  console.log(`OVERALL AUDIT RESULT: ${order1Passed && order2Passed && !doubleDeductionOccurred ? '100% PASS' : 'FAIL'}`);
  console.log('========================================================================');

  console.log('\n================ DATA SUMMARY JSON ================');
  console.log(JSON.stringify({
    order1: {
      orderId: order1.id,
      tableName: order1.table_name,
      total: order1.total,
      batchId: batch1.id,
      prepTimestamp: prepTimestamp1,
      items: order1.items,
      reservations: resAccepted1,
      transactions: txPrep1
    },
    order2: {
      orderId: order2.id,
      tableName: order2.table_name,
      total: order2.total,
      batchId: batch2.id,
      prepTimestamp: prepTimestamp2,
      items: order2.items,
      reservations: resAccepted2,
      transactions: txPrep2
    }
  }, null, 2));
}

runAuthoritativeAudit().catch(console.error);
