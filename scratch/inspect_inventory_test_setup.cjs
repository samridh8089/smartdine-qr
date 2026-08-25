const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
  console.log('=== PART 1: INSPECTION OF EXISTING DATA ===\n');

  // 1. Restaurant
  const { data: restaurants } = await supabase.from('restaurants').select('*').limit(1);
  const rest = restaurants[0];
  console.log(`Target Restaurant: ${rest.name} (${rest.id})`);

  // 2. Inventory Items
  const { data: items } = await supabase.from('inventory_items').select('*').eq('restaurant_id', rest.id);
  console.log(`\n1. Inventory Items Count: ${items.length}`);
  items.forEach(i => {
    console.log(`   - [${i.id}] ${i.name} | Stock: ${i.current_stock} ${i.unit} | Min: ${i.minimum_stock} | Cost: ₹${i.cost_per_unit}`);
  });

  // 3. Menu Items & Variants
  const { data: menuItems } = await supabase.from('menu_items').select('*, variants:menu_item_variants(*)').eq('restaurant_id', rest.id);
  console.log(`\n2. Menu Items Count: ${menuItems.length}`);
  menuItems.slice(0, 10).forEach(m => {
    console.log(`   - [${m.id}] ${m.name} | Price: ₹${m.price} | Available: ${m.is_available} | Has Vars: ${m.has_variants}`);
    if (m.variants && m.variants.length > 0) {
      m.variants.forEach(v => {
        console.log(`     └ Variant: ${v.name} | Price: ₹${v.price} | Available: ${v.is_available}`);
      });
    }
  });

  // 4. Recipes & Ingredients
  const { data: recipes } = await supabase.from('inventory_recipes').select('*, ingredients:inventory_recipe_ingredients(*)').eq('restaurant_id', rest.id);
  console.log(`\n3. Recipes Count: ${recipes.length}`);
  recipes.forEach(r => {
    console.log(`   - Recipe ID: ${r.id} | Dish ID: ${r.menu_item_id} | Ingredients: ${r.ingredients ? r.ingredients.length : 0}`);
  });

  // 5. Purchases
  const { data: purchases } = await supabase.from('inventory_purchases').select('*, items:inventory_purchase_items(*)').eq('restaurant_id', rest.id);
  console.log(`\n4. Purchases Count: ${purchases ? purchases.length : 0}`);

  // 6. Waste
  const { data: waste } = await supabase.from('inventory_waste').select('*').eq('restaurant_id', rest.id);
  console.log(`\n5. Waste Entries Count: ${waste ? waste.length : 0}`);

  // 7. Ledger
  const { data: ledger } = await supabase.from('inventory_transactions').select('*').eq('restaurant_id', rest.id);
  console.log(`\n6. Transaction Ledger Count: ${ledger ? ledger.length : 0}`);
}

inspectData().catch(console.error);
