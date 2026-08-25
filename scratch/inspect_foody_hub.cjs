const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9';

async function inspectFoodyHub() {
  console.log('=== INSPECTING THE FOODY HUB ===');
  const { data: rest } = await supabase.from('restaurants').select('*').eq('id', TARGET_REST_ID).single();
  console.log(`Restaurant Name: ${rest.name} | Slug: ${rest.slug} | ID: ${rest.id}`);

  const { data: categories } = await supabase.from('categories').select('*').eq('restaurant_id', TARGET_REST_ID);
  console.log(`Categories (${categories.length}):`, categories.map(c => c.name));

  const { data: menuItems } = await supabase.from('menu_items').select('*, variants:menu_item_variants(*)').eq('restaurant_id', TARGET_REST_ID);
  console.log(`\nMenu Items (${menuItems.length}):`);
  menuItems.forEach(m => console.log(` - [${m.id}] ${m.name} (Price: ₹${m.price}, Available: ${m.is_available})`));

  const { data: items } = await supabase.from('inventory_items').select('*').eq('restaurant_id', TARGET_REST_ID);
  console.log(`\nExisting Real Inventory Items (${items.length}):`);
  items.forEach(i => console.log(` - [${i.id}] ${i.name} (${i.unit}, Stock: ${i.current_stock}, Cost: ₹${i.cost_per_unit})`));
}

inspectFoodyHub().catch(console.error);
