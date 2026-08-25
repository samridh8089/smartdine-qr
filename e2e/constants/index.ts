/**
 * SmartDine SaaS — E2E Constants
 * Phase 7A.2 — Infrastructure
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  ORDER: (slug: string, table: string) => `/menu/${slug}?table=${table}`,
  ORDER_TRACKING: (orderId: string) => `/order-tracking/${orderId}`,
  DASHBOARD: '/dashboard',
  ORDERS: '/dashboard/orders',
  KDS: '/dashboard/kds',
  REPORTS: '/dashboard/reports',
  MENU_MANAGEMENT: '/dashboard/menu',
  TABLE_MANAGEMENT: '/dashboard/tables',
  STAFF_MANAGEMENT: '/dashboard/staff',
  SUPER_ADMIN: '/super-admin',
} as const;

export const ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  KITCHEN: 'kitchen',
  WAITER: 'waiter',
  CASHIER: 'cashier',
  SUPER_ADMIN: 'super_admin',
  CUSTOMER: 'customer',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

export const ORDER_STATUSES = {
  NEW: 'new',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

export const REQUEST_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  COMPLETED: 'completed',
} as const;

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  TRIAL: 'trial',
  EXPIRED: 'expired',
} as const;

export const TIMEOUTS = {
  FAST: 2_000,
  MEDIUM: 5_000,
  LONG: 10_000,
  NAVIGATION: 30_000,
  API: 15_000,
} as const;

export const DEVICES = {
  DESKTOP_HD: 'Desktop Chrome',
  DESKTOP_FIREFOX: 'Desktop Firefox',
  DESKTOP_EDGE: 'Desktop Edge',
  DESKTOP_SAFARI: 'Desktop Safari',
  PIXEL_7: 'Pixel 7',
  IPHONE_15: 'iPhone 15',
  IPHONE_SE: 'iPhone SE',
  IPAD: 'iPad (gen 7)',
} as const;

export const SELECTORS = {
  COMMON: {
    SPINNER: '[data-testid="loading-spinner"]',
    TOAST: '[data-testid="toast-notification"]',
    MODAL_CONTAINER: '[role="dialog"]',
    CONFIRM_BUTTON: '[data-testid="confirm-button"]',
    CANCEL_BUTTON: '[data-testid="cancel-button"]',
  },
} as const;
