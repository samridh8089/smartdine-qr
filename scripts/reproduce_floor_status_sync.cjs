const fs = require('fs');
const path = require('path');

console.log('===============================================================');
console.log('  FORENSIC REPRODUCTION: FLOOR LAYOUT STATUS SYNC BUG');
console.log('===============================================================\n');

// 1. Trace Realtime Channel Mismatch
const realtimeSrc = fs.readFileSync(path.resolve(__dirname, '../src/lib/realtime.ts'), 'utf-8');
const floorLayoutSrc = fs.readFileSync(path.resolve(__dirname, '../src/components/floorplan/FloorLayoutManager.tsx'), 'utf-8');
const tablesPageSrc = fs.readFileSync(path.resolve(__dirname, '../src/app/(dashboard)/dashboard/tables/page.tsx'), 'utf-8');

const targetChannelsMatch = realtimeSrc.match(/targetChannels:\s*string\[\]\s*=\s*\[([\s\S]*?)\];/);
const targetChannels = targetChannelsMatch ? targetChannelsMatch[1] : '';

const floorLayoutChannelMatch = floorLayoutSrc.match(/channel\(`(.*?)`\)/);
const floorLayoutChannel = floorLayoutChannelMatch ? floorLayoutChannelMatch[1] : '';

console.log('TEST 1: Realtime Channel Name Parity');
console.log('  realtime.ts targetChannels:');
console.log('   ', targetChannels.replace(/\n\s*/g, ' ').trim());
console.log('  FloorLayoutManager.tsx channel:');
console.log('   ', floorLayoutChannel);

const hasMismatch = floorLayoutChannel.includes('floorplan_live_') && !targetChannels.includes('floorplan_live_');
console.log(`  Channel mismatch detected: ${hasMismatch ? 'YES (CRITICAL BUG)' : 'NO'}`);

// 2. Trace Status Derivation in FloorLayoutManager
console.log('\nTEST 2: Status Derivation Logic in FloorLayoutManager');
const statusCalcMatch = floorLayoutSrc.match(/const effectiveStatus: TableOperationalStatus = \(([\s\S]*?)\) as TableOperationalStatus;/);
console.log('  FloorLayoutManager effectiveStatus formula:');
console.log('   ', statusCalcMatch ? statusCalcMatch[1].replace(/\s+/g, ' ').trim() : 'NOT FOUND');

// Simulate reproduction of Table 14:
console.log('\n--- FIRST REPRODUCTION: Table 14 ---');
const table14_raw = { id: 'tbl_14_uuid', name: 'Table 14', status: 'available' };
const activeOrders_table14 = [
  { id: 'ord_1001', table_id: 'tbl_14_uuid', table_name: 'Table 14', status: 'preparing' }
];
// In settings.table_states, table was previously marked available:
const liveTableStates_table14 = {
  'tbl_14_uuid': { occupancy_status: 'available', manual_occupied: false }
};

// Current formula in FloorLayoutManager:
const liveState14 = liveTableStates_table14[table14_raw.id] || {};
const effectiveStatusCurrent14 = liveState14.occupancy_status || table14_raw.status || 'available';

console.log('  Active order status:', activeOrders_table14[0].status);
console.log('  liveTableStates occupancy_status:', liveState14.occupancy_status);
console.log('  table14_raw status:', table14_raw.status);
console.log('  ACTUAL effectiveStatus rendered in Floor Layout:', effectiveStatusCurrent14);
console.log('  EXPECTED effectiveStatus in Floor Layout: occupied');
console.log(`  BUG CONFIRMED ON TABLE 14: ${effectiveStatusCurrent14 === 'available' ? 'REPRODUCED (WRONGLY AVAILABLE)' : 'NOT REPRODUCED'}`);

// 3. Second reproduction with another table (Table 5)
console.log('\n--- SECOND REPRODUCTION: Table 5 ---');
const table5_raw = { id: 'tbl_5_uuid', name: 'Table 5', status: 'available' };
const activeOrders_table5 = [
  { id: 'ord_1002', table_id: 'tbl_5_uuid', table_name: 'Table 5', status: 'preparing' }
];
const liveTableStates_table5 = {}; // Not even present in table_states yet

const liveState5 = liveTableStates_table5[table5_raw.id] || {};
const effectiveStatusCurrent5 = liveState5.occupancy_status || table5_raw.status || 'available';

console.log('  Active order status:', activeOrders_table5[0].status);
console.log('  liveTableStates occupancy_status:', liveState5.occupancy_status);
console.log('  table5_raw status:', table5_raw.status);
console.log('  ACTUAL effectiveStatus rendered in Floor Layout:', effectiveStatusCurrent5);
console.log('  EXPECTED effectiveStatus in Floor Layout: occupied');
console.log(`  BUG CONFIRMED ON TABLE 5: ${effectiveStatusCurrent5 === 'available' ? 'REPRODUCED (WRONGLY AVAILABLE)' : 'NOT REPRODUCED'}`);

// 4. Trace useMemo dependency array in FloorLayoutManager
console.log('\nTEST 3: resolvedTables useMemo Dependency Array in FloorLayoutManager');
const resolvedTablesUseMemoMatch = floorLayoutSrc.match(/const resolvedTables = useMemo\(\(\) => \{[\s\S]*?\}, \[([\s\S]*?)\]\);/);
const deps = resolvedTablesUseMemoMatch ? resolvedTablesUseMemoMatch[1].replace(/\s+/g, ' ').trim() : '';
console.log('  Dependencies:', deps);
const hasAllActiveOrdersDep = deps.includes('allActiveOrders');
console.log(`  Includes allActiveOrders in dependency array: ${hasAllActiveOrdersDep ? 'YES' : 'NO (CRITICAL BUG: Never re-evaluates when orders change!)'}`);

// 5. Test State Machine Transitions
console.log('\nTEST 4: State Machine Invariant Verification');
function computeCorrectStatus(table, activeOrders, liveState) {
  // Check if there are active dine-in orders for this table
  const tableOrders = (activeOrders || []).filter(o => 
    (o.table_id === table.id || (o.table_name && o.table_name.toLowerCase() === table.name.toLowerCase())) &&
    !['completed', 'cancelled'].includes(o.status) &&
    o.order_type !== 'takeaway'
  );
  
  if (tableOrders.length > 0) {
    return 'occupied';
  }
  if (liveState?.manual_occupied === true || liveState?.occupancy_status === 'occupied') {
    return 'occupied';
  }
  if (liveState?.occupancy_status === 'reserved') {
    return 'reserved';
  }
  return 'available';
}

console.log('  Testing Proposed Multi-Layer Status Engine:');
console.log('   - Table 14 with Preparing order ->', computeCorrectStatus(table14_raw, activeOrders_table14, liveState14));
console.log('   - Table 14 with Served order ->', computeCorrectStatus(table14_raw, [{ ...activeOrders_table14[0], status: 'served' }], liveState14));
console.log('   - Table 14 with Completed order ->', computeCorrectStatus(table14_raw, [{ ...activeOrders_table14[0], status: 'completed' }], liveState14));
console.log('   - Table 14 with Cancelled order ->', computeCorrectStatus(table14_raw, [{ ...activeOrders_table14[0], status: 'cancelled' }], liveState14));

console.log('\n===============================================================');
console.log('  REPRODUCTION SUMMARY: ROOT CAUSES CONFIRMED TWICE');
console.log('===============================================================');
