const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-'
);

async function inspect() {
  console.log('Connecting to Supabase...');
  const { data: rests, error: rErr } = await supabase.from('restaurants').select('id, name, slug');
  console.log('Restaurants:', rests, rErr);

  const restId = rests?.[0]?.id;

  const { data: tables, error: tErr } = await supabase.from('tables').select('*').eq('restaurant_id', restId);
  console.log('\nTables for restaurant:');
  console.table(tables?.map(t => ({ id: t.id, name: t.name, status: t.status })));

  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, order_number, table_id, table_name, status, payment_status, created_at')
    .eq('restaurant_id', restId)
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('\nLatest 10 orders:');
  console.table(orders);

  // Check restaurant settings table_states
  const { data: rDetail } = await supabase.from('restaurants').select('settings').eq('id', restId).single();
  const tableStates = rDetail?.settings?.table_states || {};
  console.log('\ntable_states in restaurant.settings:');
  console.log(JSON.stringify(tableStates, null, 2));
}

inspect().catch(console.error);
