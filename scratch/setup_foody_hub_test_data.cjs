const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9'; // The foody hub

async function setupFoodyHubData() {
  console.log('=== STARTING CONTROLLED TEST DATA SETUP FOR THE FOODY HUB ===\n');

  // Validate Target Restaurant
  const { data: rest, error: rErr } = await supabase.from('restaurants').select('*').eq('id', TARGET_REST_ID).single();
  if (rErr || !rest) throw new Error('Target restaurant ID not found!');
  console.log(`✅ Validated Target Restaurant: ${rest.name.trim()} (${rest.id})\n`);

  // Clean up previous TEST items for The foody hub if re-running
  console.log('--- Cleaning up prior TEST entries for The foody hub ---');
  const { data: oldTestItems } = await supabase.from('inventory_items').select('id').eq('restaurant_id', TARGET_REST_ID).like('name', 'TEST - %');
  if (oldTestItems && oldTestItems.length > 0) {
    const oldIds = oldTestItems.map(i => i.id);
    await supabase.from('inventory_recipe_ingredients').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_purchase_items').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_waste').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_alerts').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_transactions').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_items').delete().in('id', oldIds);
    console.log(`Cleaned up ${oldIds.length} old TEST inventory items.`);
  }

  // Clean up prior TEST purchases
  const { data: oldTestPurchases } = await supabase.from('inventory_purchases').select('id').eq('restaurant_id', TARGET_REST_ID).like('invoice_number', 'TEST-PUR-%');
  if (oldTestPurchases && oldTestPurchases.length > 0) {
    const purIds = oldTestPurchases.map(p => p.id);
    await supabase.from('inventory_purchase_items').delete().in('purchase_id', purIds);
    await supabase.from('inventory_purchases').delete().in('id', purIds);
    console.log(`Cleaned up ${oldTestPurchases.length} old TEST purchase invoices.`);
  }

  // 1. CREATE 10 TEST INVENTORY ITEMS
  console.log('\n--- STEP 1: Creating 10 TEST Inventory Items ---');
  const itemsConfig = [
    { name: 'TEST - Wheat Flour', category: 'Grains & Flour', unit: 'kg', opening_stock: 10, current_stock: 30, minimum_stock: 2, cost_per_unit: 50.00 },
    { name: 'TEST - Fresh Tomatoes', category: 'Vegetables', unit: 'kg', opening_stock: 8, current_stock: 31.95, minimum_stock: 2, cost_per_unit: 40.00 },
    { name: 'TEST - Fresh Paneer', category: 'Dairy', unit: 'kg', opening_stock: 5, current_stock: 14.50, minimum_stock: 1, cost_per_unit: 300.00 },
    { name: 'TEST - Cooking Oil', category: 'Oils & Fats', unit: 'litre', opening_stock: 10, current_stock: 17.125, minimum_stock: 2, cost_per_unit: 140.00 },
    { name: 'TEST - Yellow Dal', category: 'Pulses', unit: 'kg', opening_stock: 5, current_stock: 29.85, minimum_stock: 1, cost_per_unit: 120.00 },
    { name: 'TEST - Milk', category: 'Dairy', unit: 'litre', opening_stock: 10, current_stock: 10, minimum_stock: 2, cost_per_unit: 60.00 },
    { name: 'TEST - Butter', category: 'Dairy', unit: 'kg', opening_stock: 3, current_stock: 3, minimum_stock: 0.5, cost_per_unit: 500.00 },
    { name: 'TEST - Spice Mix', category: 'Spices', unit: 'kg', opening_stock: 2, current_stock: 0.20, minimum_stock: 0.25, cost_per_unit: 300.00 }, // LOW STOCK
    { name: 'TEST - Water', category: 'Beverages', unit: 'bottle', opening_stock: 100, current_stock: 0, minimum_stock: 20, cost_per_unit: 10.00 }, // OUT OF STOCK
    { name: 'TEST - Ice Cream', category: 'Desserts', unit: 'litre', opening_stock: 5, current_stock: 5, minimum_stock: 1, cost_per_unit: 250.00 }
  ];

  const createdItemsMap = {};
  for (const cfg of itemsConfig) {
    const { data: item, error } = await supabase.from('inventory_items').insert({
      restaurant_id: TARGET_REST_ID,
      ...cfg,
      is_active: true
    }).select().single();
    if (error) throw new Error(`Failed to create ${cfg.name}: ${error.message}`);
    createdItemsMap[cfg.name] = item;
    console.log(`✅ Created Item: ${item.name} | Unit: ${item.unit} | Stock: ${item.current_stock} | Min: ${item.minimum_stock} | Cost: ₹${item.cost_per_unit}`);
  }

  // 2. CREATE PURCHASES / STOCK-IN
  console.log('\n--- STEP 2: Creating 2 TEST Purchase Invoices ---');
  // Purchase 1
  const { data: pur1Res } = await supabase.from('inventory_purchases').insert({
    restaurant_id: TARGET_REST_ID,
    supplier_name: 'TEST Supplier A',
    invoice_number: 'TEST-PUR-001',
    total_amount: 5000.00,
    notes: 'TEST purchase entry #1 for raw material stock-in',
    created_by: 'Owner'
  }).select();
  const pur1 = pur1Res[0];

  const purItems1 = [
    { purchase_id: pur1.id, inventory_item_id: createdItemsMap['TEST - Wheat Flour'].id, quantity: 20, unit: 'kg', unit_cost: 50.00, total_cost: 1000.00 },
    { purchase_id: pur1.id, inventory_item_id: createdItemsMap['TEST - Fresh Paneer'].id, quantity: 10, unit: 'kg', unit_cost: 300.00, total_cost: 3000.00 },
    { purchase_id: pur1.id, inventory_item_id: createdItemsMap['TEST - Cooking Oil'].id, quantity: 7.14, unit: 'litre', unit_cost: 140.00, total_cost: 1000.00 }
  ];
  await supabase.from('inventory_purchase_items').insert(purItems1);

  for (const pi of purItems1) {
    const item = Object.values(createdItemsMap).find(i => i.id === pi.inventory_item_id);
    await supabase.from('inventory_transactions').insert({
      restaurant_id: TARGET_REST_ID,
      inventory_item_id: pi.inventory_item_id,
      quantity: pi.quantity,
      unit: pi.unit,
      before_stock: item.opening_stock,
      after_stock: item.opening_stock + pi.quantity,
      transaction_type: 'PURCHASE',
      reference_type: 'PURCHASE_INVOICE',
      reference_id: pur1.id,
      user_name: 'Owner',
      notes: `TEST Purchase invoice #${pur1.invoice_number} from ${pur1.supplier_name}`
    });
  }
  console.log(`✅ Created Purchase Invoice #TEST-PUR-001 (Amount: ₹5,000.00)`);

  // Purchase 2
  const { data: pur2Res } = await supabase.from('inventory_purchases').insert({
    restaurant_id: TARGET_REST_ID,
    supplier_name: 'TEST Supplier B',
    invoice_number: 'TEST-PUR-002',
    total_amount: 4000.00,
    notes: 'TEST purchase entry #2 for vegetables and pulses',
    created_by: 'Owner'
  }).select();
  const pur2 = pur2Res[0];

  const purItems2 = [
    { purchase_id: pur2.id, inventory_item_id: createdItemsMap['TEST - Fresh Tomatoes'].id, quantity: 25, unit: 'kg', unit_cost: 40.00, total_cost: 1000.00 },
    { purchase_id: pur2.id, inventory_item_id: createdItemsMap['TEST - Yellow Dal'].id, quantity: 25, unit: 'kg', unit_cost: 120.00, total_cost: 3000.00 }
  ];
  await supabase.from('inventory_purchase_items').insert(purItems2);

  for (const pi of purItems2) {
    const item = Object.values(createdItemsMap).find(i => i.id === pi.inventory_item_id);
    await supabase.from('inventory_transactions').insert({
      restaurant_id: TARGET_REST_ID,
      inventory_item_id: pi.inventory_item_id,
      quantity: pi.quantity,
      unit: pi.unit,
      before_stock: item.opening_stock,
      after_stock: item.opening_stock + pi.quantity,
      transaction_type: 'PURCHASE',
      reference_type: 'PURCHASE_INVOICE',
      reference_id: pur2.id,
      user_name: 'Owner',
      notes: `TEST Purchase invoice #${pur2.invoice_number} from ${pur2.supplier_name}`
    });
  }
  console.log(`✅ Created Purchase Invoice #TEST-PUR-002 (Amount: ₹4,000.00)`);

  // 3. MAP 5 TEST RECIPES TO EXISTING MENU ITEMS
  console.log('\n--- STEP 3: Configuring 5 TEST Recipes ---');
  const { data: menuItems } = await supabase.from('menu_items').select('*').eq('restaurant_id', TARGET_REST_ID);

  const dalDish = menuItems.find(m => m.name.toLowerCase().includes('dal')) || menuItems[0];
  const parathaDish = menuItems.find(m => m.name.includes('पराठा')) || menuItems[1];
  const sandwichDish = menuItems.find(m => m.name.toLowerCase().includes('sandwich')) || menuItems[2];
  const coffeeDish = menuItems.find(m => m.name.toLowerCase().includes('cappuccino') || m.name.toLowerCase().includes('latte')) || menuItems[3];
  const pizzaDish = menuItems.find(m => m.name.toLowerCase().includes('pizza') || m.name.toLowerCase().includes('americano')) || menuItems[4];

  const recipesConfig = [
    {
      menuItem: dalDish,
      testDishName: 'TEST - Paneer Butter Masala / Dal Dish',
      ingredients: [
        { name: 'TEST - Fresh Paneer', quantity: 0.20, unit: 'kg' },   // 200g @ ₹300 = ₹60.00
        { name: 'TEST - Fresh Tomatoes', quantity: 0.15, unit: 'kg' }, // 150g @ ₹40 = ₹6.00
        { name: 'TEST - Cooking Oil', quantity: 0.02, unit: 'litre' }, // 20ml @ ₹140 = ₹2.80
        { name: 'TEST - Butter', quantity: 0.03, unit: 'kg' },         // 30g @ ₹500 = ₹15.00
        { name: 'TEST - Spice Mix', quantity: 0.01, unit: 'kg' }       // 10g @ ₹300 = ₹3.00
      ] // Cost = 86.80
    },
    {
      menuItem: parathaDish,
      testDishName: 'TEST - Aloo Paratha Dish',
      ingredients: [
        { name: 'TEST - Wheat Flour', quantity: 0.15, unit: 'kg' },    // 150g @ ₹50 = ₹7.50
        { name: 'TEST - Butter', quantity: 0.02, unit: 'kg' },         // 20g @ ₹500 = ₹10.00
        { name: 'TEST - Spice Mix', quantity: 0.005, unit: 'kg' }      // 5g @ ₹300 = ₹1.50
      ] // Cost = 19.00
    },
    {
      menuItem: sandwichDish,
      testDishName: 'TEST - Tomato Sandwich Dish',
      ingredients: [
        { name: 'TEST - Wheat Flour', quantity: 0.10, unit: 'kg' },    // 100g @ ₹50 = ₹5.00
        { name: 'TEST - Fresh Tomatoes', quantity: 0.10, unit: 'kg' }, // 100g @ ₹40 = ₹4.00
        { name: 'TEST - Butter', quantity: 0.015, unit: 'kg' }         // 15g @ ₹500 = ₹7.50
      ] // Cost = 16.50
    },
    {
      menuItem: coffeeDish,
      testDishName: 'TEST - Cold Coffee Dish',
      ingredients: [
        { name: 'TEST - Milk', quantity: 0.25, unit: 'litre' },        // 250ml @ ₹60 = ₹15.00
        { name: 'TEST - Ice Cream', quantity: 0.05, unit: 'litre' }    // 50ml @ ₹250 = ₹12.50
      ] // Cost = 27.50
    },
    {
      menuItem: pizzaDish,
      testDishName: 'TEST - Dal Tadka / Special Dish',
      ingredients: [
        { name: 'TEST - Yellow Dal', quantity: 0.15, unit: 'kg' },     // 150g @ ₹120 = ₹18.00
        { name: 'TEST - Fresh Tomatoes', quantity: 0.05, unit: 'kg' }, // 50g @ ₹40 = ₹2.00
        { name: 'TEST - Cooking Oil', quantity: 0.015, unit: 'litre' },// 15ml @ ₹140 = ₹2.10
        { name: 'TEST - Spice Mix', quantity: 0.005, unit: 'kg' }      // 5g @ ₹300 = ₹1.50
      ] // Cost = 23.60
    }
  ];

  for (const rCfg of recipesConfig) {
    // Delete prior recipe for dish if exists
    await supabase.from('inventory_recipes').delete().eq('menu_item_id', rCfg.menuItem.id);

    const { data: recRes } = await supabase.from('inventory_recipes').insert({
      restaurant_id: TARGET_REST_ID,
      menu_item_id: rCfg.menuItem.id,
      serving_size: '1 Portion',
      preparation_steps: `TEST prep steps for ${rCfg.testDishName}`
    }).select();
    const rec = recRes[0];

    const recIngs = rCfg.ingredients.map(ing => ({
      recipe_id: rec.id,
      inventory_item_id: createdItemsMap[ing.name].id,
      quantity: ing.quantity,
      unit: ing.unit
    }));
    await supabase.from('inventory_recipe_ingredients').insert(recIngs);

    let totalCost = 0;
    for (const ing of rCfg.ingredients) {
      totalCost += ing.quantity * createdItemsMap[ing.name].cost_per_unit;
    }
    const price = Number(rCfg.menuItem.price || 100);
    const margin = price - totalCost;
    const marginPct = price > 0 ? (margin / price) * 100 : 0;
    console.log(`✅ Recipe Created for Dish "${rCfg.menuItem.name}" (${rCfg.testDishName}) | Price: ₹${price} | Cost: ₹${totalCost.toFixed(2)} | Margin: ₹${margin.toFixed(2)} (${marginPct.toFixed(1)}%)`);
  }

  // 4. CREATE WASTE ENTRIES
  console.log('\n--- STEP 4: Creating 2 TEST Waste Entries ---');
  const tomatoItem = createdItemsMap['TEST - Fresh Tomatoes'];
  const waste1Cost = 1 * tomatoItem.cost_per_unit; // 40.00
  const { data: w1Res, error: w1Err } = await supabase.from('inventory_waste').insert({
    restaurant_id: TARGET_REST_ID,
    inventory_item_id: tomatoItem.id,
    quantity: 1.0,
    unit: 'kg',
    waste_reason: 'TEST - Spoilage',
    cost_value: waste1Cost,
    logged_by: 'Owner',
    notes: 'TEST spoilage waste entry'
  }).select();

  const w1Id = w1Res && w1Res.length > 0 ? w1Res[0].id : null;

  await supabase.from('inventory_transactions').insert({
    restaurant_id: TARGET_REST_ID,
    inventory_item_id: tomatoItem.id,
    quantity: -1.0,
    unit: 'kg',
    before_stock: 33.0,
    after_stock: 32.0,
    transaction_type: 'WASTE',
    reference_type: 'WASTE_LOG',
    reference_id: w1Id,
    user_name: 'Owner',
    notes: 'TEST - Spoilage waste logged for Fresh Tomatoes'
  });
  console.log(`✅ Created Waste Entry #1: 1.0 kg TEST - Fresh Tomatoes (Reason: TEST - Spoilage, Cost: ₹${waste1Cost.toFixed(2)})`);

  const paneerItem = createdItemsMap['TEST - Fresh Paneer'];
  const waste2Cost = 0.5 * paneerItem.cost_per_unit; // 150.00
  const { data: w2Res, error: w2Err } = await supabase.from('inventory_waste').insert({
    restaurant_id: TARGET_REST_ID,
    inventory_item_id: paneerItem.id,
    quantity: 0.5,
    unit: 'kg',
    waste_reason: 'TEST - Expired',
    cost_value: waste2Cost,
    logged_by: 'Owner',
    notes: 'TEST expired waste entry'
  }).select();

  const w2Id = w2Res && w2Res.length > 0 ? w2Res[0].id : null;

  await supabase.from('inventory_transactions').insert({
    restaurant_id: TARGET_REST_ID,
    inventory_item_id: paneerItem.id,
    quantity: -0.5,
    unit: 'kg',
    before_stock: 15.0,
    after_stock: 14.5,
    transaction_type: 'WASTE',
    reference_type: 'WASTE_LOG',
    reference_id: w2Id,
    user_name: 'Owner',
    notes: 'TEST - Expired waste logged for Fresh Paneer'
  });
  console.log(`✅ Created Waste Entry #2: 0.5 kg TEST - Fresh Paneer (Reason: TEST - Expired, Cost: ₹${waste2Cost.toFixed(2)})`);

  // 5. CONTROLLED STOCK CONSUMPTION TRANSACTION
  console.log('\n--- STEP 5: Creating Controlled Stock Consumption Transaction ---');
  const dalItem = createdItemsMap['TEST - Yellow Dal'];

  const idempotencyKey = `TEST_IDEMPOTENCY_CONSUMPTION_${Date.now()}`;
  await supabase.from('inventory_transactions').insert([
    {
      restaurant_id: TARGET_REST_ID,
      inventory_item_id: dalItem.id,
      quantity: -0.15,
      unit: 'kg',
      before_stock: 30.0,
      after_stock: 29.85,
      transaction_type: 'ORDER_CONSUMPTION',
      reference_type: 'ORDER',
      idempotency_key: `${idempotencyKey}_dal`,
      user_name: 'TEST Runner',
      notes: 'TEST Order consumption: 1x Dal Dish (-0.15kg Yellow Dal)'
    },
    {
      restaurant_id: TARGET_REST_ID,
      inventory_item_id: tomatoItem.id,
      quantity: -0.05,
      unit: 'kg',
      before_stock: 32.0,
      after_stock: 31.95,
      transaction_type: 'ORDER_CONSUMPTION',
      reference_type: 'ORDER',
      idempotency_key: `${idempotencyKey}_tomato`,
      user_name: 'TEST Runner',
      notes: 'TEST Order consumption: 1x Dal Dish (-0.05kg Fresh Tomatoes)'
    }
  ]);
  console.log(`✅ Controlled Stock Consumption logged with idempotency key.`);

  // 6. LOW & ZERO STOCK ALERTS
  console.log('\n--- STEP 6: Generating Low & Zero Stock Alerts ---');
  const spiceItem = createdItemsMap['TEST - Spice Mix'];
  const waterItem = createdItemsMap['TEST - Water'];

  await supabase.from('inventory_alerts').insert([
    {
      restaurant_id: TARGET_REST_ID,
      inventory_item_id: spiceItem.id,
      alert_type: 'LOW_STOCK',
      current_stock: spiceItem.current_stock,
      minimum_stock: spiceItem.minimum_stock,
      unit: spiceItem.unit,
      is_acknowledged: false,
      notes: 'TEST Low Stock: 0.20 kg < 0.25 kg min threshold'
    },
    {
      restaurant_id: TARGET_REST_ID,
      inventory_item_id: waterItem.id,
      alert_type: 'OUT_OF_STOCK',
      current_stock: 0,
      minimum_stock: waterItem.minimum_stock,
      unit: waterItem.unit,
      is_acknowledged: false,
      notes: 'TEST Out of Stock: 0 bottles'
    }
  ]);
  console.log(`✅ Created Low Stock Alert for TEST - Spice Mix (0.20kg < 0.25kg min)`);
  console.log(`✅ Created Out of Stock Alert for TEST - Water (0 bottles)`);

  console.log('\n=== CONTROLLED TEST DATA SETUP COMPLETED FOR THE FOODY HUB ===\n');
}

setupFoodyHubData().catch(err => {
  console.error('❌ Error setting up data:', err);
  process.exit(1);
});
