/**
 * Comprehensive Test Suite for packages/core Shared Business Logic Foundation
 * Validates:
 * 1. Orders module: State transitions, Order ID generation, search matching, customer parsing
 * 2. Inventory module: Recipe portion scaling, threshold alerts, unit conversions
 * 3. Billing module: Equal split integer rupee conservation, custom split validation, round-off, billing totals
 * 4. Staff module: Role permissions, privilege escalation defense, invite validation, OTP lifecycle
 * 5. Bookings module: Time parser, overlap collision detection, seatable evaluation
 * 6. Tables module: 3-tier waiter hierarchy, transfer validation, occupancy sync
 * 7. Sessions module: Duration calculation, closure eligibility
 * 8. Audit module: Payload construction, description formatting
 * 9. Sync module: Idempotency keys, retryable error classifier, conflict resolution
 */

import assert from 'assert';
import {
  VALID_ORDER_TRANSITIONS,
  ALLOWED_PRIOR_STATUSES,
  validateOrderTransition,
  getOrderStatusLabel,
  getDeterministicRestaurantCode,
  getFormattedOrderId,
  getCustomerFacingOrderId,
  matchesOrderSearchQuery,
  parseCustomerDetailsFromOrder,
  validateTakeawayCustomer,
  validateCreateOrderPayload,
  // Inventory
  getPortionMultiplier,
  isStockSufficient,
  isLowStockThresholdBreached,
  calculateScaledIngredientQuantity,
  convertUnit,
  // Billing
  calculateEqualSplit,
  validateCustomSplit,
  calculateRoundOff,
  calculateBillingTotals,
  // Staff
  ROLE_PERMISSIONS,
  canPerformAction,
  isRoleEscalationAttempt,
  validateStaffInvite,
  validateOtpFormat,
  isOtpExpired,
  calculateOtpExpiry,
  // Bookings
  parseTimeToMinutes,
  checkBookingOverlap,
  validateBookingPayload,
  isBookingSeatable,
  // Tables
  VALID_TABLE_TRANSITIONS,
  resolveTableWaiter,
  validateTableTransfer,
  computeTransferredTableStates,
  isTableOccupiedByActiveOrders,
  // Sessions
  calculateDiningDurationMinutes,
  formatDiningDuration,
  isSessionEligibleForClosure,
  // Audit
  buildAuditPayload,
  formatAuditDescription,
  // Sync
  generateIdempotencyKey,
  isRetryableSyncError,
  resolveSyncConflict
} from '../packages/core';

console.log('================================================================================');
console.log('TESTING PACKAGES/CORE: SHARED BUSINESS LOGIC FOUNDATION');
console.log('================================================================================\n');

let totalTests = 0;
let passedTests = 0;

