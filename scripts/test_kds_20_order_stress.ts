// CleverOps Phase 3 — KDS Polish: 20-Order Stress & Realtime Pipeline Test (K1-K4)
import './load_env.js';
import assert from 'assert';
import { matchesOrderSearchQuery } from '../src/lib/utils';
import { VALID_ORDER_TRANSITIONS, type Order, type OrderBatch } from '../src/lib/db';

console.log('===============================================================');
console.log('CLEVEROPS PHASE 3 — KDS 20-ORDER STRESS & REALTIME PIPELINE (K1-K4)');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] Test ${totalTests}: ${name}`);
    console.error(`         Error: ${err.message}`);
    throw err;
  }
}

// -------------------------------------------------------------
// Helper: SLA Timer Calculation (Mirrors KDS Page SLA Engine)
// -------------------------------------------------------------
function getElapsedTimeMinutes(createdAt: string, nowMs = Date.now()): number {
  const diffMs = nowMs - new Date(createdAt).getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
}

function getSlaPriority(createdAt: string, nowMs = Date.now()): {
  mins: number;
  status: 'green' | 'yellow' | 'red';
  label: string;
} {
  const mins = getElapsedTimeMinutes(createdAt, nowMs);
  if (mins < 10) {
    return { mins, status: 'green', label: 'On Time' };
  } else if (mins < 20) {
    return { mins, status: 'yellow', label: 'Near SLA' };
  } else {
    return { mins, status: 'red', label: 'SLA Breached' };
  }
}

// -------------------------------------------------------------
// Helper: Extract active batches and filter into KDS queues
// (Mirrors src/app/(dashboard)/dashboard/kds/page.tsx useMemo logic)
// -------------------------------------------------------------
function extractKdsQueues(orders: Order[], searchQuery = '', restaurantName = 'The Foody Hub') {
  const filteredOrders = searchQuery
    ? orders.filter(o => matchesOrderSearchQuery(o, searchQuery, restaurantName, orders))
    : orders;

  const seenBatchIds = new Set<string>();
  const activeBatches: any[] = [];

  filteredOrders
    .filter(o => o.order_type !== 'reservation') // BUG-RES-001: reservations excluded
    .forEach(order => {
      if (order.batches) {
        order.batches.forEach(batch => {
          if (!batch || !batch.id || seenBatchIds.has(batch.id)) return;
          const isCancelled = batch.status === 'cancelled' || batch.special_instructions?.includes('[CANCELLED]');
          if (!isCancelled) {
            seenBatchIds.add(batch.id);
            activeBatches.push({
              ...batch,
              table_name: order.table_name,
              restaurant_id: order.restaurant_id,
              order_id: order.id,
              payment_status: order.payment_status || 'pending',
              order_status: order.status,
              order_type: order.order_type || 'dine_in',
              customer_arrival_minutes: order.customer_arrival_minutes,
              takeaway_notes: order.takeaway_notes
            });
          }
        });
      }
    });

  const newOrders = activeBatches
    .filter(b => b.status === 'new' && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const preparingOrders = activeBatches
    .filter(b => (b.status === 'accepted' || b.status === 'preparing') && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const readyOrders = activeBatches
    .filter(b => b.status === 'ready' && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const servedOrders = activeBatches
    .filter(b => b.status === 'served' && b.order_status !== 'completed' && b.payment_status !== 'paid' && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'))
    .sort((a, b) => new Date(b.served_at || b.created_at).getTime() - new Date(a.served_at || a.created_at).getTime());

  const completedOrders = activeBatches
    .filter(b => (b.status === 'completed' || b.order_status === 'completed' || b.payment_status === 'paid') && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'))
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  return {
    allActiveBatches: activeBatches,
    newOrders,
    preparingOrders,
    readyOrders,
    servedOrders,
    completedOrders,
    cookingQueueCount: newOrders.length + preparingOrders.length + readyOrders.length,
    totalTickets: activeBatches.length
  };
}

// -------------------------------------------------------------
// Test 1: Generate 20 Parallel Active Orders across 5 Stages
// -------------------------------------------------------------
const now = Date.now();
const testOrders: Order[] = [];

for (let i = 1; i <= 20; i++) {
  // Distribute initial statuses across the 5 stages:
  // 1-4: new
  // 5-9: preparing / accepted
  // 10-13: ready
  // 14-17: served
  // 18-20: completed
  let stageStatus: OrderBatch['status'] = 'new';
  let orderStatus: Order['status'] = 'pending';
  let paymentStatus: Order['payment_status'] = 'pending';

  if (i >= 5 && i <= 9) {
    stageStatus = i % 2 === 0 ? 'accepted' : 'preparing';
    orderStatus = 'preparing';
  } else if (i >= 10 && i <= 13) {
    stageStatus = 'ready';
    orderStatus = 'ready';
  } else if (i >= 14 && i <= 17) {
    stageStatus = 'served';
    orderStatus = 'served';
  } else if (i >= 18) {
    stageStatus = 'completed';
    orderStatus = 'completed';
    paymentStatus = 'paid';
  }

  // Stagger timestamps for SLA testing:
  // i <= 7: recent (2 to 8 mins ago) -> green
  // i >= 8 && i <= 14: near SLA (12 to 18 mins ago) -> yellow
  // i >= 15: breached SLA (22 to 35 mins ago) -> red
  let ageMinutes = 5;
  if (i <= 7) ageMinutes = 2 + (i % 6);
  else if (i <= 14) ageMinutes = 12 + (i % 6);
  else ageMinutes = 22 + (i * 2);

  const createdAtIso = new Date(now - ageMinutes * 60 * 1000).toISOString();

  const batch: OrderBatch = {
    id: `batch-${i}-01`,
    order_id: `ord-stress-${i.toString().padStart(3, '0')}`,
    batch_number: 1,
    status: stageStatus,
    created_at: createdAtIso,
    items: [
      {
        id: `item-${i}-1`,
        menu_item_id: `menu-dish-${i}`,
        name: `Signature Dish #${i}`,
        quantity: (i % 3) + 1,
        price: 150 + i * 10,
        portion: i % 2 === 0 ? 'Half' : 'Full',
        notes: i % 4 === 0 ? 'Extra spicy' : ''
      },
      {
        id: `item-${i}-2`,
        menu_item_id: `menu-bread-${i}`,
        name: `Butter Naan`,
        quantity: 2,
        price: 45
      }
    ]
  };

  testOrders.push({
    id: `ord-stress-${i.toString().padStart(3, '0')}`,
    restaurant_id: 'rest-stress-001',
    table_id: `table-uuid-${i}`,
    table_name: `Table ${i}`,
    order_number: i,
    order_type: 'dine_in',
    status: orderStatus,
    payment_status: paymentStatus,
    created_at: createdAtIso,
    total: 250 + i * 20,
    batches: [batch]
  } as Order);
}

