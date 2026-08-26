const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySummary() {
  const { data: restaurants } = await supabase.from('restaurants').select('*').limit(1);
  const rest = restaurants[0];

  const { data: items } = await supabase.from('inventory_items').select('*').eq('restaurant_id', rest.id).like('name', 'TEST - %');
  const { data: purchases } = await supabase.from('inventory_purchases').select('*').eq('restaurant_id', rest.id);
  const { data: waste } = await supabase.from('inventory_waste').select('*').eq('restaurant_id', rest.id);
  const { data: ledger } = await supabase.from('inventory_transactions').select('*').eq('restaurant_id', rest.id);
  const { data: recipes } = await supabase.from('inventory_recipes').select('*').eq('restaurant_id', rest.id);
  const { data: alerts } = await supabase.from('inventory_alerts').select('*').eq('restaurant_id', rest.id);

  console.log('=== SUMMARY OF CREATED TEST DATA ===\n');
  console.log(`1. Test Inventory Items: ${items ? items.length : 0}`);
  console.log(`2. Purchase Invoices: ${purchases ? purchases.length : 0}`);
  console.log(`3. Waste Log Entries: ${waste ? waste.length : 0}`);
  console.log(`4. Transaction Ledger Entries: ${ledger ? ledger.length : 0}`);
  console.log(`5. Configured Recipes: ${recipes ? recipes.length : 0}`);
  console.log(`6. Inventory Alerts: ${alerts ? alerts.length : 0}`);
}

verifySummary().catch(console.error);
