const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-'
);

async function inspectOrders() {
  const { data: sample } = await supabase.from('orders').select('*').limit(1);
  if (sample && sample[0]) {
    console.log('Order columns:', Object.keys(sample[0]));
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, table_id, table_name, status, payment_status, created_at, updated_at')
    .or('table_id.eq.782fb629-239e-4396-b653-340cf8d17e45,table_name.ilike.%12%')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Orders for Table 12:');
  console.table(orders);
}

inspectOrders().catch(console.error);
