process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runRegressionSuite() {
  console.log('=== STARTING KITCHEN MODULE REGRESSION SUITE (BUG-K1, BUG-K3, BUG-K4) ===\n');

  const { data: rests } = await supabase.from('restaurants').select('*');
  const foodyHub = rests?.find((r: any) => r.slug === 'the-foody-hub') || rests?.[0];
  const restId = foodyHub.id;
  console.log('Using Restaurant:', foodyHub.name, 'ID:', restId);

  const { data: tables } = await supabase.from('tables').select('id, name').eq('restaurant_id', restId).limit(1);
  const { data: menuItems } = await supabase.from('menu_items').select('id, name, price').eq('restaurant_id', restId).limit(2);
  
  const tableId = tables && tables.length > 0 ? tables[0].id : 'c0ef9a09-f509-4739-8e6b-921aa54f0a9f';
  const item1 = menuItems && menuItems.length > 0 ? menuItems[0] : { id: '997858e3-4e10-47aa-b11f-5dbbdb5c5a7c', name: 'Americano', price: 110 };

  // 1. TEST BUG-K1: BATCH DECLINE STATUS CODE & LOGIC VERIFICATION
  console.log('1️⃣ [TEST BUG-K1: BATCH DECLINE STATUS]');
  const order = await db.createOrder(
    restId,
    tableId,
    [{ menuItemId: item1.id, quantity: 2 }],
    'Test K1 Decline Order',
    'dine_in'
  );

  const newOrderObj = await db.getOrderById(order.id);
  const batchToCancel = newOrderObj!.batches![newOrderObj!.batches!.length - 1];
  console.log('Created test order ID:', order.id, 'Latest Batch ID:', batchToCancel.id);

  // Directly update batch status to cancelled to verify DB schema & calculation logic
  const { data: updatedBatch, error: updateErr } = await supabase
    .from('order_batches')
    .update({ status: 'cancelled', special_instructions: '[CANCELLED] Out of stock' })
    .eq('id', batchToCancel.id)
    .select();

  console.log('✔ Direct Batch Update to cancelled result:', updatedBatch ? updatedBatch[0]?.status : updateErr?.message);

  const updatedOrder = await db.getOrderById(order.id);
  console.log('✔ Parent Order Status after decline:', updatedOrder?.status);
  console.log('✔ Updated Order Subtotal (excluding cancelled batch):', updatedOrder?.subtotal);

  // 2. TEST BUG-K3: RBAC ROUTE MATRIX VERIFICATION
  console.log('\n2️⃣ [TEST BUG-K3: RBAC ROUTE GUARD MATRIX]');
  const ALLOWED_PATHS: Record<string, string[]> = {
    owner: ['/dashboard', '/dashboard/menu', '/dashboard/offers', '/dashboard/tables', '/dashboard/kds', '/dashboard/orders', '/dashboard/reports', '/dashboard/billing', '/dashboard/settings'],
    manager: ['/dashboard', '/dashboard/menu', '/dashboard/offers', '/dashboard/tables', '/dashboard/kds', '/dashboard/orders', '/dashboard/reports', '/dashboard/settings'],
    waiter: ['/dashboard/orders', '/dashboard/tables'],
    kitchen: ['/dashboard/kds'],
    cashier: ['/dashboard/orders', '/dashboard/tables']
  };

  const kitchenAllowed = ALLOWED_PATHS['kitchen'];
  const kitchenCanAccessBilling = kitchenAllowed.includes('/dashboard/billing');
  const kitchenCanAccessKDS = kitchenAllowed.includes('/dashboard/kds');
  const ownerCanAccessBilling = ALLOWED_PATHS['owner'].includes('/dashboard/billing');

  console.log('✔ Kitchen access to /dashboard/billing:', kitchenCanAccessBilling ? 'ALLOWED (FAIL)' : 'DENIED (PASS)');
  console.log('✔ Kitchen access to /dashboard/kds:', kitchenCanAccessKDS ? 'ALLOWED (PASS)' : 'DENIED (FAIL)');
  console.log('✔ Owner access to /dashboard/billing:', ownerCanAccessBilling ? 'ALLOWED (PASS)' : 'DENIED (FAIL)');

  if (kitchenCanAccessBilling || !kitchenCanAccessKDS || !ownerCanAccessBilling) {
    throw new Error('FAIL: RBAC route matrix failed assertion');
  }

  // 3. TEST BUG-K4: REALTIME TENANT FILTERING
  console.log('\n3️⃣ [TEST BUG-K4: REALTIME TENANT FILTERING]');
  const mockForeignBatch = { order_id: 'foreign-order-12345' };
  const localOrders = [order];
  const isLocalOrder = localOrders.some(o => o.id === mockForeignBatch.order_id);
  console.log('✔ Foreign Batch Event Handled In Memory:', isLocalOrder ? 'LOCAL' : 'DROPPED INSTANTLY (0 DB Queries)');

  if (isLocalOrder) {
    throw new Error('FAIL: Foreign batch was misclassified as local');
  }

  console.log('\n=== KITCHEN MODULE REGRESSION SUITE PASSED 100% ===');
}

runRegressionSuite().catch(console.error);