runTest('K1: 20 Parallel Orders initialized across all 5 distinct stages', () => {
  assert.strictEqual(testOrders.length, 20, 'Expected exactly 20 orders');
  const queues = extractKdsQueues(testOrders);
  
  assert.strictEqual(queues.newOrders.length, 4, `Expected 4 new tickets, got ${queues.newOrders.length}`);
  assert.strictEqual(queues.preparingOrders.length, 5, `Expected 5 preparing tickets, got ${queues.preparingOrders.length}`);
  assert.strictEqual(queues.readyOrders.length, 4, `Expected 4 ready tickets, got ${queues.readyOrders.length}`);
  assert.strictEqual(queues.servedOrders.length, 4, `Expected 4 served tickets, got ${queues.servedOrders.length}`);
  assert.strictEqual(queues.completedOrders.length, 3, `Expected 3 completed tickets, got ${queues.completedOrders.length}`);
  assert.strictEqual(queues.totalTickets, 20, 'Total tickets across all stages must equal 20');
});

runTest('K1: Queue Views correctly filter tickets (Cooking: 13, Served: 4, Completed: 3, All: 20)', () => {
  const queues = extractKdsQueues(testOrders);
  
  // Cooking Queue view (New + Prep + Ready)
  assert.strictEqual(queues.cookingQueueCount, 13, 'Cooking queue must contain exactly 13 active cooking tickets');
  // Served Queue view
  assert.strictEqual(queues.servedOrders.length, 4, 'Served queue must contain exactly 4 tickets');
  // Completed Queue view
  assert.strictEqual(queues.completedOrders.length, 3, 'Completed queue must contain exactly 3 tickets');
  // All Pipeline view
  assert.strictEqual(queues.allActiveBatches.length, 20, 'All pipeline view must display 20 tickets');
});

