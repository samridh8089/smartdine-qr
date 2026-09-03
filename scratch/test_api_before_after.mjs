import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const tableId = '433daa89-186c-454c-a978-e184a85577b2';

async function testApi() {
  console.log('--- Testing Fixed API: POST http://localhost:3000/api/customer/orders ---');

  const payload = {
    restaurantId,
    tableId,
    orderType: 'dine_in',
    items: [
      {
        menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6',
        quantity: 1,
        price: 180,
        notes: 'Extra crispy'
      }
    ],
    specialInstructions: 'Customer Note: Localhost test'
  };

  const res = await fetch('http://localhost:3000/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const status = res.status;
  const json = await res.json();
  console.log('HTTP Status:', status);
  console.log('API Response JSON:', JSON.stringify(json, null, 2));

  if (status === 200 && json.success && json.order?.id) {
    const orderId = json.order.id;
    console.log('SUCCESS: Order created with ID:', orderId);

    // Verify order in database
    const { data: dbOrder } = await supabase.from('orders').select('*, order_items(*), order_batches(*)').eq('id', orderId).single();
    console.log('Database Order Verification:');
    console.log(' - Order ID:', dbOrder?.id);
    console.log(' - Subtotal:', dbOrder?.subtotal);
    console.log(' - GST:', dbOrder?.gst);
    console.log(' - Total:', dbOrder?.total);
    console.log(' - Batches Count:', dbOrder?.order_batches?.length);
    console.log(' - Items Count:', dbOrder?.order_items?.length);
    console.log(' - Item Name:', dbOrder?.order_items?.[0]?.menu_item_name);

    // Test Adding Batch #2 (Customer add-on via fixed API)
    console.log('\n--- Testing Add-on Batch to existing active order via API ---');
    const addonPayload = {
      restaurantId,
      tableId,
      orderType: 'dine_in',
      items: [
        {
          menuItemId: 'dfa4663b-16d9-4f99-be13-e7c759e635bf',
          quantity: 1,
          price: 120,
          notes: 'Cold Coffee addon'
        }
      ],
      specialInstructions: 'Add-on drink'
    };

    const res2 = await fetch('http://localhost:3000/api/customer/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addonPayload)
    });

    const status2 = res2.status;
    const json2 = await res2.json();
    console.log('Addon HTTP Status:', status2);
    console.log('Addon API Response JSON:', JSON.stringify(json2, null, 2));

    const { data: updatedDbOrder } = await supabase.from('orders').select('*, order_items(*), order_batches(*)').eq('id', orderId).single();
    console.log('After Add-on Database Order:');
    console.log(' - Total:', updatedDbOrder?.total);
    console.log(' - Batches Count:', updatedDbOrder?.order_batches?.length);
    console.log(' - Items Count:', updatedDbOrder?.order_items?.length);

    // Clean up test order
    await supabase.from('order_items').delete().eq('order_id', orderId);
    await supabase.from('order_batches').delete().eq('order_id', orderId);
    await supabase.from('orders').delete().eq('id', orderId);
    console.log('\nTest order cleaned up successfully!');
  }
}

testApi().catch(console.error);
