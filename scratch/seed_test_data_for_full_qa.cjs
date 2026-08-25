const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9'; // The foody hub

async function seedDataForQA() {
  console.log('=== SEEDING ISOLATED TEST RECORDS FOR FULL QA AUDIT ===\n');

  // 1. Staff Account
  const { data: existingStaff } = await supabase.from('staff').select('*').eq('restaurant_id', TARGET_REST_ID);
  if (!existingStaff || existingStaff.length === 0) {
    await supabase.from('staff').insert({
      restaurant_id: TARGET_REST_ID,
      username: 'TEST_Staff_User',
      name: 'TEST Staff User',
      role: 'staff',
      passcode: '1234',
      is_active: true
    });
    console.log('✅ Created TEST Staff Account');
  }

  // 2. Promo Offer
  const { data: existingPromos } = await supabase.from('promo_offers').select('*').eq('restaurant_id', TARGET_REST_ID);
  if (!existingPromos || existingPromos.length === 0) {
    await supabase.from('promo_offers').insert({
      restaurant_id: TARGET_REST_ID,
      code: 'TESTPROMO50',
      title: 'TEST 50% Off Promo',
      discount_type: 'percentage',
      discount_value: 50,
      max_discount_amount: 150,
      min_order_amount: 100,
      is_active: true
    });
    console.log('✅ Created TEST Promo Offer');
  }

  // 3. Inventory Gram Item
  const { data: existingGram } = await supabase.from('inventory_items').select('*').eq('restaurant_id', TARGET_REST_ID).eq('unit', 'gram');
  if (!existingGram || existingGram.length === 0) {
    await supabase.from('inventory_items').insert({
      restaurant_id: TARGET_REST_ID,
      name: 'TEST - Salt & Pepper',
      category: 'Spices',
      unit: 'gram',
      opening_stock: 1000,
      current_stock: 1000,
      minimum_stock: 100,
      cost_per_unit: 0.10,
      is_active: true
    });
    console.log('✅ Created TEST Gram Inventory Item');
  }

  // 4. Staff Task
  const { data: existingTasks } = await supabase.from('staff_tasks').select('*').eq('restaurant_id', TARGET_REST_ID);
  if (!existingTasks || existingTasks.length === 0) {
    await supabase.from('staff_tasks').insert({
      restaurant_id: TARGET_REST_ID,
      title: 'TEST Kitchen Sanitization Audit',
      description: 'Perform end-of-day kitchen sanitization check and upload proof',
      assigned_to: 'TEST Staff User',
      assigned_role: 'staff',
      status: 'pending',
      priority: 'medium'
    });
    console.log('✅ Created TEST Staff Task');
  }

  // 5. KDS Order Batch & Order
  const { data: existingBatches } = await supabase.from('order_batches').select('*').eq('restaurant_id', TARGET_REST_ID);
  if (!existingBatches || existingBatches.length === 0) {
    const { data: newOrderRes } = await supabase.from('orders').insert({
      restaurant_id: TARGET_REST_ID,
      order_type: 'dine_in',
      table_number: 'T-99',
      status: 'cooking',
      subtotal: 300,
      discount_total: 0,
      taxable_amount: 300,
      cgst_amount: 3.75,
      sgst_amount: 3.75,
      tax_total: 7.50,
      grand_total: 307.50,
      payment_status: 'pending'
    }).select();

    if (newOrderRes && newOrderRes.length > 0) {
      await supabase.from('order_batches').insert({
        restaurant_id: TARGET_REST_ID,
        order_id: newOrderRes[0].id,
        batch_number: 1,
        status: 'cooking'
      });
      console.log('✅ Created TEST Order & KDS Order Batch');
    }
  }

  console.log('\n=== TEST SEEDING COMPLETED ===\n');
}

seedDataForQA().catch(console.error);
