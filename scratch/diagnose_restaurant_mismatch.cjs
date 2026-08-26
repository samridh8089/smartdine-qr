const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runDiagnosis() {
  console.log('=== READ-ONLY INVESTIGATION: RESTAURANT & TEST DATA MISMATCH ===\n');

  // STEP 1 — LIST ALL RESTAURANTS
  console.log('--- STEP 1: RESTAURANT IDENTIFICATION ---');
  const { data: restaurants } = await supabase.from('restaurants').select('*');
  const labhgarh = restaurants.find(r => r.slug === 'labhgarh' || r.name === 'labhgarh');
  const foodyHub = restaurants.find(r => r.name.toLowerCase().includes('foody hub') || r.slug === 'bistro');

  console.log(`- Target Restaurant used in setup script: "${labhgarh?.name}" [ID: ${labhgarh?.id}]`);
  console.log(`- Currently Logged-in User Restaurant: "${foodyHub?.name.trim()}" [ID: ${foodyHub?.id}, Slug: ${foodyHub?.slug}]`);

  // STEP 2 & 3 — LOCATE TEST DATA RECORDS ACROSS ALL RESTAURANTS
  console.log('\n--- STEP 2 & 3: SEARCHING TEST DATA RECORDS BY RESTAURANT ID ---');
  const { data: testItems } = await supabase.from('inventory_items').select('*').like('name', 'TEST - %');
  console.log(`Total TEST inventory items found in database: ${testItems ? testItems.length : 0}`);
  if (testItems) {
    testItems.forEach(i => {
      const restName = restaurants.find(r => r.id === i.restaurant_id)?.name || 'UNKNOWN';
      console.log(`  - Item: "${i.name}" | Rest ID: ${i.restaurant_id} (${restName}) | Created At: ${i.created_at}`);
    });
  }

  const { data: purchases } = await supabase.from('inventory_purchases').select('*').like('invoice_number', 'PUR-2026-%');
  console.log(`\nTotal TEST purchases found: ${purchases ? purchases.length : 0}`);
  if (purchases) {
    purchases.forEach(p => {
      const restName = restaurants.find(r => r.id === p.restaurant_id)?.name || 'UNKNOWN';
      console.log(`  - Purchase: ${p.invoice_number} | Rest ID: ${p.restaurant_id} (${restName}) | Amount: ₹${p.total_amount}`);
    });
  }

  const { data: waste } = await supabase.from('inventory_waste').select('*');
  console.log(`\nTotal waste records found in database: ${waste ? waste.length : 0}`);
  if (waste) {
    waste.forEach(w => {
      const restName = restaurants.find(r => r.id === w.restaurant_id)?.name || 'UNKNOWN';
      console.log(`  - Waste ID: ${w.id} | Item ID: ${w.inventory_item_id} | Rest ID: ${w.restaurant_id} (${restName}) | Reason: ${w.waste_reason}`);
    });
  }

  // STEP 4 & 6 — COUNT COMPARISON TABLE FOR BOTH RESTAURANTS
  console.log('\n--- STEP 4 & 6: COUNT BREAKDOWN BY RESTAURANT ---');
  const targetRests = [labhgarh, foodyHub].filter(Boolean);

  for (const r of targetRests) {
    const rItems = await supabase.from('inventory_items').select('*').eq('restaurant_id', r.id);
    const rPurchases = await supabase.from('inventory_purchases').select('*').eq('restaurant_id', r.id);
    const rWaste = await supabase.from('inventory_waste').select('*').eq('restaurant_id', r.id);
    const rRecipes = await supabase.from('inventory_recipes').select('*').eq('restaurant_id', r.id);
    const rLedger = await supabase.from('inventory_transactions').select('*').eq('restaurant_id', r.id);
    const rAlerts = await supabase.from('inventory_alerts').select('*').eq('restaurant_id', r.id);

    console.log(`\nRestaurant: "${r.name.trim()}" (slug: ${r.slug}) [ID: ${r.id}]`);
    console.log(`  - Total Inventory Items: ${rItems.data ? rItems.data.length : 0} (TEST items: ${rItems.data ? rItems.data.filter(i => i.name.startsWith('TEST - ')).length : 0})`);
    console.log(`  - Purchase Invoices: ${rPurchases.data ? rPurchases.data.length : 0}`);
    console.log(`  - Configured Recipes: ${rRecipes.data ? rRecipes.data.length : 0}`);
    console.log(`  - Waste Log Entries: ${rWaste.data ? rWaste.data.length : 0}`);
    console.log(`  - Transaction Ledger Entries: ${rLedger.data ? rLedger.data.length : 0}`);
    console.log(`  - Inventory Alerts: ${rAlerts.data ? rAlerts.data.length : 0}`);
    if (rItems.data && rItems.data.length > 0) {
      console.log('  - Actual Items List:');
      rItems.data.forEach(it => console.log(`      * [ID: ${it.id}] ${it.name} (${it.unit}, stock: ${it.current_stock})`));
    }
  }

  // STEP 5 — SUPABASE ENVIRONMENT VERIFICATION
  console.log('\n--- STEP 5: SUPABASE ENVIRONMENT VERIFICATION ---');
  console.log('Setup script Supabase Project URL:', supabaseUrl);
  console.log('Matching database: https://tiuwfhkrjvtkshebdwlp.supabase.co');
}

runDiagnosis().catch(console.error);
