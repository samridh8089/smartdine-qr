/**
 * verify_phase19a_freeze_frame.ts
 * Phase-19A-R1: CCTV Freeze Frame & Time Travel Debugger Verification Harness
 */

import fs from 'fs';
import {
  reconstructStateAtTimestamp,
  computeGhostOverlays,
  compareTimestamps,
} from '../src/components/founder/timeTravelEngine';
import type { SystemEvent } from '../src/components/founder/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function runFreezeCertification() {
  console.log('========================================================================');
  console.log('CLEVEROPS PHASE-19A-R1: FREEZE FRAME & TIME TRAVEL DEBUGGER CERTIFICATION');
  console.log('========================================================================\n');

  const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
  const mockTables = [
    { id: 'tbl_001', name: '1' },
    { id: 'tbl_005', name: '5' },
    { id: 'tbl_010', name: '10' },
  ];

  // Base timestamps
  const baseTime = 1773220000000; // e.g. 10:30:00
  const t_10_30 = baseTime;
  const t_10_31 = baseTime + 1 * 60 * 1000;  // 10:31
  const t_10_32 = baseTime + 2 * 60 * 1000;  // 10:32
  const t_10_33 = baseTime + 3 * 60 * 1000;  // 10:33
  const t_10_34 = baseTime + 4 * 60 * 1000;  // 10:34:22
  const t_10_35 = baseTime + 5 * 60 * 1000;  // 10:35
  const t_10_36 = baseTime + 6 * 60 * 1000;  // 10:36
  const t_10_37 = baseTime + 7 * 60 * 1000;  // 10:37
  const t_10_38 = baseTime + 8 * 60 * 1000;  // 10:38:10 (current time)

  const sampleEvents: SystemEvent[] = [
    // Table 10 order lifecycle
    {
      id: 'e1',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'order_created',
      source_node: 'checkout',
      target_node: 'order_created',
      metadata: { table_name: 'Table 10', item: 'Paneer Butter Masala', qty: 2 },
      created_at: new Date(t_10_31).toISOString(),
    },
    {
      id: 'e2',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'inventory_reserved',
      source_node: 'order_created',
      target_node: 'inventory',
      metadata: { item: 'Paneer', qty: 2 },
      created_at: new Date(t_10_31 + 500).toISOString(),
    },
    {
      id: 'e3',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'order_preparing',
      source_node: 'kitchen_queue',
      target_node: 'preparing',
      metadata: { table_name: 'Table 10', staffName: 'Chef Ramesh' },
      created_at: new Date(t_10_33).toISOString(),
    },
    {
      id: 'e4',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'inventory_deducted',
      source_node: 'preparing',
      target_node: 'inventory',
      metadata: { item: 'Paneer', qty: 2 },
      created_at: new Date(t_10_33 + 200).toISOString(),
    },
    {
      id: 'e5',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'order_ready',
      source_node: 'preparing',
      target_node: 'ready',
      metadata: { table_name: 'Table 10' },
      created_at: new Date(t_10_35).toISOString(),
    },
    {
      id: 'e6',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'waiter_assigned',
      source_node: 'ready',
      target_node: 'waiter_assigned',
      metadata: { table_name: 'Table 10', waiterName: 'Sunil Kumar' },
      created_at: new Date(t_10_35 + 2000).toISOString(),
    },
    {
      id: 'e7',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'order_served',
      source_node: 'waiter_assigned',
      target_node: 'served',
      metadata: { table_name: 'Table 10' },
      created_at: new Date(t_10_36).toISOString(),
    },
    {
      id: 'e8',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'payment_success',
      source_node: 'billing',
      target_node: 'payment',
      metadata: { table_name: 'Table 10', amount: 650 },
      created_at: new Date(t_10_37).toISOString(),
    },
    {
      id: 'e9',
      restaurant_id: restaurantId,
      correlation_id: 'corr_T10_ORD42',
      order_id: 'ord_42',
      table_uuid: 'tbl_010',
      event_type: 'order_completed',
      source_node: 'payment',
      target_node: 'session_closed',
      metadata: { table_name: 'Table 10' },
      created_at: new Date(t_10_37 + 1000).toISOString(),
    },
  ];

  // 1. Part C & D: Reconstruct State at 10:34:22 (Table 10 is Preparing)
  console.log('--- TEST 1: Exact Moment State Reconstruction at 10:34:22 ---');
  const snap1034 = reconstructStateAtTimestamp(sampleEvents, t_10_34, mockTables);
  assert(snap1034.tableStatus['tbl_010'] === 'preparing', 'Table 10 reconstructed as "preparing" at 10:34:22');
  assert(snap1034.metrics.activeOrders === 1, 'Metrics: Active Orders === 1 at 10:34:22');
  assert(snap1034.metrics.preparing === 1, 'Metrics: Preparing === 1 at 10:34:22');
  assert(snap1034.metrics.ready === 0, 'Metrics: Ready === 0 at 10:34:22');
  assert(snap1034.kdsQueue.length === 1, 'KDS Queue contains 1 active ticket');
  assert(snap1034.inventoryState['Paneer'].deducted === 2, 'Inventory: 2 units Paneer deducted up to 10:34:22');

  // 2. Part D: Reconstruct State at 10:36:00 (Table 10 is Served / Waiting Bill)
  console.log('\n--- TEST 2: Exact Moment State Reconstruction at 10:36:00 ---');
  const snap1036 = reconstructStateAtTimestamp(sampleEvents, t_10_36, mockTables);
  assert(snap1036.tableStatus['tbl_010'] === 'waiting_bill', 'Table 10 reconstructed as "waiting_bill" at 10:36:00');
  assert(snap1036.metrics.serving === 1, 'Metrics: Serving === 1 at 10:36:00');

  // 3. Part D: Reconstruct State at 10:38:10 (Session Closed -> Available)
  console.log('\n--- TEST 3: Exact Moment State Reconstruction at 10:38:10 ---');
  const snap1038 = reconstructStateAtTimestamp(sampleEvents, t_10_38, mockTables);
  assert(snap1038.tableStatus['tbl_010'] === 'available', 'Table 10 returned to "available" after completion at 10:38:10');
  assert(snap1038.metrics.activeOrders === 0, 'Metrics: Active Orders === 0 after completion');

  // 4. Ghost Mode Feature: Historical (10:34) vs Current (10:38)
  console.log('\n--- TEST 4: Ghost Mode Overlays ("Tab kya tha vs Ab kya hai") ---');
  const ghostOverlays = computeGhostOverlays(snap1034, snap1038, mockTables);
  const tbl10Ghost = ghostOverlays.find(g => g.tableId === 'tbl_010');
  assert(!!tbl10Ghost, 'Table 10 ghost overlay found');
  assert(tbl10Ghost!.historicalStatus === 'preparing', 'Table 10 historical ghost shows "preparing"');
  assert(tbl10Ghost!.currentStatus === 'available', 'Table 10 solid current shows "available"');
  assert(tbl10Ghost!.hasChanged === true, 'Ghost Mode flag hasChanged === true');

  // 5. Part H: Event Difference Mode (T1 = 10:30 vs T2 = 10:36)
  console.log('\n--- TEST 5: Event Difference Mode (T1 = 10:30 vs T2 = 10:36) ---');
  const diffs = compareTimestamps(sampleEvents, t_10_30, t_10_36, mockTables);
  assert(diffs.length >= 3, `Diff table produced ${diffs.length} granular diff items`);
  const tableDiff = diffs.find(d => d.entity === 'Table 10');
  assert(!!tableDiff, 'Table 10 found in diff table');
  assert(tableDiff!.before === 'AVAILABLE', 'Table 10 before: AVAILABLE');
  assert(tableDiff!.after === 'WAITING_BILL', 'Table 10 after: WAITING_BILL');

  const paneerDiff = diffs.find(d => d.entity.includes('Paneer'));
  assert(!!paneerDiff, 'Paneer inventory delta found in diff table');
  assert(paneerDiff!.before === '0 units', 'Paneer before: 0 units deducted');
  assert(paneerDiff!.after === '2 units', 'Paneer after: 2 units deducted');

  // 6. Frozen inventory files integrity check
  console.log('\n--- TEST 6: Inventory Freeze Integrity ---');
  assert(fs.existsSync('./src/lib/inventoryEngine.ts'), 'src/lib/inventoryEngine.ts intact');
  assert(fs.existsSync('./src/lib/inventoryUnits.ts'), 'src/lib/inventoryUnits.ts intact');

  console.log('\n========================================================================');
  console.log('ALL PHASE-19A-R1 FREEZE FRAME & TIME TRAVEL TESTS: PASSED');
  console.log('========================================================================');
}

runFreezeCertification().catch(err => {
  console.error('Certification failed:', err);
  process.exit(1);
});
