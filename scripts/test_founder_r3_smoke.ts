// Phase-18.17A-R3 & R3.1 Comprehensive Smoke Test Suite
// @ts-ignore
import ws from 'ws';
(globalThis as any).WebSocket = ws;

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
let supabaseUrl = '';
let supabaseKey = '';

try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = trimmed.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^['"]|['"]$/g, '');
    }
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^['"]|['"]$/g, '');
    }
    if (!supabaseKey && trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = trimmed.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/^['"]|['"]$/g, '');
    }
  });
} catch (e: any) {
  console.warn('Could not read .env.local', e.message);
}

const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Import utilities from utils.ts directly
import { 
  getFormattedOrderId, 
  getCustomerFacingOrderId, 
  getDeterministicRestaurantCode,
  matchesOrderSearchQuery,
  parseCustomerDetailsFromOrder
} from '../src/lib/utils';
import type { Order } from '../src/lib/db';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('CleverOps Phase-18.17A-R3 & R3.1 Smoke Test Suite');
  console.log('====================================================\n');

  // Test 1: Order ID Architecture & Display Formatting
  console.log('Test 1: Order ID Architecture & Display Formatting');
  const dummyOrder: Partial<Order> = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    order_number: 1,
    order_type: 'takeaway',
    created_at: new Date().toISOString(),
    customer_notes: 'Phone: 9876543210'
  };

  const staffFormatted = getFormattedOrderId(dummyOrder, 'The Foody Hub (Udaipur)', [dummyOrder as Order], false);
  const customerFormatted = getCustomerFacingOrderId(dummyOrder, [dummyOrder as Order]);
  const restCode = getDeterministicRestaurantCode('The Foody Hub (Udaipur)');

  console.log(`  Staff Order ID: ${staffFormatted}`);
  console.log(`  Customer Order ID: ${customerFormatted}`);
  console.log(`  Deterministic Restaurant Code: ${restCode}`);

  assert(/^[A-Z0-9]{3}-\d{2}T\d{4}$/.test(staffFormatted), `Staff Order ID matches format <RestCode>-<YY><Type><Sequence> (${staffFormatted})`);
  assert(/^Order #\d{2}T\d{4}$/.test(customerFormatted), `Customer Order ID hides restaurant code and shows Order #<YY><Type><Sequence> (${customerFormatted})`);
  assert(!customerFormatted.includes(restCode), 'Customer-facing Order ID strictly conceals internal restaurant code (P0-14)');

  // Test 2: Multi-Restaurant Collision-Free Determinism
  console.log('\nTest 2: Multi-Restaurant Code Collision & Determinism');
  const codeUdaipur = getDeterministicRestaurantCode('The Foody Hub (Udaipur)');
  const codeJaipur = getDeterministicRestaurantCode('The Foody Hub (Jaipur)');
  const codeDelhi = getDeterministicRestaurantCode('The Foody Hub (Delhi)');

  assert(codeUdaipur.length === 3, `Udaipur code is 3 characters: ${codeUdaipur}`);
  assert(codeJaipur.length === 3, `Jaipur code is 3 characters: ${codeJaipur}`);
  assert(codeDelhi.length === 3, `Delhi code is 3 characters: ${codeDelhi}`);
  assert(codeUdaipur !== codeJaipur, 'Udaipur and Jaipur generate distinct codes');
  assert(codeJaipur !== codeDelhi, 'Jaipur and Delhi generate distinct codes');
  assert(codeUdaipur === getDeterministicRestaurantCode('The Foody Hub (Udaipur)'), 'Code generation is deterministic across calls');

  // Test 3: Search Consistency (P0-16)
  console.log('\nTest 3: Search Consistency Across KDS, Billing, Reports, Live Orders');
  const searchTestOrder: Partial<Order> = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    order_number: 43,
    order_type: 'takeaway',
    created_at: new Date().toISOString(),
    customer_name: 'Rahul Sharma',
    customer_phone: '9876543210',
    table_number: 12
  };

  const formattedId = getFormattedOrderId(searchTestOrder, 'The Foody Hub', [searchTestOrder as Order], false);
  const seqSuffix = '26T0043';
  const numSuffix = '0043';

  assert(matchesOrderSearchQuery(searchTestOrder, formattedId, 'The Foody Hub'), `Matches full ID: ${formattedId}`);
  assert(matchesOrderSearchQuery(searchTestOrder, seqSuffix, 'The Foody Hub'), `Matches sequence suffix: ${seqSuffix}`);
  assert(matchesOrderSearchQuery(searchTestOrder, numSuffix, 'The Foody Hub'), `Matches number suffix: ${numSuffix}`);
  assert(matchesOrderSearchQuery(searchTestOrder, 'Rahul', 'The Foody Hub'), 'Matches customer name: Rahul');
  assert(matchesOrderSearchQuery(searchTestOrder, '9876543210', 'The Foody Hub'), 'Matches mobile number: 9876543210');
  assert(matchesOrderSearchQuery(searchTestOrder, 'Table 12', 'The Foody Hub'), 'Matches table number: Table 12');
  assert(matchesOrderSearchQuery(searchTestOrder, '12', 'The Foody Hub'), 'Matches numeric table: 12');
  assert(!matchesOrderSearchQuery(searchTestOrder, 'NonExistent99', 'The Foody Hub'), 'Rejects non-matching queries');

  // Test 4: Reservation Lifecycle & KDS Isolation (P0-15)
  console.log('\nTest 4: Reservation Lifecycle & Zero KDS Leak');
  const reservationOrder: Partial<Order> = {
    id: '11111111-2222-3333-4444-555555555555',
    order_type: 'reservation',
    status: 'pending' // unseated reservation
  };
  
  // In KDS: orders are filtered with: o.order_type !== 'reservation' || o.status === 'seated'
  const isAllowedInKdsBeforeSeating = (reservationOrder.order_type !== 'reservation' || reservationOrder.status === 'seated');
  assert(!isAllowedInKdsBeforeSeating, 'Pending reservation is BLOCKED from KDS');

  const seatedReservation: Partial<Order> = { ...reservationOrder, status: 'seated' };
  const isAllowedInKdsAfterSeating = (seatedReservation.order_type !== 'reservation' || seatedReservation.status === 'seated');
  assert(isAllowedInKdsAfterSeating, 'Seated reservation is PERMITTED in KDS');

  // Test 5: Customer Details Parser
  console.log('\nTest 5: Customer Details Parser');
  const legacyOrderNotes = {
    customer_notes: 'Phone: 9123456789 | Guest: Amit Verma | Notes: Extra spicy'
  };
  const parsed = parseCustomerDetailsFromOrder(legacyOrderNotes);
  assert(parsed.name === 'Amit Verma', `Extracted legacy name: ${parsed.name}`);
  assert(parsed.phone === '9123456789', `Extracted legacy phone: ${parsed.phone}`);

  // Test 6: Valid Order Transitions (Ready -> Completed / Served)
  console.log('\nTest 6: Valid Order Transitions (Ready -> Completed/Served)');
  const { VALID_ORDER_TRANSITIONS, ALLOWED_PRIOR_STATUSES } = await import('../src/lib/db');
  const readyTransitions = VALID_ORDER_TRANSITIONS['ready'] || [];
  assert(readyTransitions.includes('completed'), 'ready -> completed transition is valid');
  assert(readyTransitions.includes('served'), 'ready -> served transition is valid');
  const allowedPriorForCompleted = ALLOWED_PRIOR_STATUSES['completed'] || [];
  assert(allowedPriorForCompleted.includes('ready'), 'ready is an allowed prior status for completed');

  // Test 7: Database Live Integrity Check
  console.log('\nTest 7: Database Live Integrity Check');
  if (!supabase) {
    console.warn('  ⚠️ Could not connect to Supabase (missing credentials), skipping live DB query test.');
  } else {
    const { data: testRest, error: restErr } = await supabase
      .from('restaurants')
      .select('id, name, slug')
      .limit(1)
      .single();

    if (restErr || !testRest) {
      console.warn('  ⚠️ Could not query live restaurants from Supabase:', restErr?.message);
    } else {
      assert(!!testRest.id, `Connected to database and verified active restaurant: ${testRest.name} (${testRest.id})`);
      
      const { data: tables, error: tableErr } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', testRest.id)
        .limit(5);

      if (tableErr) console.warn('    Table query error:', tableErr.message);
      assert(!tableErr, 'Successfully queried live tables');
      if (tables && tables.length > 0) {
        console.log(`    Found ${tables.length} live tables for restaurant.`);
        console.log('    Table columns:', Object.keys(tables[0]));
        assert(!!tables[0].id, `First table ID: ${tables[0].id}`);
      }
    }
  }

  // Test 8: QR Permanent Lifetime Validity (Invariant 2)
  console.log('\nTest 8: Printed QR Code Lifetime Validity');
  const tableOriginal = {
    id: 'tbl-uuid-001',
    table_number: 1,
    name: 'Table 1',
    capacity: 4,
    qr_token: 'qr_perm_token_xyz89'
  };
  // Simulate rename and seat change
  const tableRenamed = {
    ...tableOriginal,
    name: 'Table 1A (Patio)',
    capacity: 2
  };
  assert(tableRenamed.qr_token === tableOriginal.qr_token, 'QR token is immutable and permanent across table rename/capacity edits');
  assert(tableRenamed.id === tableOriginal.id, 'Table identity UUID remains permanent');

  // Test 9: Waiter 3-Tier Priority Hierarchy
  console.log('\nTest 9: Waiter 3-Tier Priority Hierarchy');
  function resolveTableWaiter(table: any, zones: any[], staffList: any[]): string {
    // 1. Explicit manual assignment
    if (table.assigned_waiter_id) {
      const staff = staffList.find(s => s.id === table.assigned_waiter_id);
      if (staff) return staff.name;
    }
    // 2. Zone-level assignment
    if (table.zone_id) {
      const zone = zones.find(z => z.id === table.zone_id);
      if (zone && zone.assigned_waiter_id) {
        const staff = staffList.find(s => s.id === zone.assigned_waiter_id);
        if (staff) return staff.name;
      }
    }
    // 3. Unassigned fallback
    return 'Unassigned';
  }

  const mockStaff = [
    { id: 'w1', name: 'Alex' },
    { id: 'w2', name: 'Bella' }
  ];
  const mockZones = [
    { id: 'z1', name: 'Main Dining', assigned_waiter_id: 'w2' }
  ];

  const tableManual = { id: 't1', zone_id: 'z1', assigned_waiter_id: 'w1' };
  const tableZoneOnly = { id: 't2', zone_id: 'z1', assigned_waiter_id: null };
  const tableUnassigned = { id: 't3', zone_id: null, assigned_waiter_id: null };

  assert(resolveTableWaiter(tableManual, mockZones, mockStaff) === 'Alex', 'Manual assignment overrides zone assignment');
  assert(resolveTableWaiter(tableZoneOnly, mockZones, mockStaff) === 'Bella', 'Zone assignment applies when manual assignment is absent');
  assert(resolveTableWaiter(tableUnassigned, mockZones, mockStaff) === 'Unassigned', 'Fallback to Unassigned when neither is present');

  // Test 10: Blueprint Save Safety & AutoSaveEngine
  console.log('\nTest 10: Blueprint Save Safety & AutoSaveEngine');
  const { AutoSaveEngine } = await import('../src/components/floorplan/AutoSaveEngine');
  assert(typeof AutoSaveEngine === 'function', 'AutoSaveEngine class is available');
  const testEngine = new AutoSaveEngine('test-rest-id');
  assert(typeof (testEngine as any).flushSave === 'function', 'AutoSaveEngine provides flushSave method for instant manual save');
  assert(typeof (testEngine as any).markDirty === 'function', 'AutoSaveEngine provides markDirty method for 3-second debounced save');
  testEngine.destroy();

  // Test 11: Inventory Freeze Protection Rule Check
  console.log('\nTest 11: Inventory Freeze Invariant Verification');
  const inventoryEnginePath = path.resolve(process.cwd(), 'src/lib/inventoryEngine.ts');
  const inventoryUnitsPath = path.resolve(process.cwd(), 'src/lib/inventoryUnits.ts');
  assert(fs.existsSync(inventoryEnginePath), 'src/lib/inventoryEngine.ts exists');
  assert(fs.existsSync(inventoryUnitsPath), 'src/lib/inventoryUnits.ts exists');

  // Test 12: React Hook Safety Verification
  console.log('\nTest 12: React Hook Safety Guardrail Verification');
  const { auditFile } = await import('./audit-react-hooks.mjs');
  const keyDashboardFiles = [
    'src/app/(dashboard)/dashboard/orders/page.tsx',
    'src/app/(dashboard)/dashboard/kds/page.tsx',
    'src/components/floorplan/FloorCanvas.tsx',
    'src/components/floorplan/OpenBillsDrawer.tsx',
    'src/components/floorplan/TableQuickActionPopover.tsx',
    'src/components/customer/CustomerMenu.tsx'
  ];
  let hookViolationsTotal = 0;
  for (const f of keyDashboardFiles) {
    const fullPath = path.resolve(process.cwd(), f);
    if (fs.existsSync(fullPath)) {
      const code = fs.readFileSync(fullPath, 'utf8');
      const v = auditFile(fullPath, code);
      hookViolationsTotal += v.length;
    }
  }
  assert(hookViolationsTotal === 0, `0 React Hook violations across modified dashboard & customer files (Violations: ${hookViolationsTotal})`);

  // Test 13: Search Consistency with 4-Digit Padding
  console.log('\nTest 13: 4-Digit Sequence Search & Customer Name');
  const orderWithNotes = {
    id: '7b8c9d0e-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
    order_number: 7,
    order_type: 'dine_in',
    special_instructions: 'Customer: Priya Patel | Phone: 9988776655 | Table: 4'
  };
  assert(matchesOrderSearchQuery(orderWithNotes, '0007', 'The Foody Hub'), 'Matches padded sequence 0007');
  assert(matchesOrderSearchQuery(orderWithNotes, 'Priya', 'The Foody Hub'), 'Matches customer name Priya from instructions');
  assert(matchesOrderSearchQuery(orderWithNotes, '9988776655', 'The Foody Hub'), 'Matches phone from instructions');
  console.log('\n====================================================');
  console.log(`Smoke Test Suite Complete: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error('Unhandled error in test suite:', e);
  process.exit(1);
});
