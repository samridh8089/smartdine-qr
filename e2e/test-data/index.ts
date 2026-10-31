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
    email: process.env.E2E_OWNER_EMAIL || 'dsoni1281@gmail.com',
    password: process.env.E2E_OWNER_PASSWORD || '123456',
  },
  waiter: {
    email: process.env.E2E_WAITER_EMAIL || 'waiter@bistro.local',
    password: process.env.E2E_WAITER_PASSWORD || '123456',
  },
  kitchen: {
    email: process.env.E2E_KITCHEN_EMAIL || 'headchef@bistro.local',
    password: process.env.E2E_KITCHEN_PASSWORD || '123456',
  },
  superAdmin: {
    email: process.env.E2E_SUPER_ADMIN_EMAIL || 'dsoni1281@gmail.com',
    password: process.env.E2E_SUPER_ADMIN_PASSWORD || '123456',
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