// -------------------------------------------------------------
// Test 2: SLA Timer & Escalation Calculation (K2)
// -------------------------------------------------------------
runTest('K2: SLA Priority badges correctly calculate On Time (<10m), Near SLA (10-20m), Breached (>20m)', () => {
  let greenCount = 0;
  let yellowCount = 0;
  let redCount = 0;

  testOrders.forEach(o => {
    const sla = getSlaPriority(o.created_at, now);
    if (sla.status === 'green') greenCount++;
    else if (sla.status === 'yellow') yellowCount++;
    else if (sla.status === 'red') redCount++;
  });

  assert(greenCount >= 7, `Expected at least 7 green tickets, got ${greenCount}`);
  assert(yellowCount >= 7, `Expected at least 7 yellow tickets, got ${yellowCount}`);
  assert(redCount >= 6, `Expected at least 6 red breached tickets, got ${redCount}`);
  assert.strictEqual(greenCount + yellowCount + redCount, 20, 'All 20 tickets must have valid SLA status');
});

runTest('K2: SLA Timers survive page refresh / time progression without resetting to 00:00', () => {
  const firstOrder = testOrders[0];
  const initialSla = getSlaPriority(firstOrder.created_at, now);
  
  // Simulate 5 minutes passing on user client
  const fiveMinsLater = now + 5 * 60 * 1000;
  const simulatedRefreshSla = getSlaPriority(firstOrder.created_at, fiveMinsLater);

  assert.strictEqual(
    simulatedRefreshSla.mins,
    initialSla.mins + 5,
    'Elapsed time must increment based on persistent created_at, never resetting to 0'
  );
});

// -------------------------------------------------------------
// Test 3: Rapid Stage Transitions (K3)
// -------------------------------------------------------------
runTest('K3: Rapid State Transitions progress tickets sequentially across all 5 stages', () => {
  // Take Order 1 (initially 'new') and progress it all the way to completed:
  const order1 = JSON.parse(JSON.stringify(testOrders[0])) as Order;
  const batch1 = order1.batches![0];

  assert.strictEqual(batch1.status, 'new');

  // Transition 1: new -> preparing
  batch1.status = 'preparing';
  order1.status = 'preparing';
  let q = extractKdsQueues([order1]);
  assert.strictEqual(q.newOrders.length, 0);
  assert.strictEqual(q.preparingOrders.length, 1);

  // Transition 2: preparing -> ready
  batch1.status = 'ready';
  order1.status = 'ready';
  q = extractKdsQueues([order1]);
  assert.strictEqual(q.preparingOrders.length, 0);
  assert.strictEqual(q.readyOrders.length, 1);

  // Transition 3: ready -> served
  batch1.status = 'served';
  order1.status = 'served';
  q = extractKdsQueues([order1]);
  assert.strictEqual(q.readyOrders.length, 0);
  assert.strictEqual(q.servedOrders.length, 1);

  // Transition 4: served -> completed (upon payment)
  batch1.status = 'completed';
  order1.status = 'completed';
  order1.payment_status = 'paid';
  q = extractKdsQueues([order1]);
  assert.strictEqual(q.servedOrders.length, 0);
  assert.strictEqual(q.completedOrders.length, 1);
});

