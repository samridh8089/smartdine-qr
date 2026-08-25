/**
 * SmartDine SaaS — Custom Reusable Fixtures
 * Phase 7A.2 — Infrastructure
 *
 * Provides custom test fixtures for role-authenticated pages, error guards,
 * accessibility helper, and database cleanup.
 */

import { test as base, Page } from '@playwright/test';
import { CustomerMenuPage } from '../page-objects/customer-menu.page';
import { KitchenPage } from '../page-objects/kitchen.page';
import { WaiterPage } from '../page-objects/waiter.page';
import { OwnerDashboardPage } from '../page-objects/owner-dashboard.page';
import { SuperAdminPage } from '../page-objects/super-admin.page';
import { AccessibilityHelper } from '../accessibility/accessibility.helper';
import { ConsoleHelper } from '../network/console.helper';
import { NetworkHelper } from '../network/network.helper';
import { BaseDatabaseHelper } from '../database/base-database.helper';
import { StorageStateHelper } from '../helpers/storage-state.helper';

export type SmartDineFixtures = {
  customerMenuPage: CustomerMenuPage;
  kitchenPage: KitchenPage;
  waiterPage: WaiterPage;
  ownerDashboardPage: OwnerDashboardPage;
  superAdminPage: SuperAdminPage;

  accessibilityHelper: AccessibilityHelper;
  consoleGuard: ConsoleHelper;
  networkGuard: NetworkHelper;
  dbHelper: BaseDatabaseHelper;

  authenticatedPage: (role: 'owner' | 'manager' | 'kitchen' | 'waiter' | 'cashier' | 'super_admin') => Promise<Page>;
};

export const test = base.extend<SmartDineFixtures>({
  customerMenuPage: async ({ page }, use) => {
    const customerPage = new CustomerMenuPage(page);
    await use(customerPage);
  },

  kitchenPage: async ({ page }, use) => {
    const kitchen = new KitchenPage(page);
    await use(kitchen);
  },

  waiterPage: async ({ page }, use) => {
    const waiter = new WaiterPage(page);
    await use(waiter);
  },

  ownerDashboardPage: async ({ page }, use) => {
    const owner = new OwnerDashboardPage(page);
    await use(owner);
  },

  superAdminPage: async ({ page }, use) => {
    const admin = new SuperAdminPage(page);
    await use(admin);
  },

  accessibilityHelper: async ({ page }, use) => {
    const a11y = new AccessibilityHelper(page);
    await use(a11y);
  },

  consoleGuard: async ({ page }, use) => {
    const guard = new ConsoleHelper(page);
    guard.startMonitoring();
    await use(guard);
    guard.assertNoConsoleErrors();
  },

  networkGuard: async ({ page }, use) => {
    const guard = new NetworkHelper(page);
    guard.startMonitoring();
    await use(guard);
    guard.assertNoNetworkErrors();
  },

  dbHelper: async ({}, use) => {
    const db = new BaseDatabaseHelper();
    await use(db);
  },

  authenticatedPage: async ({ browser, page }, use) => {
    const pageFactory = async (role: 'owner' | 'manager' | 'kitchen' | 'waiter' | 'cashier' | 'super_admin') => {
      const storageState = StorageStateHelper.getPathForRole(role);
      const currentViewport = page.viewportSize();
      const context = await browser.newContext({
        storageState,
        viewport: currentViewport ?? undefined,
      });
      return await context.newPage();
    };
    await use(pageFactory);
  },
});

export { expect } from '@playwright/test';
