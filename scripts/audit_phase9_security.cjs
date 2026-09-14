const fs = require('fs');

async function auditSecurity() {
  console.log('=== PHASE 9: SECURITY & API PERMISSION AUDIT (CodeRabbit) ===\n');

  const BASE_URL = 'http://localhost:3000';
  const results = [];

  function record(testName, expected, actual, passed, details) {
    console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${testName} -> Expected: ${expected}, Got: ${actual}`);
    if (!passed) console.log(`        Details: ${details}`);
    results.push({ testName, expected, actual, passed, details });
  }

  // 1. FACTORY RESET ENDPOINT
  try {
    const res = await fetch(`${BASE_URL}/api/admin/factory-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'demo-rest' })
    });
    record(
      'Factory Reset: Unauthenticated Access Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Factory Reset: Unauthenticated Access Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 2. ENTITY EDIT ENDPOINT (Super Admin)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/entity-edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType: 'restaurant', entityId: 'demo-rest', updates: { name: 'Hacked' } })
    });
    record(
      'Entity Edit: Unauthenticated Access Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Entity Edit: Unauthenticated Access Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 3. APPLY MIGRATION ENDPOINT
  try {
    const res = await fetch(`${BASE_URL}/api/admin/apply-migration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: 'DROP TABLE restaurants;' })
    });
    record(
      'Apply Migration: Arbitrary SQL Execution Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Apply Migration: Arbitrary SQL Execution Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 4. SEED RECIPES ENDPOINT
  try {
    const res = await fetch(`${BASE_URL}/api/admin/seed-recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'demo-rest' })
    });
    record(
      'Seed Recipes: Unauthenticated Access Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Seed Recipes: Unauthenticated Access Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 5. UPDATE PLAN SPECS ENDPOINT
  try {
    const res = await fetch(`${BASE_URL}/api/admin/update-plan-specs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: 'starter', specs: { max_tables: 9999 } })
    });
    record(
      'Update Plan Specs: Unauthenticated Tampering Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Update Plan Specs: Unauthenticated Tampering Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 6. STAFF INVITE PRIVILEGE ESCALATION
  try {
    const res = await fetch(`${BASE_URL}/api/staff/create-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'test-rest', role: 'super_admin', email: 'attacker@exploit.com' })
    });
    record(
      'Staff Invite: Privilege Escalation to Super Admin Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Staff Invite: Privilege Escalation Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 7. STAFF DELETE ENDPOINT
  try {
    const res = await fetch(`${BASE_URL}/api/staff/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: 'owner-uuid-1234', restaurantId: 'test-rest' })
    });
    record(
      'Staff Delete: Unauthenticated Deletion Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Staff Delete: Unauthenticated Deletion Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 8. TABLE ASSIGNMENT ENDPOINT
  try {
    const res = await fetch(`${BASE_URL}/api/staff/table-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'test-rest', assignments: [] })
    });
    record(
      'Table Assignments: Unauthenticated Modification Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Table Assignments: Unauthenticated Modification Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 9. UPDATE ORDER STATUS (Staff Auth Required)
  try {
    const res = await fetch(`${BASE_URL}/api/staff/update-order-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'ord-test-1234', newStatus: 'completed' })
    });
    record(
      'Update Order Status: Unauthenticated Status Change Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Update Order Status: Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 10. WAITER PUNCH ORDER (Staff Auth Required)
  try {
    const res = await fetch(`${BASE_URL}/api/staff/punch-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'test-rest', items: [{ menuItemId: 'item-1', quantity: 1 }] })
    });
    record(
      'Waiter Punch Order: Unauthenticated Order Creation Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Waiter Punch Order: Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 11. PUSH DISPATCH ENDPOINT
  try {
    const res = await fetch(`${BASE_URL}/api/push/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'test-rest', title: 'Malicious Push', body: 'Fake broadcast' })
    });
    record(
      'Push Dispatch: Unauthenticated Push Notification Blocked',
      '401 or 403',
      res.status,
      res.status === 401 || res.status === 403,
      await res.text()
    );
  } catch (e) {
    record('Push Dispatch: Blocked', '401/403', 'ERROR', false, e.message);
  }

  // 12. CUSTOMER ORDER: ZERO/NEGATIVE QUANTITY TAMPERING
  try {
    const res = await fetch(`${BASE_URL}/api/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: 'test-rest',
        items: [{ menuItemId: 'item-1', quantity: -5 }]
      })
    });
    record(
      'Customer Order: Negative Quantity Rejected',
      '400 Bad Request',
      res.status,
      res.status === 400,
      await res.text()
    );
  } catch (e) {
    record('Customer Order: Negative Quantity Rejected', '400', 'ERROR', false, e.message);
  }

  // 13. CUSTOMER ORDER: EMPTY ITEMS ARRAY
  try {
    const res = await fetch(`${BASE_URL}/api/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: 'test-rest',
        items: []
      })
    });
    record(
      'Customer Order: Empty Items Array Rejected',
      '400 Bad Request',
      res.status,
      res.status === 400,
      await res.text()
    );
  } catch (e) {
    record('Customer Order: Empty Items Array Rejected', '400', 'ERROR', false, e.message);
  }

  // 14. CUSTOMER ORDER: MISSING RESTAURANT ID
  try {
    const res = await fetch(`${BASE_URL}/api/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ menuItemId: 'item-1', quantity: 1 }]
      })
    });
    record(
      'Customer Order: Missing Restaurant ID Rejected',
      '400 Bad Request',
      res.status,
      res.status === 400,
      await res.text()
    );
  } catch (e) {
    record('Customer Order: Missing Restaurant ID Rejected', '400', 'ERROR', false, e.message);
  }

  console.log(`\n=== SECURITY AUDIT COMPLETE: ${results.filter(r => r.passed).length}/${results.length} PASSED ===\n`);
  fs.writeFileSync('scripts/security_audit_results.json', JSON.stringify(results, null, 2));
}

auditSecurity().catch(console.error);