// -------------------------------------------------------------
// Test 4: Reconnect & Deduplication Stress (K4)
// -------------------------------------------------------------
runTest('K4: Zero Duplicate Tickets on Rapid Reconnect or Multi-Batch Ingestion', () => {
  // Create an array with duplicate batch entries simulating duplicate realtime broadcasts
  const duplicatedOrders: Order[] = [
    ...testOrders,
    ...JSON.parse(JSON.stringify(testOrders)) // Duplicate all 20 orders
  ];

  const queues = extractKdsQueues(duplicatedOrders);
  assert.strictEqual(
    queues.totalTickets,
    20,
    `seenBatchIds deduplication failed! Expected 20 unique tickets, got ${queues.totalTickets}`
  );
});

// -------------------------------------------------------------
// Test 5: Table Reservation Isolation (BUG-RES-001)
// -------------------------------------------------------------
runTest('K4: Reservation Orders are strictly ignored in KDS and do not leak tickets', () => {
  const reservationOrder: Order = {
    id: 'resv-order-999',
    restaurant_id: 'rest-stress-001',
    table_id: 'resv-table-1',
    table_name: 'Reservation Table',
    order_number: 999,
    order_type: 'reservation',
    status: 'pending',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    total: 0,
    batches: [
      {
        id: 'batch-resv-01',
        order_id: 'resv-order-999',
        batch_number: 1,
        status: 'new',
        created_at: new Date().toISOString(),
        items: []
      }
    ]
  } as Order;

  const combined = [...testOrders, reservationOrder];
  const queues = extractKdsQueues(combined);

  assert.strictEqual(queues.totalTickets, 20, 'Reservation order must be strictly excluded from KDS tickets');
  assert(!queues.allActiveBatches.some(b => b.id === 'batch-resv-01'), 'Reservation batch ID leaked into active tickets');
});

// -------------------------------------------------------------
// Test 6: Search & Filter Responsiveness Across 20 Orders
// -------------------------------------------------------------
runTest('K4: Instant search filtering handles Table number, Sequence, Customer, and Item queries', () => {
  // Search for Table 15
  const t15 = extractKdsQueues(testOrders, 'Table 15');
  assert.strictEqual(t15.totalTickets, 1, 'Search for "Table 15" must find exactly 1 ticket');
  assert.strictEqual(t15.allActiveBatches[0].table_name, 'Table 15');

  // Search by partial number "7"
  const partial7 = extractKdsQueues(testOrders, '7');
  // Tables 7 and 17 match
  assert(partial7.totalTickets >= 2, `Search for "7" should match Table 7 and Table 17 (got ${partial7.totalTickets})`);

  // Search for nonexistent query
  const emptyRes = extractKdsQueues(testOrders, 'NonExistentDishXYZ');
  assert.strictEqual(emptyRes.totalTickets, 0, 'Non-matching search must return 0 tickets');
});

// -------------------------------------------------------------
// Test 7: High-Throughput SLA Benchmark (20 Orders In Parallel)
// -------------------------------------------------------------
runTest('K4: Performance benchmark processes 20 parallel orders in under 50ms', () => {
  const start = performance.now();
  for (let loop = 0; loop < 100; loop++) {
    extractKdsQueues(testOrders);
  }
  const duration = performance.now() - start;
  const avgPerRun = duration / 100;
  console.log(`     -> 100 queue calculations executed in ${duration.toFixed(2)}ms (Avg: ${avgPerRun.toFixed(3)}ms per render)`);
  assert(avgPerRun < 5.0, `Queue calculation too slow: ${avgPerRun.toFixed(3)}ms > 5ms`);
});

console.log('\n===============================================================');
console.log(`CLEVEROPS PHASE 3 KDS SUITE: ${passedTests}/${totalTests} TESTS PASSED (100% PASS)`);
console.log('===============================================================\n');
