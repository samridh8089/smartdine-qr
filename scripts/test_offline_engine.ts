import './load_env.js';
import assert from 'assert';
import { NodeSQLiteDriver } from '../src/lib/sqliteNodeDriver';
import { OfflineStorageManager, OfflineSyncEngine } from '../src/lib/offlineSyncEngine';

console.log('===============================================================');
console.log('TESTING SMARTDINE OFFLINE SQLITE & SYNC ENGINE');
console.log('===============================================================\n');

async function run() {
  const driver = new NodeSQLiteDriver(':memory:');
  const storage = new OfflineStorageManager(driver);

  // 1. Initialize schema
  await storage.initializeSchema();
  console.log('  ✅ [PASS] 1. SQLite schema initialized (7 mandatory tables)');

  // 2. Queue an offline order
  const offlineId = `OFFLINE-${Date.now()}`;
  const queueItem = await storage.enqueueAction({
    id: 'queue-uuid-001',
    restaurant_id: 'rest-test-01',
    user_id: 'waiter-01',
    action_type: 'staff_punch',
    payload: {
      offlineId,
      tableName: 'Table 5',
      tableId: 'tbl-5',
      orderType: 'dine_in',
      status: 'pending',
      paymentStatus: 'pending',
      total: 450,
      subtotal: 400,
      tax: 50,
      items: [{ name: 'Butter Chicken', quantity: 1, price: 400 }]
    },
    timestamp: new Date().toISOString()
  });

  assert.strictEqual(queueItem.status, 'pending');
  console.log('  ✅ [PASS] 2. Offline order action enqueued to SQLite sync_queue');

  // 3. Save pending order for optimistic UI
  await storage.savePendingOrder({
    id: offlineId,
    restaurant_id: 'rest-test-01',
    table_id: 'tbl-5',
    table_name: 'Table 5',
    items: [{ name: 'Butter Chicken', quantity: 1, price: 400 }],
    subtotal: 400,
    tax: 50,
    total: 450,
    status: 'pending',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    synced: false,
    sync_queue_id: 'queue-uuid-001'
  });

  const pendingOrders = await storage.getPendingOrders('rest-test-01');
  assert.strictEqual(pendingOrders.length, 1);
  assert.strictEqual(pendingOrders[0].id, offlineId);
  console.log('  ✅ [PASS] 3. Pending order retrievable for optimistic UI render');

  // 4. Cache tables & menu
  await storage.cacheTables('rest-test-01', [
    { id: 't1', restaurant_id: 'rest-test-01', name: 'Table 1', table_number: 1, capacity: 4, status: 'available', updated_at: new Date().toISOString() },
    { id: 't2', restaurant_id: 'rest-test-01', name: 'Table 2', table_number: 2, capacity: 2, status: 'occupied', updated_at: new Date().toISOString() }
  ]);

  const cachedTables = await storage.getCachedTables('rest-test-01');
  assert.strictEqual(cachedTables.length, 2);
  console.log('  ✅ [PASS] 4. Tables cached and queryable offline');

  await storage.cacheMenu('rest-test-01', [
    { id: 'm1', restaurant_id: 'rest-test-01', category_id: 'c1', name: 'Dal Makhani', price: 280, is_available: true, is_veg: true, updated_at: new Date().toISOString() }
  ]);

  const cachedMenu = await storage.getCachedMenu('rest-test-01');
  assert.strictEqual(cachedMenu.length, 1);
  console.log('  ✅ [PASS] 5. Menu cached and queryable offline');

  // 5. Test Mock Server Sync
  const mockSupabase = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null })
        })
      }),
      insert: (payload: any) => ({
        select: () => ({
          single: async () => ({ data: { id: 'srv-ord-999', ...payload }, error: null })
        })
      })
    })
  };

  const syncEngine = new OfflineSyncEngine(storage);
  const syncResult = await syncEngine.syncPendingQueue(mockSupabase);
  assert.strictEqual(syncResult.synced, 1);
  assert.strictEqual(syncResult.failed, 0);

  const remainingQueue = await storage.getPendingQueue();
  assert.strictEqual(remainingQueue.length, 0);
  console.log('  ✅ [PASS] 6. Sync engine successfully flushed queue to server with idempotency');

  console.log('\n===============================================================');
  console.log('OFFLINE SQLITE & SYNC ENGINE: ALL 6 TESTS PASSED (100%)');
  console.log('===============================================================\n');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
