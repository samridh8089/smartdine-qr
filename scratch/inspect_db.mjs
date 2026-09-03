import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('--- SUPABASE AUTH USERS ---');
  let allUsers = [];
  let page = 1;
  while (true) {
    const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (authErr) {
      console.error('Error listing auth users:', authErr);
      break;
    }
    allUsers.push(...authUsers.users);
    if (authUsers.users.length < 100) break;
    page++;
  }
  
  console.log(`Total auth.users: ${allUsers.length}`);
  allUsers.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}, Created: ${u.created_at}`));

  console.log('\n--- CHECKING TABLES ---');
  const candidateTables = [
    'restaurants',
    'profiles',
    'staff',
    'categories',
    'menu_categories',
    'tables',
    'dining_tables',
    'menu_items',
    'menu_item_variants',
    'orders',
    'order_batches',
    'order_items',
    'order_discounts',
    'bills',
    'notifications',
    'customer_requests',
    'audit_logs',
    'otp_sessions',
    'table_assignments',
    'table_merge_groups',
    'table_merge_members',
    'table_merge_sessions',
    'table_merge_session_members',
    'inventory_categories',
    'inventory_items',
    'inventory_recipes',
    'inventory_recipe_ingredients',
    'inventory_transactions',
    'inventory_purchases',
    'inventory_purchase_items',
    'inventory_waste',
    'inventory_alerts',
    'inventory_reservations',
    'prepared_food_dispositions',
    'pricing_plans',
    'offers'
  ];

  for (const t of candidateTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist
      } else {
        console.log(`Table ${t}: Error (${error.message})`);
      }
    } else {
      console.log(`Table ${t}: EXISTS, row count = ${count}`);
    }
  }
}

run().catch(console.error);
