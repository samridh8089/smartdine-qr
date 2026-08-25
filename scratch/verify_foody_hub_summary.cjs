const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9';

async function verifyFoodyHubSummary() {
  console.log('=== FINAL READ-ONLY VERIFICATION FOR THE FOODY HUB ===\n');

  const { data: rest } = await supabase.from('restaurants').select('*').eq('id', TARGET_REST_ID).single();
  console.log(`Current Restaurant ID: ${rest.id} | Name: "${rest.name.trim()}"`);

  // REAL DATA UNTOUCHED VERIFICATION
  const { data: realItems } = await supabase.from('inventory_items').select('*').eq('restaurant_id', TARGET_REST_ID).not('name', 'like', 'TEST - %');
  console.log('\n--- REAL INVENTORY ITEMS (UNTOUCHED PROOF) ---');
  realItems.forEach(i => console.log(`  - [REAL] ${i.name} (${i.unit}, Stock: ${i.current_stock}, Cost: ₹${i.cost_per_unit})`));

  // TEST INVENTORY ITEMS
  const { data: testItems } = await supabase.from('inventory_items').select('*').eq('restaurant_id', TARGET_REST_ID).like('name', 'TEST - %');
  console.log(`\n--- TEST INVENTORY ITEMS (${testItems.length}) ---`);
  testItems.forEach(i => {
    let status = 'In Stock';
    if (i.current_stock <= 0) status = 'OUT OF STOCK';
    else if (i.current_stock <= i.minimum_stock) status = 'LOW STOCK';
    console.log(`  - ${i.name} | Unit: ${i.unit} | Stock: ${i.current_stock} ${i.unit} | Min: ${i.minimum_stock} | Cost: ₹${i.cost_per_unit} | Status: ${status}`);
  });

  // TEST PURCHASES
  const { data: purchases } = await supabase.from('inventory_purchases').select('*, items:inventory_purchase_items(*)').eq('restaurant_id', TARGET_REST_ID).like('invoice_number', 'TEST-PUR-%');
  console.log(`\n--- TEST PURCHASES (${purchases.length}) ---`);
  purchases.forEach(p => console.log(`  - ${p.invoice_number} | Supplier: ${p.supplier_name} | Total: ₹${p.total_amount}`));

  // TEST WASTE
  const { data: waste } = await supabase.from('inventory_waste').select('*, item:inventory_items(name)').eq('restaurant_id', TARGET_REST_ID);
  console.log(`\n--- TEST WASTE ENTRIES (${waste.length}) ---`);
  waste.forEach(w => console.log(`  - Item: ${w.item?.name} | Qty: ${w.quantity} ${w.unit} | Reason: ${w.waste_reason} | Cost: ₹${w.cost_value}`));

  // TEST RECIPES
  const { data: recipes } = await supabase.from('inventory_recipes').select('*, dish:menu_items(name, price, is_available), ingredients:inventory_recipe_ingredients(*, item:inventory_items(name, cost_per_unit))').eq('restaurant_id', TARGET_REST_ID);
  console.log(`\n--- CONFIGURATED RECIPES (${recipes.length}) ---`);
  recipes.forEach(r => {
    let cost = 0;
    r.ingredients.forEach(ing => {
      cost += Number(ing.quantity) * Number(ing.item?.cost_per_unit || 0);
    });
    const price = Number(r.dish?.price || 0);
    const margin = price - cost;
    const marginPct = price > 0 ? (margin / price) * 100 : 0;
    console.log(`  - Dish: "${r.dish?.name}" | Price: ₹${price} | Cost: ₹${cost.toFixed(2)} | Margin: ₹${margin.toFixed(2)} (${marginPct.toFixed(1)}%) | Available: ${r.dish?.is_available}`);
  });

  // LEDGER
  const { data: ledger } = await supabase.from('inventory_transactions').select('*').eq('restaurant_id', TARGET_REST_ID);
  console.log(`\n--- TRANSACTION LEDGER (${ledger.length} total entries for restaurant) ---`);

  // ALERTS
  const { data: alerts } = await supabase.from('inventory_alerts').select('*, item:inventory_items(name)').eq('restaurant_id', TARGET_REST_ID);
  console.log(`\n--- INVENTORY ALERTS (${alerts.length}) ---`);
  alerts.forEach(a => console.log(`  - [${a.alert_type}] Item: ${a.item?.name} | Current: ${a.current_stock} | Min: ${a.minimum_stock}`));
}

verifyFoodyHubSummary().catch(console.error);
