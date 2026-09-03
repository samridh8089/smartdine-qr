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

async function runRushSimulation() {
  console.log('===============================================================');
  console.log('=== PHASE 11A: 20-TABLE RUSH SIMULATION (40-60 ORDERS)     ===');
  console.log('===============================================================');

  // Fetch all 20 tables
  const { data: tables, error: tErr } = await supabase
    .from('tables')
    .select('id, name')
    .eq('restaurant_id', restaurantId)
    .order('name');

  if (tErr || !tables || tables.length === 0) {
    console.error('Failed to fetch tables:', tErr);
    return;
  }
  console.log(`Loaded ${tables.length} tables for The Foody Hub.`);

  const menuItems = [
    { id: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', name: 'Veg Spring Roll', price: 180 },
    { id: 'e3626e22-d5f7-485d-a8ed-5e3506baa0b2', name: 'Paneer Butter Masala (Full)', price: 320, variantName: 'Full' },
    { id: 'e3626e22-d5f7-485d-a8ed-5e3506baa0b2', name: 'Paneer Butter Masala (Half)', price: 200, variantName: 'Half' },
    { id: '549c6942-17d1-4e73-b205-58933ddfb482', name: 'Butter Naan', price: 45 },
    { id: 'dfa4663b-16d9-4f99-be13-e7c759e635bf', name: 'Cold Coffee', price: 120 },
    { id: 'c936f0f7-a6e9-4b2e-8229-8d3de8fa3c49', name: 'Paneer Tikka', price: 260 },
    { id: '883dab9e-8b95-4efd-9e8f-bf0c61b6d326', name: 'Jeera Rice', price: 140 },
    { id: '45a9ec2b-57ca-42ba-a6c2-aae7d61d8207', name: 'Dal Makhani', price: 150 }
  ];

  const chefNotes = [
    'Less spicy, extra crisp',
    'Serve steaming hot',
    'No onions, extra gravy',
    'Rush order for kids',
    'Double butter on naan',
    'Sugar free if possible',
    'Pack gravy separately'
  ];

  const orderPromises = [];
  const results = [];

  console.log('\n--- Wave 1: Initial Rush (20 Simultaneous Orders, 1 per Table) ---');
  const t0 = performance.now();

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const item1 = menuItems[i % menuItems.length];
    const item2 = menuItems[(i + 2) % menuItems.length];
    const note = chefNotes[i % chefNotes.length];

    const payload = {
      restaurantId,
      tableId: table.id,
      orderType: 'dine_in',
      items: [
        { menuItemId: item1.id, quantity: (i % 2) + 1, price: item1.price, variantName: item1.variantName || null, notes: `Portion note ${i}` },
        { menuItemId: item2.id, quantity: 1, price: item2.price, variantName: item2.variantName || null }
      ],
      specialInstructions: `Rush Wave 1 - ${note}`
    };

    orderPromises.push(
      fetch('https://www.cleverops.in/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async res => {
        const data = await res.json();
        return {
          wave: 1,
          table: table.name,
          status: res.status,
          orderId: data.order?.id,
          subtotal: data.order?.subtotal,
          total: data.order?.total,
          success: res.status === 200 && data.success === true
        };
      }).catch(err => ({ wave: 1, table: table.name, status: 500, error: err.message, success: false }))
    );
  }

  const wave1Results = await Promise.all(orderPromises);
  const wave1Duration = ((performance.now() - t0) / 1000).toFixed(2);
  results.push(...wave1Results);

  const wave1Pass = wave1Results.filter(r => r.success).length;
  console.log(`Wave 1 Completed in ${wave1Duration}s: ${wave1Pass}/20 Orders Succeeded.`);

  console.log('\n--- Wave 2: Repeat Orders & Batch Appends (20 Simultaneous Re-Orders) ---');
  const t1 = performance.now();
  const wave2Promises = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    const item = menuItems[(i + 3) % menuItems.length];

    const payload = {
      restaurantId,
      tableId: table.id,
      orderType: 'dine_in',
      items: [
        { menuItemId: item.id, quantity: 2, price: item.price, variantName: item.variantName || null, notes: 'Addon repeat batch' }
      ],
      specialInstructions: `Rush Wave 2 Addon - Table ${i + 1}`
    };

    wave2Promises.push(
      fetch('https://www.cleverops.in/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async res => {
        const data = await res.json();
        return {
          wave: 2,
          table: table.name,
          status: res.status,
          orderId: data.order?.id,
          totalBatches: data.order?.batches?.length || 2,
          total: data.order?.total,
          success: res.status === 200 && data.success === true
        };
      }).catch(err => ({ wave: 2, table: table.name, status: 500, error: err.message, success: false }))
    );
  }

  const wave2Results = await Promise.all(wave2Promises);
  const wave2Duration = ((performance.now() - t1) / 1000).toFixed(2);
  results.push(...wave2Results);

  const wave2Pass = wave2Results.filter(r => r.success).length;
  console.log(`Wave 2 Completed in ${wave2Duration}s: ${wave2Pass}/20 Orders Succeeded.`);

  // Verify Database State
  const { data: activeOrders, count } = await supabase
    .from('orders')
    .select('id, table_name, subtotal, gst, total, status', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .in('status', ['new', 'accepted', 'preparing', 'ready', 'served']);

  const { count: orderItemsCount } = await supabase
    .from('order_items')
    .select('id', { count: 'exact' });

  const { count: batchesCount } = await supabase
    .from('order_batches')
    .select('id', { count: 'exact' });

  console.log('\n=== RUSH SIMULATION DATABASE SUMMARY ===');
  console.log(`Total Orders Placed: ${results.length}`);
  console.log(`Total Successful: ${results.filter(r => r.success).length} / ${results.length}`);
  console.log(`Active Orders in DB: ${count}`);
  console.log(`Total Order Batches in DB: ${batchesCount}`);
  console.log(`Total Order Items in DB: ${orderItemsCount}`);

  fs.writeFileSync('scratch/rush_simulation_results.json', JSON.stringify({
    wave1Pass,
    wave1Duration,
    wave2Pass,
    wave2Duration,
    totalOrders: results.length,
    activeOrdersInDb: count,
    orderItemsCount,
    batchesCount,
    results
  }, null, 2));
  console.log('Results saved to scratch/rush_simulation_results.json');
}

runRushSimulation().catch(console.error);
