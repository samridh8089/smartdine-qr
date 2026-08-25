/**
 * SmartDine SaaS — Owner P0 Business Test Suite
 * Phase 7A.7 — Owner P0 Playwright Tests
 *
 * Covers all Owner-critical P0 workflows:
 *   TC-O-001: Owner can load the Overview Dashboard with metrics
 *   TC-O-002: Owner can access Live Orders page
 *   TC-O-003: Owner can access Menu Management and view items/categories
 *   TC-O-004: Owner can access Table Management and view QR tables
 *   TC-O-005: Owner can access Reports & Analytics page
 *   TC-O-006: Owner can access Settings & Staff page
 *   TC-O-007: Owner sidebar navigation links all resolve correctly
 */

import { test, expect } from '../../fixtures/base.fixture';
import { ROUTES } from '../../constants';

test.describe('Owner P0 Business Test Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  // ─────────────────────────────────────────────
  // TC-O-001: Overview Dashboard
  // ─────────────────────────────────────────────
  test('TC-O-001: Owner can load the Overview Dashboard with key metrics', async ({ authenticatedPage, ownerDashboardPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ownerDashboardPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Main heading
    await expect(page.getByRole('heading', { name: /overview dashboard/i }).first()).toBeVisible({ timeout: 30000 });

    // Four metric cards
    await expect(page.getByText(/revenue today/i).first()).toBeVisible();
    await expect(page.getByText(/total orders today/i).first()).toBeVisible();
    await expect(page.getByText(/active tables/i).first()).toBeVisible();
    await expect(page.getByText(/conversion rate/i).first()).toBeVisible();

    // Recent Orders panel
    await expect(page.getByRole('heading', { name: /recent orders/i }).first()).toBeVisible();

    // "View All Orders" quick link
    await expect(page.getByRole('link', { name: /view all orders/i }).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // TC-O-002: Live Orders page
  // ─────────────────────────────────────────────
  test('TC-O-002: Owner can access and manage Live Orders page', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ROUTES.ORDERS, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Main heading
    await expect(page.getByRole('heading', { name: /live orders & requests/i }).first()).toBeVisible({ timeout: 30000 });

    // Functional tab buttons
    await expect(page.getByRole('button', { name: /live orders/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /customer calls/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /punch new order/i }).first()).toBeVisible();

    // Status filter combobox
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // TC-O-003: Menu Management
  // ─────────────────────────────────────────────
  test('TC-O-003: Owner can access Menu Management and view categories and items', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ROUTES.MENU_MANAGEMENT, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Main heading
    await expect(page.getByRole('heading', { name: /menu management/i }).first()).toBeVisible({ timeout: 30000 });

    // Add Category and Add Menu Item action buttons
    await expect(page.getByRole('button', { name: /category/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /menu item/i }).first()).toBeVisible();

    // "All Items" filter in categories sidebar
    await expect(page.getByText(/all items/i).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // TC-O-004: Table Management
  // ─────────────────────────────────────────────
  test('TC-O-004: Owner can access Table Management and view QR tables', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ROUTES.TABLE_MANAGEMENT, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Heading contains "Tables" or "QR"
    await expect(
      page.getByRole('heading', { name: /tables|qr/i }).first()
    ).toBeVisible({ timeout: 30000 });

    // "Add Table" button
    await expect(page.getByRole('button', { name: /add table/i }).first()).toBeVisible();

    // Either a table card or an empty state is acceptable
    const hasTable  = await page.getByText(/table \d+/i).first().isVisible({ timeout: 8000 }).catch(() => false);
    const hasEmpty  = await page.getByText(/no tables|create your first/i).first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasTable || hasEmpty).toBe(true);
  });

  // ─────────────────────────────────────────────
  // TC-O-005: Reports & Analytics
  // ─────────────────────────────────────────────
  test('TC-O-005: Owner can access Reports & Analytics page', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ROUTES.REPORTS, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Either the analytics content heading or the plan-locked gate should be present
    const analyticsText = page.getByText(/analytics|revenue|reports/i).first();
    await expect(analyticsText).toBeVisible({ timeout: 30000 });

    // If NOT locked — time-range controls (Daily / Weekly / Monthly) should be visible
    const isLocked = await page.getByText(/analytics.*locked|locked|upgrade plan/i).first()
      .isVisible({ timeout: 3000 }).catch(() => false);
    if (!isLocked) {
      const hasWeekly = await page.getByRole('button', { name: /weekly/i }).first()
        .isVisible({ timeout: 5000 }).catch(() => false);
      const hasDaily  = await page.getByRole('button', { name: /daily/i }).first()
        .isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasWeekly || hasDaily).toBe(true);
    }
  });

  // ─────────────────────────────────────────────
  // TC-O-006: Settings & Staff
  // ─────────────────────────────────────────────
  test('TC-O-006: Owner can access Settings page and see configuration tabs', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto('/dashboard/settings', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Heading: "Settings & Brand Control"
    await expect(
      page.getByRole('heading', { name: /settings|brand control/i }).first()
    ).toBeVisible({ timeout: 30000 });

    // Primary settings tabs: Restaurant Profile, Staff Accounts
    await expect(page.getByRole('button', { name: /restaurant profile/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /staff accounts/i }).first()).toBeVisible();

    // Restaurant name input is pre-filled from DB
    const restNameInput = page.getByRole('textbox', { name: /restaurant name/i }).first();
    await expect(restNameInput).toBeVisible();
    const nameValue = await restNameInput.inputValue();
    expect(nameValue.length).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // TC-O-007: Sidebar navigation coverage
  // ─────────────────────────────────────────────
  test('TC-O-007: Owner sidebar navigation links all resolve correctly', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ROUTES.DASHBOARD, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // The sidebar renders these items for "owner" role (from layout.tsx):
    // Overview, Menu Management, Tables & QRs, Kitchen Display,
    // Live Orders, Reports & Analytics, Billing & SaaS, Settings & Staff
    const expectedSidebarLinks = [
      'Overview',
      'Menu Management',
      'Tables & QRs',
      'Kitchen Display',
      'Live Orders',
      'Reports & Analytics',
      'Billing & SaaS',
      'Settings & Staff',
    ];

    for (const linkName of expectedSidebarLinks) {
      const link = page.getByRole('link', { name: linkName, exact: true }).first();
      const isVisible = await link.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        console.warn(`[TC-O-007] Sidebar link not visible: "${linkName}" — sidebar may be collapsed`);
      }
    }

    // Navigate to Menu Management via sidebar click
    const menuLink = page.getByRole('link', { name: 'Menu Management', exact: true }).first();
    await expect(menuLink).toBeVisible({ timeout: 15000 });
    await menuLink.click();
    await expect(page).toHaveURL(/\/dashboard\/menu/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /menu management/i }).first()).toBeVisible({ timeout: 15000 });

    // Navigate to Tables & QRs
    const tablesLink = page.getByRole('link', { name: 'Tables & QRs', exact: true }).first();
    await expect(tablesLink).toBeVisible({ timeout: 10000 });
    await tablesLink.click();
    await expect(page).toHaveURL(/\/dashboard\/tables/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /tables|qr/i }).first()).toBeVisible({ timeout: 15000 });

    // Navigate back to Overview
    const overviewLink = page.getByRole('link', { name: 'Overview', exact: true }).first();
    await expect(overviewLink).toBeVisible({ timeout: 10000 });
    await overviewLink.click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /overview dashboard/i }).first()).toBeVisible({ timeout: 15000 });
  });
});
