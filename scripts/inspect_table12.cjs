const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspect() {
  const { data: rests, error: restErr } = await supabase.from('restaurants').select('id, name, slug');
  console.log('Restaurants:', rests, 'Error:', restErr);

  const { data: orders, error: ordErr } = await supabase
    .from('orders')
    .select('id, order_number, table_id, table_name, status, payment_status, created_at, restaurant_id')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('\nLatest 10 orders across entire DB:');
  console.table(orders);

  const { data: tables, error: tblErr } = await supabase.from('tables').select('id, name, restaurant_id');
  console.log('\nTables:');
  console.table(tables);
}

inspect().catch(console.error);
