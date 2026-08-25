const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestData() {
  console.log('=== STARTING TEST DATA SETUP FOR INVENTORY & RECIPES ===\n');

  // 1. Fetch restaurant
  const { data: restaurants } = await supabase.from('restaurants').select('*').limit(1);
  const rest = restaurants[0];
  const restaurantId = rest.id;
  console.log(`Target Restaurant: ${rest.name} (${restaurantId})\n`);

  // Cleanup old TEST items if any exist to make this setup script re-runnable cleanly
  console.log('--- Cleaning up any prior TEST items ---');
  const { data: oldTestItems } = await supabase.from('inventory_items').select('id').eq('restaurant_id', restaurantId).like('name', 'TEST - %');
  if (oldTestItems && oldTestItems.length > 0) {
    const oldIds = oldTestItems.map(i => i.id);
    await supabase.from('inventory_recipe_ingredients').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_purchase_items').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_waste').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_alerts').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_transactions').delete().in('inventory_item_id', oldIds);
    await supabase.from('inventory_items').delete().in('id', oldIds);
    console.log(`Cleaned up ${oldIds.length} old TEST items.`);
  }

  // PART 2: CREATE TEST INVENTORY ITEMS
  console.log('\n--- PART 2: Creating Test Inventory Items ---');
  const testItemsConfig = [
    { name: 'TEST - Wheat Flour', category: 'Grains & Flour', unit: 'kg', current_stock: 15, minimum_stock: 5, opening_stock: 5, cost_per_unit: 45.00 },
    { name: 'TEST - Fresh Tomatoes', category: 'Vegetables', unit: 'kg', current_stock: 10, minimum_stock: 3, opening_stock: 0, cost_per_unit: 35.00 },
    { name: 'TEST - Fresh Paneer', category: 'Dairy', unit: 'kg', current_stock: 8, minimum_stock: 2, opening_stock: 3, cost_per_unit: 320.00 },
    { name: 'TEST - Cooking Oil', category: 'Oils & Fats', unit: 'litre', current_stock: 12, minimum_stock: 4, opening_stock: 2, cost_per_unit: 140.00 },
    { name: 'TEST - Yellow Dal', category: 'Pulses', unit: 'kg', current_stock: 10, minimum_stock: 3, opening_stock: 0, cost_per_unit: 110.00 },
    { name: 'TEST - Milk', category: 'Dairy', unit: 'ml', current_stock: 5000, minimum_stock: 1000, opening_stock: 5000, cost_per_unit: 0.06 },
    { name: 'TEST - Butter', category: 'Dairy', unit: 'gram', current_stock: 2000, minimum_stock: 500, opening_stock: 2000, cost_per_unit: 0.50 },
    { name: 'TEST - Spice Packet', category: 'Spices', unit: 'packet', current_stock: 3, minimum_stock: 10, opening_stock: 3, cost_per_unit: 25.00 }, // LOW STOCK
    { name: 'TEST - Water Bottle', category: 'Beverages', unit: 'bottle', current_stock: 0, minimum_stock: 10, opening_stock: 0, cost_per_unit: 12.00 }, // OUT OF STOCK
    { name: 'TEST - Ice Cream Scoop', category: 'Desserts', unit: 'scoop', current_stock: 50, minimum_stock: 10, opening_stock: 0, cost_per_unit: 15.00 } // CUSTOM UNIT
  ];

  const createdItemsMap = {};
  for (const cfg of testItemsConfig) {
    const { data: item, error } = await supabase.from('inventory_items').insert({
      restaurant_id: restaurantId,
      ...cfg,
      is_active: true
    }).select().single();
    if (error) throw new Error(`Failed to create item ${cfg.name}: ${error.message}`);
    createdItemsMap[cfg.name] = item;
    console.log(`✅ Created Item: ${item.name} | Unit: ${item.unit} | Stock: ${item.current_stock} ${item.unit} | Cost: ₹${item.cost_per_unit}`);
  }

  // PART 3: STOCK-IN / PURCHASE ENTRIES
  console.log('\n--- PART 3: Creating Purchase & Stock-In Entries ---');
  // Purchase #1
  const { data: pur1Res } = await supabase.from('inventory_purchases').insert({
    restaurant_id: restaurantId,
    supplier_name: 'Metro Wholesale Traders',
    invoice_number: 'PUR-2026-001',
    total_amount: 3450.00,
    notes: 'Bulk weekly raw material purchase',
    created_by: 'Owner'
  }).select();

  const pur1 = pur1Res && pur1Res.length > 0 ? pur1Res[0] : null;
  if (!pur1) throw new Error('Failed to insert Purchase #1');

  const purItems1 = [
    { purchase_id: pur1.id, inventory_item_id: createdItemsMap['TEST - Wheat Flour'].id, quantity: 10, unit: 'kg', unit_cost: 45.00, total_cost: 450.00 },
    { purchase_id: pur1.id, inventory_item_id: createdItemsMap['TEST - Fresh Paneer'].id, quantity: 5, unit: 'kg', unit_cost: 320.00, total_cost: 1600.00 },
    { purchase_id: pur1.id, inventory_item_id: createdItemsMap['TEST - Cooking Oil'].id, quantity: 10, unit: 'litre', unit_cost: 140.00, total_cost: 1400.00 }
  ];
  await supabase.from('inventory_purchase_items').insert(purItems1);

  // Log purchase transactions in Transaction Ledger
  for (const pi of purItems1) {
    const item = Object.values(createdItemsMap).find(i => i.id === pi.inventory_item_id);
    await supabase.from('inventory_transactions').insert({
      restaurant_id: restaurantId,
      inventory_item_id: pi.inventory_item_id,
      quantity: pi.quantity,
      unit: pi.unit,
      before_stock: item.opening_stock,
      after_stock: item.opening_stock + pi.quantity,
      transaction_type: 'PURCHASE',
      reference_type: 'PURCHASE_INVOICE',
      reference_id: pur1.id,
      user_name: 'Owner',
      notes: `Purchase invoice #${pur1.invoice_number} from ${pur1.supplier_name}`
    });
  }
  console.log(`✅ Purchase Invoice #${pur1.invoice_number} created with 3 stock-in items.`);

  // Purchase #2
  const { data: pur2Res } = await supabase.from('inventory_purchases').insert({
    restaurant_id: restaurantId,
    supplier_name: 'Local Dairy & Farm Fresh',
    invoice_number: 'PUR-2026-002',
    total_amount: 2200.00,
    notes: 'Vegetables, Pulses & Custom Unit Scoop Purchase',
    created_by: 'Owner'
  }).select();

  const pur2 = pur2Res && pur2Res.length > 0 ? pur2Res[0] : null;
  if (!pur2) throw new Error('Failed to insert Purchase #2');

  const purItems2 = [
    { purchase_id: pur2.id, inventory_item_id: createdItemsMap['TEST - Fresh Tomatoes'].id, quantity: 10, unit: 'kg', unit_cost: 35.00, total_cost: 350.00 },
    { purchase_id: pur2.id, inventory_item_id: createdItemsMap['TEST - Yellow Dal'].id, quantity: 10, unit: 'kg', unit_cost: 110.00, total_cost: 1100.00 },
    { purchase_id: pur2.id, inventory_item_id: createdItemsMap['TEST - Ice Cream Scoop'].id, quantity: 50, unit: 'scoop', unit_cost: 15.00, total_cost: 750.00 }
  ];
  await supabase.from('inventory_purchase_items').insert(purItems2);

  for (const pi of purItems2) {
    const item = Object.values(createdItemsMap).find(i => i.id === pi.inventory_item_id);
    await supabase.from('inventory_transactions').insert({
      restaurant_id: restaurantId,
      inventory_item_id: pi.inventory_item_id,
      quantity: pi.quantity,
      unit: pi.unit,
      before_stock: item.opening_stock,
      after_stock: item.opening_stock + pi.quantity,
      transaction_type: 'PURCHASE',
      reference_type: 'PURCHASE_INVOICE',
      reference_id: pur2.id,
      user_name: 'Owner',
      notes: `Purchase invoice #${pur2.invoice_number} from ${pur2.supplier_name}`
    });
  }
  console.log(`✅ Purchase Invoice #${pur2.invoice_number} created with 3 stock-in items.`);

  // PART 4 & 5: CREATE REALISTIC RECIPES & PORTION VARIANTS
  console.log('\n--- PART 4 & 5: Creating Recipes for Menu Items & Portion Variants ---');

  // Fetch Menu Items
  const { data: menuItems } = await supabase.from('menu_items').select('*, variants:menu_item_variants(*)').eq('restaurant_id', restaurantId);
  const paneerDish = menuItems.find(m => m.name === 'Paneer Butter Masala');
  const dalDish = menuItems.find(m => m.name === 'Dal Tadka');
  const parathaDish = menuItems.find(m => m.name === 'Aloo Paratha');
  const coffeeDish = menuItems.find(m => m.name === 'Cold Coffee');

  // Recipe 1: Paneer Butter Masala
  if (paneerDish) {
    const { data: r1 } = await supabase.from('inventory_recipes').upsert({
      restaurant_id: restaurantId,
      menu_item_id: paneerDish.id,
      serving_size: '1 Portion',
      preparation_steps: 'Sauté tomatoes and spices in oil and butter. Add paneer cubes and simmer.',
      notes: 'Contains dairy and tomatoes'
    }, { onConflict: 'restaurant_id,menu_item_id' }).select().single();

    await supabase.from('inventory_recipe_ingredients').delete().eq('recipe_id', r1.id);
    await supabase.from('inventory_recipe_ingredients').insert([
      { recipe_id: r1.id, inventory_item_id: createdItemsMap['TEST - Fresh Paneer'].id, quantity: 200, unit: 'gram' },
      { recipe_id: r1.id, inventory_item_id: createdItemsMap['TEST - Fresh Tomatoes'].id, quantity: 150, unit: 'gram' },
      { recipe_id: r1.id, inventory_item_id: createdItemsMap['TEST - Cooking Oil'].id, quantity: 20, unit: 'ml' },
      { recipe_id: r1.id, inventory_item_id: createdItemsMap['TEST - Butter'].id, quantity: 30, unit: 'gram' }
    ]);
    console.log(`✅ Recipe created for ${paneerDish.name} (Selling Price ₹${paneerDish.price})`);

    // Variants for Paneer Butter Masala
    if (paneerDish.variants && paneerDish.variants.length > 0) {
      for (const v of paneerDish.variants) {
        const { data: vr } = await supabase.from('inventory_recipes').upsert({
          restaurant_id: restaurantId,
          menu_item_id: paneerDish.id,
          variant_id: v.id,
          serving_size: v.name,
          preparation_steps: `Prep steps for ${v.name} portion`
        }, { onConflict: 'restaurant_id,menu_item_id,variant_id' }).select().single();

        await supabase.from('inventory_recipe_ingredients').delete().eq('recipe_id', vr.id);
        const paneerQty = v.name === 'Half' ? 100 : 200;
        const tomatoQty = v.name === 'Half' ? 80 : 150;
        const oilQty = v.name === 'Half' ? 10 : 20;
        const butterQty = v.name === 'Half' ? 15 : 30;

        await supabase.from('inventory_recipe_ingredients').insert([
          { recipe_id: vr.id, inventory_item_id: createdItemsMap['TEST - Fresh Paneer'].id, quantity: paneerQty, unit: 'gram' },
          { recipe_id: vr.id, inventory_item_id: createdItemsMap['TEST - Fresh Tomatoes'].id, quantity: tomatoQty, unit: 'gram' },
          { recipe_id: vr.id, inventory_item_id: createdItemsMap['TEST - Cooking Oil'].id, quantity: oilQty, unit: 'ml' },
          { recipe_id: vr.id, inventory_item_id: createdItemsMap['TEST - Butter'].id, quantity: butterQty, unit: 'gram' }
        ]);
        console.log(`   └ Variant Recipe created for ${paneerDish.name} (${v.name}: ₹${v.price})`);
      }
    }
  }

  // Recipe 2: Dal Tadka
  if (dalDish) {
    const { data: r2 } = await supabase.from('inventory_recipes').upsert({
      restaurant_id: restaurantId,
      menu_item_id: dalDish.id,
      serving_size: '1 Bowl',
      preparation_steps: 'Boil yellow dal, temper with oil, spices and chopped tomatoes.'
    }, { onConflict: 'restaurant_id,menu_item_id' }).select().single();

    await supabase.from('inventory_recipe_ingredients').delete().eq('recipe_id', r2.id);
    await supabase.from('inventory_recipe_ingredients').insert([
      { recipe_id: r2.id, inventory_item_id: createdItemsMap['TEST - Yellow Dal'].id, quantity: 150, unit: 'gram' },
      { recipe_id: r2.id, inventory_item_id: createdItemsMap['TEST - Fresh Tomatoes'].id, quantity: 50, unit: 'gram' },
      { recipe_id: r2.id, inventory_item_id: createdItemsMap['TEST - Cooking Oil'].id, quantity: 15, unit: 'ml' }
    ]);
    console.log(`✅ Recipe created for ${dalDish.name} (Selling Price ₹${dalDish.price})`);
  }

  // Recipe 3: Aloo Paratha
  if (parathaDish) {
    const { data: r3 } = await supabase.from('inventory_recipes').upsert({
      restaurant_id: restaurantId,
      menu_item_id: parathaDish.id,
      serving_size: '1 Plate (2 Parathas)',
      preparation_steps: 'Knead wheat flour, stuff with spiced potatoes, cook on tawa with butter.'
    }, { onConflict: 'restaurant_id,menu_item_id' }).select().single();

    await supabase.from('inventory_recipe_ingredients').delete().eq('recipe_id', r3.id);
    await supabase.from('inventory_recipe_ingredients').insert([
      { recipe_id: r3.id, inventory_item_id: createdItemsMap['TEST - Wheat Flour'].id, quantity: 150, unit: 'gram' },
      { recipe_id: r3.id, inventory_item_id: createdItemsMap['TEST - Butter'].id, quantity: 20, unit: 'gram' }
    ]);
    console.log(`✅ Recipe created for ${parathaDish.name} (Selling Price ₹${parathaDish.price})`);
  }

  // Recipe 4: Cold Coffee
  if (coffeeDish) {
    const { data: r4 } = await supabase.from('inventory_recipes').upsert({
      restaurant_id: restaurantId,
      menu_item_id: coffeeDish.id,
      serving_size: '1 Glass',
      preparation_steps: 'Blend chilled milk, coffee decoction, sugar and top with 1 ice cream scoop.'
    }, { onConflict: 'restaurant_id,menu_item_id' }).select().single();

    await supabase.from('inventory_recipe_ingredients').delete().eq('recipe_id', r4.id);
    await supabase.from('inventory_recipe_ingredients').insert([
      { recipe_id: r4.id, inventory_item_id: createdItemsMap['TEST - Milk'].id, quantity: 250, unit: 'ml' },
      { recipe_id: r4.id, inventory_item_id: createdItemsMap['TEST - Ice Cream Scoop'].id, quantity: 1, unit: 'scoop' }
    ]);
    console.log(`✅ Recipe created for ${coffeeDish.name} (Selling Price ₹${coffeeDish.price})`);
  }

  // PART 6: STOCK CONSUMPTION TEST DATA
  console.log('\n--- PART 6: Creating Stock Consumption Transaction ---');
  const dalItem = createdItemsMap['TEST - Yellow Dal'];
  const tomatoItem = createdItemsMap['TEST - Fresh Tomatoes'];
  const oilItem = createdItemsMap['TEST - Cooking Oil'];

  // Simulate 1 order consumption of Dal Tadka (0.15kg Dal, 0.05kg Tomato, 0.015l Oil)
  const orderIdempotency = `TEST_ORDER_CONSUMPTION_${Date.now()}`;
  await supabase.from('inventory_transactions').insert([
    {
      restaurant_id: restaurantId,
      inventory_item_id: dalItem.id,
      quantity: -0.15,
      unit: 'kg',
      before_stock: dalItem.current_stock,
      after_stock: dalItem.current_stock - 0.15,
      transaction_type: 'ORDER_CONSUMPTION',
      reference_type: 'ORDER',
      idempotency_key: `${orderIdempotency}_dal`,
      user_name: 'Customer QR',
      notes: 'Stock consumed for Order #ORD-1001 (1x Dal Tadka)'
    },
    {
      restaurant_id: restaurantId,
      inventory_item_id: tomatoItem.id,
      quantity: -0.05,
      unit: 'kg',
      before_stock: tomatoItem.current_stock,
      after_stock: tomatoItem.current_stock - 0.05,
      transaction_type: 'ORDER_CONSUMPTION',
      reference_type: 'ORDER',
      idempotency_key: `${orderIdempotency}_tomato`,
      user_name: 'Customer QR',
      notes: 'Stock consumed for Order #ORD-1001 (1x Dal Tadka)'
    }
  ]);
  // Update current stock for consumed items
  await supabase.from('inventory_items').update({ current_stock: dalItem.current_stock - 0.15 }).eq('id', dalItem.id);
  await supabase.from('inventory_items').update({ current_stock: tomatoItem.current_stock - 0.05 }).eq('id', tomatoItem.id);
  console.log(`✅ Stock Consumption logged for Order #ORD-1001: Dal -0.15kg, Tomatoes -0.05kg.`);

  // PART 7: WASTE MANAGEMENT TEST DATA
  console.log('\n--- PART 7: Creating Waste Management Entries ---');
  // Waste #1
  const waste1Qty = 0.5; // 0.5 kg tomatoes
  const waste1Cost = waste1Qty * tomatoItem.cost_per_unit; // 0.5 * 35 = 17.50
  const { data: w1Res } = await supabase.from('inventory_waste').insert({
    restaurant_id: restaurantId,
    inventory_item_id: tomatoItem.id,
    quantity: waste1Qty,
    unit: 'kg',
    waste_reason: 'Spoilage',
    cost_value: waste1Cost,
    logged_by: 'Head Chef',
    notes: 'Overripe tomatoes spoiled in storage crate'
  }).select();

  const w1Id = w1Res && w1Res.length > 0 ? w1Res[0].id : null;

  await supabase.from('inventory_transactions').insert({
    restaurant_id: restaurantId,
    inventory_item_id: tomatoItem.id,
    quantity: -waste1Qty,
    unit: 'kg',
    before_stock: tomatoItem.current_stock - 0.05,
    after_stock: tomatoItem.current_stock - 0.05 - waste1Qty,
    transaction_type: 'WASTE',
    reference_type: 'WASTE_LOG',
    reference_id: w1Id,
    user_name: 'Head Chef',
    notes: 'Spoilage waste logged: Overripe tomatoes'
  });
  await supabase.from('inventory_items').update({ current_stock: tomatoItem.current_stock - 0.05 - waste1Qty }).eq('id', tomatoItem.id);
  console.log(`✅ Waste Entry #1 created: 0.5 kg Tomatoes (Reason: Spoilage, Cost: ₹${waste1Cost.toFixed(2)})`);

  // Waste #2
  const paneerItem = createdItemsMap['TEST - Fresh Paneer'];
  const waste2Qty = 0.2; // 0.2 kg Paneer
  const waste2Cost = waste2Qty * paneerItem.cost_per_unit; // 0.2 * 320 = 64.00
  const { data: w2Res } = await supabase.from('inventory_waste').insert({
    restaurant_id: restaurantId,
    inventory_item_id: paneerItem.id,
    quantity: waste2Qty,
    unit: 'kg',
    waste_reason: 'Kitchen Waste',
    cost_value: waste2Cost,
    logged_by: 'Sous Chef',
    notes: 'Trimmed uneven paneer edges during prep'
  }).select();

  const w2Id = w2Res && w2Res.length > 0 ? w2Res[0].id : null;

  await supabase.from('inventory_transactions').insert({
    restaurant_id: restaurantId,
    inventory_item_id: paneerItem.id,
    quantity: -waste2Qty,
    unit: 'kg',
    before_stock: paneerItem.current_stock,
    after_stock: paneerItem.current_stock - waste2Qty,
    transaction_type: 'WASTE',
    reference_type: 'WASTE_LOG',
    reference_id: w2Id,
    user_name: 'Sous Chef',
    notes: 'Kitchen waste logged: Paneer prep trimming'
  });
  await supabase.from('inventory_items').update({ current_stock: paneerItem.current_stock - waste2Qty }).eq('id', paneerItem.id);
  console.log(`✅ Waste Entry #2 created: 0.2 kg Paneer (Reason: Kitchen Waste, Cost: ₹${waste2Cost.toFixed(2)})`);

  // PART 8, 9 & 10: LOW STOCK, OUT OF STOCK & ALERTS
  console.log('\n--- PART 8, 9 & 10: Generating Inventory Alerts ---');
  const spiceItem = createdItemsMap['TEST - Spice Packet'];
  const waterItem = createdItemsMap['TEST - Water Bottle'];

  // Alert #1: Low Stock
  await supabase.from('inventory_alerts').insert({
    restaurant_id: restaurantId,
    inventory_item_id: spiceItem.id,
    alert_type: 'LOW_STOCK',
    current_stock: spiceItem.current_stock,
    minimum_stock: spiceItem.minimum_stock,
    unit: spiceItem.unit,
    is_acknowledged: false,
    notes: 'Stock level (3 packets) below minimum threshold (10 packets)'
  });
  console.log(`✅ Low Stock Alert created for ${spiceItem.name} (3 packets < 10 min)`);

  // Alert #2: Out of Stock
  await supabase.from('inventory_alerts').insert({
    restaurant_id: restaurantId,
    inventory_item_id: waterItem.id,
    alert_type: 'OUT_OF_STOCK',
    current_stock: 0,
    minimum_stock: waterItem.minimum_stock,
    unit: waterItem.unit,
    is_acknowledged: false,
    notes: 'Item completely out of stock'
  });
  console.log(`✅ Out of Stock Alert created for ${waterItem.name} (0 bottles)`);

  console.log('\n=== TEST DATA SETUP COMPLETED SUCCESSFULLY ===\n');
}

setupTestData().catch(err => {
  console.error('❌ Error setting up test data:', err);
  process.exit(1);
});
