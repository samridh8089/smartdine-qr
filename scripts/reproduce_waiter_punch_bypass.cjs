const fs = require('fs');

async function verifyWaiterPunchTableBypass() {
  console.log('=== VERIFYING P1-WAITER: PUNCH ORDER MODAL BYPASSES OCCUPANCY SYNC ===\n');

  const modalSource = fs.readFileSync('src/components/dashboard/PunchOrderModal.tsx', 'utf8');
  const dbSource = fs.readFileSync('src/lib/db.ts', 'utf8');

  // 1. Check if PunchOrderModal calls API or db.createOrder
  const callsApi = modalSource.includes('/api/staff/punch-order');
  const callsDb = modalSource.includes('db.createOrder(');
  console.log(`1. PunchOrderModal calls /api/staff/punch-order: ${callsApi}`);
  console.log(`   PunchOrderModal calls db.createOrder: ${callsDb}`);

  // 2. Check if db.createOrder updates table_states or emits table-status-updated
  const createOrderIdx = dbSource.indexOf('async createOrder(');
  const addBatchIdx = dbSource.indexOf('async addBatchToOrder(');
  const createOrderBody = dbSource.substring(createOrderIdx, addBatchIdx);

  const updatesTableStates = createOrderBody.includes('table_states');
  const emitsTableStatus = createOrderBody.includes('table-status-updated');
  console.log(`2. db.createOrder updates table_states: ${updatesTableStates}`);
  console.log(`   db.createOrder emits table-status-updated: ${emitsTableStatus}`);

  if (callsDb && !callsApi && !updatesTableStates && !emitsTableStatus) {
    console.log('\n❌ [VERIFIED P1 BUG]: Waiter PunchOrderModal calls db.createOrder directly instead of /api/staff/punch-order. db.createOrder does not update table_states to occupied and does not broadcast table-status-updated realtime event. Floor plan does not reflect occupied table on staff POS order punch!');
  }
}

verifyWaiterPunchTableBypass().catch(console.error);
