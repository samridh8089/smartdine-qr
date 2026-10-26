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
    email: process.env.E2E_OWNER_EMAIL || 'owner@test.com',
    password: process.env.E2E_OWNER_PASSWORD || '',
  },
  waiter: {
    email: process.env.E2E_WAITER_EMAIL || 'waiter@test.com',
    password: process.env.E2E_WAITER_PASSWORD || '',
  },
  kitchen: {
    email: process.env.E2E_KITCHEN_EMAIL || 'kitchen@test.com',
    password: process.env.E2E_KITCHEN_PASSWORD || '',
  },
  superAdmin: {
    email: process.env.E2E_SUPER_ADMIN_EMAIL || 'superadmin@test.com',
    password: process.env.E2E_SUPER_ADMIN_PASSWORD || '',
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
