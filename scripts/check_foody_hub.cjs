const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tiuwfhkrjvtkshebdwlp.supabase.co',
  'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-'
);

async function checkRest() {
  const restId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
  const { data: rest } = await supabase.from('restaurants').select('id, name, settings').eq('id', restId).single();
  console.log('Restaurant:', rest.id, rest.name);
  
  const { data: tables } = await supabase.from('tables').select('*').eq('restaurant_id', restId);
  const tableStates = rest.settings?.table_states || {};

  console.log('\n--- ALL TABLES & STATUS ---');
  const tableSummary = tables.map(t => {
    const st = tableStates[t.id] || {};
    return {
      id: t.id,
      name: t.name,
      db_status: t.status,
      occupancy_status: st.occupancy_status,
      manual_occupied: st.manual_occupied,
      occupied_at: st.occupied_at,
      current_session_id: st.current_session_id,
      qr_enabled: st.qr_enabled
    };
  });
  console.table(tableSummary);

  const occupiedTables = tableSummary.filter(t => t.occupancy_status === 'occupied' || t.manual_occupied === true);
  console.log('\nOCCUPIED TABLES COUNT:', occupiedTables.length);
  console.log('OCCUPIED TABLES:', occupiedTables);

  // Check all orders for T-7, T-12, T-13
  const targetTableIds = [
    '58d90386-f9cc-47b7-9339-bd8c7e9cbdb0', // T-7
    '782fb629-239e-4396-b653-340cf8d17e45', // T-12
    '5b785acd-7736-49f3-a147-ad82360bee29'  // T-13
  ];

  for (const tid of targetTableIds) {
    const { data: ords, error: oErr } = await supabase
      .from('orders')
      .select('id, table_id, table_name, status, payment_status, created_at')
      .eq('restaurant_id', restId)
      .eq('table_id', tid);
    console.log(`\nAll orders for table ${tid}:`);
    console.table(ords);

    const remainingActive = (ords || []).filter(
      o => !['completed', 'cancelled'].includes(o.status)
    );
    console.log(`Remaining active for ${tid}:`, remainingActive.length);
  }

  // Fetch active orders
  const { data: activeOrders } = await supabase
    .from('orders')
    .select('id, table_id, table_name, status, payment_status')
    .eq('restaurant_id', restId)
    .not('status', 'in', '("completed","cancelled")');

  // Simulate getTablesWithLiveStatus logic
  console.log('\n--- SIMULATING NEW getTablesWithLiveStatus ---');
  const enriched = tables.map(t => {
    const state = tableStates[t.id] || {};
    const qrEnabled = state.qr_enabled !== false;
    const isArchived = state.is_archived === true;

    // Active orders for this table
    const tblOrders = (activeOrders || []).filter(o => o.table_id === t.id || (o.table_name && o.table_name.toLowerCase() === t.name.toLowerCase()));
    const activeCount = tblOrders.length;

    const isManualStaffHold = state.manual_occupied === true && !state.current_session_id;

    let status = 'available';
    if (!qrEnabled || isArchived) {
      status = 'inactive';
    } else if (activeCount > 0 || isManualStaffHold) {
      status = 'occupied';
    } else if (state.occupancy_status === 'reserved') {
      status = 'reserved';
    } else {
      status = 'available';
    }

    return {
      id: t.id,
      name: t.name,
      activeCount,
      isManualStaffHold,
      resolvedStatus: status
    };
  });

  console.table(enriched);
  const occupiedCount = enriched.filter(t => t.resolvedStatus === 'occupied').length;
  const availableCount = enriched.filter(t => t.resolvedStatus === 'available').length;
  console.log(`SUMMARY: Total=${enriched.length}, Available=${availableCount}, Occupied=${occupiedCount}`);
}

checkRest().catch(console.error);
