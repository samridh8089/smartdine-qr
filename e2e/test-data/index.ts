/**
 * SmartDine SaaS — Static Test Data Exports
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix B (Test Data Fixtures)
 */

export const SEED_DATA = {
  restaurantSlug: 'test-restaurant',
  tableSlug: 'table-1',
  owner: {
    email: 'owner@test.com',
    password: 'TestOwner123!',
  },
  waiter: {
    email: 'waiter@test.com',
    password: 'TestWaiter123!',
  },
  kitchen: {
    email: 'kitchen@test.com',
    password: 'TestKitchen123!',
  },
  superAdmin: {
    email: 'superadmin@test.com',
    password: 'SuperAdmin123!',
  },
  billingTestItem: {
    name: 'Item For Billing Test',
    price: 200,
    expectedSubtotal: 200,
    expectedGst: 10,
    expectedServiceCharge: 20,
    expectedGrandTotal: 230,
  },
} as const;