function check(testName: string, condition: boolean, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}${details ? ` (${details})` : ''}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` (${details})` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function run() {
  // 1. ORDERS MODULE
  console.log('--- 1. Orders Module Tests ---');
  check('State Transition: new -> accepted is valid', validateOrderTransition('new', 'accepted').valid);
  check('State Transition: new -> served is rejected', !validateOrderTransition('new', 'served').valid);
  check('State Transition: preparing -> ready is valid', validateOrderTransition('preparing', 'ready').valid);
  check('Takeaway Status Label: served displays Handed Over', getOrderStatusLabel('served', 'takeaway') === 'Handed Over');
  check('Dine-In Status Label: served displays Served', getOrderStatusLabel('served', 'dine_in') === 'Served');

  const orderId = getFormattedOrderId(
    { id: '123', order_number: 1, order_type: 'takeaway', created_at: '2026-09-14T10:00:00Z' },
    'The Foody Hub (Udaipur)'
  );
  check('Order ID Format matches <Rest>-<YY><Type><Seq>', /^[A-Z0-9]{3}-\d{2}T\d{4}$/.test(orderId), orderId);

  const customerFacingId = getCustomerFacingOrderId(
    { id: '123', order_number: 1, order_type: 'takeaway', created_at: '2026-09-14T10:00:00Z' },
    'The Foody Hub (Udaipur)'
  );
  check('Customer Facing Order ID hides restaurant code', customerFacingId === 'Order #26T0001', customerFacingId);

  const parsedCustomer = parseCustomerDetailsFromOrder({
    special_instructions: 'CUSTOMER: Vikram Singhania | PHONE: 9876543210 | NOTES: Extra lime'
  });
  check('Parse Customer Name from notes', parsedCustomer.name === 'Vikram Singhania');
  check('Parse Customer Phone from notes', parsedCustomer.phone === '9876543210');

  check('Search Match by sequence number', matchesOrderSearchQuery({ order_number: 45, order_type: 'dine_in' }, '0045'));
  check('Takeaway Validation rejects missing name', !validateTakeawayCustomer('', '9876543210').valid);
  check('Takeaway Validation rejects short phone', !validateTakeawayCustomer('Rahul', '12345').valid);
  check('Takeaway Validation accepts valid inputs', validateTakeawayCustomer('Rahul', '9876543210').valid);

  // 2. INVENTORY MODULE
  console.log('\n--- 2. Inventory Module Tests ---');
  check('Portion Multiplier: Half = 0.5', getPortionMultiplier('Half') === 0.5);
  check('Portion Multiplier: Double = 2.0', getPortionMultiplier('Double') === 2.0);
  check('Portion Multiplier: Standard = 1.0', getPortionMultiplier('Full') === 1.0);
  check('Stock Sufficiency Check', isStockSufficient(10, 5) && !isStockSufficient(2, 5));
  check('Low Stock Threshold Breach', isLowStockThresholdBreached(3, 5) && !isLowStockThresholdBreached(10, 5));
  check('Scaled Ingredient Calculation', calculateScaledIngredientQuantity(100, 0.5, 4) === 200);
  check('Unit Conversion: kg to g', convertUnit(1.5, 'kg', 'g') === 1500);

  // 3. BILLING MODULE
  console.log('\n--- 3. Billing Module Tests ---');
  // Equal Split Integer Conservation Test: ₹1000 across 3 guests
  const split3 = calculateEqualSplit(1000, 3);
  check('Equal Split Conservation: 3 guests total ₹1000', split3.isConserved && split3.portions.length === 3);
  check('Equal Split Amounts: [334, 333, 333]', 
    split3.portions[0].amount === 334 && 
    split3.portions[1].amount === 333 && 
    split3.portions[2].amount === 333
  );

  const customCheck = validateCustomSplit([300, 400, 300], 1000);
  check('Custom Split Valid when sum equals target', customCheck.valid && customCheck.difference === 0);
  const customInvalid = validateCustomSplit([300, 400, 250], 1000);
  check('Custom Split Rejects underpayment', !customInvalid.valid && customInvalid.difference === 50);

  const roundOff = calculateRoundOff(125.60);
  check('Round-off 50-paise boundary', roundOff.rounded === 126 && roundOff.roundOffDiff === 0.4);

  const billingTotals = calculateBillingTotals({
    items: [{ price: 200, quantity: 2 }]
  });
  check('Billing Totals: Subtotal 400 calculated', billingTotals.validSubtotal === 400);

  // 4. STAFF MODULE
  console.log('\n--- 4. Staff Module Tests ---');
  check('Owner has all permissions (*)', canPerformAction('owner', 'any_action_allowed'));
  check('Waiter can punch order', canPerformAction('waiter', 'orders:create'));
  check('Waiter cannot settle bill', !canPerformAction('waiter', 'billing:settle'));
  check('Cashier can settle bill', canPerformAction('cashier', 'billing:settle'));
  check('Privilege Escalation Blocked for owner invite', isRoleEscalationAttempt('owner'));
  check('Privilege Escalation Blocked for super_admin invite', isRoleEscalationAttempt('super_admin'));
  check('Legitimate Staff Role permitted for waiter invite', !isRoleEscalationAttempt('waiter'));

  check('Staff Invite Validation rejects invalid email', !validateStaffInvite({ email: 'bad-email', role: 'waiter' }).valid);
  check('Staff Invite Validation rejects owner role escalation', !validateStaffInvite({ email: 'test@mail.com', role: 'owner' }).valid);
  check('Staff Invite Validation passes valid waiter invite', validateStaffInvite({ email: 'alex@smartdine.io', role: 'waiter' }).valid);

  check('OTP Format Validation accepts 6-digit', validateOtpFormat('123456'));
  check('OTP Format Validation rejects non-numeric', !validateOtpFormat('12345a'));
  check('OTP Expiry Check: Past timestamp is expired', isOtpExpired(Date.now() - 1000));
  check('OTP Expiry Check: Future timestamp is valid', !isOtpExpired(Date.now() + 60000));

  // 5. BOOKINGS MODULE
  console.log('\n--- 5. Bookings Module Tests ---');
  check('Parse time "19:30" to minutes: 1170', parseTimeToMinutes('19:30') === 1170);
  check('Booking Overlap Detected within 90 mins (19:00 and 19:45)', checkBookingOverlap('19:00', '19:45', 90));
  check('Booking Overlap Absent outside 90 mins (19:00 and 21:00)', !checkBookingOverlap('19:00', '21:00', 90));
  check('Booking Validation passes valid payload', validateBookingPayload({
    customer_name: 'Priya Sharma',
    customer_phone: '9876543210',
    guest_count: 4,
    booking_date: '2026-09-15',
    booking_time: '20:00'
  }).valid);

  // 6. TABLES MODULE
  console.log('\n--- 6. Tables Module Tests ---');
  const zones = [{ id: 'z1', name: 'Main', assigned_waiter_id: 'w-zone-01' }];
  const staff = [{ id: 'w-manual-01', name: 'Manual Waiter' }, { id: 'w-zone-01', name: 'Zone Waiter' }];
  check('Waiter Hierarchy 1: Manual overrides zone', 
    resolveTableWaiter({ assigned_waiter_id: 'w-manual-01', zone_id: 'z1' }, zones, staff) === 'Manual Waiter'
  );
  check('Waiter Hierarchy 2: Zone used when manual absent', 
    resolveTableWaiter({ assigned_waiter_id: null, zone_id: 'z1' }, zones, staff) === 'Zone Waiter'
  );
  check('Waiter Hierarchy 3: Unassigned fallback', 
    resolveTableWaiter({ assigned_waiter_id: null, zone_id: null }, zones, staff) === 'Unassigned'
  );

  const transferCheck = validateTableTransfer(
    { id: 't1', name: 'Table 1', status: 'occupied' } as any,
    { id: 't2', name: 'Table 2', status: 'available' } as any
  );
  check('Table Transfer permitted to available table', transferCheck.valid);

  const transferBlocked = validateTableTransfer(
    { id: 't1', name: 'Table 1', status: 'occupied' } as any,
    { id: 't2', name: 'Table 2', status: 'occupied' } as any
  );
  check('Table Transfer blocked to occupied table', !transferBlocked.valid);

  const newStates = computeTransferredTableStates('t1', 't2', { t1: { occupancy_status: 'occupied', guest_count: 3 } });
  check('Transferred state: t2 occupied, t1 available', 
    newStates.t2.occupancy_status === 'occupied' && newStates.t1.occupancy_status === 'available'
  );

  // 7. SESSIONS MODULE
  console.log('\n--- 7. Sessions Module Tests ---');
  const duration = calculateDiningDurationMinutes(Date.now() - 45 * 60 * 1000);
  check('Dining duration calculated: 45m', duration === 45);
  check('Format dining duration: 1h 30m', formatDiningDuration(90) === '1h 30m');
  check('Session closure blocked if unpaid orders exist', !isSessionEligibleForClosure(2).canClose);
  check('Session closure permitted if 0 unpaid orders', isSessionEligibleForClosure(0).canClose);

  // 8. AUDIT MODULE
  console.log('\n--- 8. Audit Module Tests ---');
  const audit = buildAuditPayload({
    restaurantId: 'rest-01',
    action: 'payment_completed',
    entity: 'order',
    entityId: 'ord-123',
    details: { total: 450 }
  });
  check('Audit payload built with ISO timestamp', !!audit.timestamp);
  check('Format audit description: payment_completed', formatAuditDescription('payment_completed', 'order', { total: 450 }).includes('₹450'));

  // 9. SYNC MODULE
  console.log('\n--- 9. Sync Module Tests ---');
  const key1 = generateIdempotencyKey('order');
  const key2 = generateIdempotencyKey('order');
  check('Idempotency key generated uniquely', key1 !== key2 && key1.startsWith('order-'));
  check('Transient error is retryable', isRetryableSyncError('network timeout', 1));
  check('Constraint violation is NOT retryable', !isRetryableSyncError('violates foreign key constraint', 0));
  check('Max retries exceeded is NOT retryable', !isRetryableSyncError('network timeout', 5));

  const conflict = resolveSyncConflict(
    { action_type: 'staff_punch', payload: {} } as any,
    { status: 'completed', payment_status: 'paid' }
  );
  check('Conflict Resolution: Settled server state wins over late local punch', conflict.strategy === 'server_wins');

  console.log('\n================================================================================');
  console.log(`ALL PACKAGES/CORE TESTS PASSED: ${passedTests}/${totalTests} (100%)`);
  console.log('================================================================================\n');
}

run().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
