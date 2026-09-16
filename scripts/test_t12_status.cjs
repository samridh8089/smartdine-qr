const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-'
);

async function check() {
  const restId = '9f3c15aa-7132-4742-8ebd-7ec97e68cf0e';
  
  // 1. Check orders query exactly as tableAssignments.js runs it:
  const { data: allOrders, error: oErr } = await supabase
    .from('orders')
    .select('id, table_id, table_name, status, payment_status, created_at')
    .eq('restaurant_id', restId)
    .not('status', 'in', '(completed,cancelled)');

  console.log('Orders not completed or cancelled according to .not("status", "in", "(completed,cancelled)"):');
  console.table(allOrders);

  // 2. Check all orders today
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, table_id, table_name, status, payment_status, created_at')
    .eq('restaurant_id', restId)
    .order('created_at', { ascending: false })
    .limit(10);
  console.log('\nRecent 10 orders:');
  console.table(recentOrders);

  // 3. Check web getTablesWithLiveStatus logic vs mobile fetchLiveTableStatus logic:
  const { data: rawTables } = await supabase.from('tables').select('*').eq('restaurant_id', restId).order('name');
  const { data: rest } = await supabase.from('restaurants').select('settings').eq('id', restId).maybeSingle();
  const tableStates = rest?.settings?.table_states || {};

  console.log('\nCheck Table 12 in web logic (src/lib/db.ts):');
  const t12 = rawTables.find(t => t.name === 'T-12');
  const state12 = tableStates[t12.id];
  console.log('T12 raw table:', t12);
  console.log('T12 state in restaurant.settings.table_states:', state12);

  const activeT12Orders = (allOrders || []).filter(o => o.table_id === t12.id || (o.table_name && o.table_name.toLowerCase() === t12.name.toLowerCase()));
  console.log('Active orders matching T12:', activeT12Orders.length);
  
  // In db.ts line 1411:
  // } else if (activeCount > 0 || state.manual_occupied === true || state.occupancy_status === 'occupied') {
  //   status = 'occupied';
  console.log('web db.ts status would be:', (activeT12Orders.length > 0 || state12?.manual_occupied === true || state12?.occupancy_status === 'occupied') ? 'OCCUPIED' : 'AVAILABLE');

  // In mobile tableAssignments.js line 167:
  // } else if (activeCount > 0) {
  //   status = 'occupied';
  console.log('mobile tableAssignments status would be:', activeT12Orders.length > 0 ? 'OCCUPIED' : 'AVAILABLE');
}

check().catch(console.error);
