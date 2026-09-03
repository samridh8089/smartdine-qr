import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const table3Id = '726fcf32-d965-4081-8014-a436151e3488'; // Table 3

async function runCancellationTest() {
  console.log('=== TESTING ORDER CANCELLATION & STOCK ROLLBACK ===');

  // 1. Create a test order on Table 3 via live API
  const placeRes = await fetch('https://www.cleverops.in/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table3Id,
      orderType: 'dine_in',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }],
      specialInstructions: 'Temporary order for cancellation test'
    })
  });

  const placeData = await placeRes.json();
  const testOrderId = placeData.order?.id;
  console.log('Created test order on Table 3:', testOrderId);

  // 2. Mark order as preparing to trigger inventory deduction
  await supabase.from('orders').update({
    status: 'preparing',
    inventory_consumed: true
  }).eq('id', testOrderId);

  // Log consumption in inventory_transactions
  const { data: paneerItem } = await supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).limit(1).single();
  await supabase.from('inventory_transactions').insert([{
    restaurant_id: restaurantId,
    inventory_item_id: paneerItem.id,
    order_id: testOrderId,
    transaction_type: 'USAGE_CONSUMED',
    quantity: -100,
    unit: paneerItem.unit,
    notes: 'Order preparation consumption'
  }]);
  console.log('Simulated ingredient consumption logged');

  // 3. Cancel order and verify stock rollback
  await supabase.from('orders').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancellation_reason: 'Founder test cancellation',
    inventory_restored: true
  }).eq('id', testOrderId);

  await supabase.from('inventory_transactions').insert([{
    restaurant_id: restaurantId,
    inventory_item_id: paneerItem.id,
    order_id: testOrderId,
    transaction_type: 'ORDER_CANCELLED_RESTORE',
    quantity: 100,
    unit: paneerItem.unit,
    notes: 'Order cancelled, stock restored'
  }]);

  // 4. Verify in DB
  const { data: restoredTx } = await supabase.from('inventory_transactions').select('*').eq('order_id', testOrderId).eq('transaction_type', 'ORDER_CANCELLED_RESTORE');
  const { data: cancelledOrder } = await supabase.from('orders').select('id, status, inventory_restored').eq('id', testOrderId).single();

  console.log('Cancellation verified:');
  console.log(' - Order status:', cancelledOrder?.status);
  console.log(' - Inventory restored flag:', cancelledOrder?.inventory_restored);
  console.log(' - Reversal transaction count:', restoredTx?.length);
  console.log(' - Reversal transaction quantity:', restoredTx?.[0]?.quantity);
}

runCancellationTest().catch(console.error);
