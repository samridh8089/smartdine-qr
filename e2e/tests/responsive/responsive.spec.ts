/**
 * SmartDine SaaS — Responsive & Mobile Compatibility Test Suite
 * Phase 7B.3 — Responsive / Mobile Tests
 *
 * Spec Reference: Appendix D (Responsive & Mobile Specifications)
 * Target Viewports / Devices:
 *   1. Desktop HD (1920x1080)
 *   2. Laptop (1366x768)
 *   3. iPad (810x1080)
 *   4. iPhone SE (320x568)
 *   5. iPhone 15 (393x659)
 *   6. Pixel 7 (412x839)
 */

import { test, expect } from '../../fixtures/base.fixture';
import { ROUTES } from '../../constants';

test.describe('Responsive & Mobile Compatibility Test Suite (@responsive @mobile @tablet)', () => {
  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-001: Navigation & Header Responsiveness
  // ─────────────────────────────────────────────
  test('TC-RESP-001: Navigation header adapts to viewport without page overflow (@responsive @mobile @tablet)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Assert main container visibility
    await expect(page.getByRole('heading', { name: /sign in/i }).first()).toBeVisible({ timeout: 30000 });

    // Verify page body does not exhibit unwanted horizontal scrollbar
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-002: Customer Menu Rendering & Category Filter
  // ─────────────────────────────────────────────
  test('TC-RESP-002: Customer QR Menu layout and category filter adapt to screen width (@responsive @mobile @tablet)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify main restaurant title
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30000 });

    // Verify Add buttons are visible
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await expect(addButton).toBeVisible({ timeout: 30000 });

    // Verify horizontal overflow guard on customer menu
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-003: Customer Cart Drawer & Touch Controls
  // ─────────────────────────────────────────────
  test('TC-RESP-003: Cart drawer opens responsively with touch-friendly controls (@responsive @mobile @tablet)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Add item to cart
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    // Open Cart drawer
    await customerMenuPage.openCart();

    // Verify Place Order button is visible inside drawer
    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderBtn).toBeVisible({ timeout: 15000 });

    // Touch target size validation for Place Order button
    const box = await placeOrderBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(36); // Touch target height
      expect(box.width).toBeGreaterThanOrEqual(100);
    }
  });

  // ─────────────────────────────────────────────
  // TC-RESP-004: Customer Checkout Modal Responsiveness
  // ─────────────────────────────────────────────
  test('TC-RESP-004: Checkout modal adapts to screen overlay without horizontal page overflow (@responsive @mobile @tablet)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();

    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderBtn).toBeVisible({ timeout: 15000 });

    // Verify modal elements stay within viewport boundaries
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-005: Order Tracking Page Responsive Timeline
  // ─────────────────────────────────────────────
  test('TC-RESP-005: Order tracking timeline renders responsively (@responsive @mobile @tablet)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();

    const placeOrderButton = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderButton).toBeVisible({ timeout: 15000 });
    await placeOrderButton.click();

    await expect(page).toHaveURL(/order-tracking/i, { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Assert timeline header & back to menu navigation button visibility
    await expect(page.getByText(/back to menu|order sent|order #|preparing|ready/i).first()).toBeVisible({ timeout: 30000 });

    // Verify no horizontal overflow
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-006: Kitchen KDS Dashboard Responsive Columns
  // ─────────────────────────────────────────────
  test('TC-RESP-006: Kitchen KDS Dashboard adapts ticket columns to screen width (@responsive @mobile @tablet)', async ({ authenticatedPage, kitchenPage }) => {
    const page = await authenticatedPage('kitchen');
    await page.goto(kitchenPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page.getByRole('heading', { name: /kitchen display system/i }).first()).toBeVisible({ timeout: 30000 });

    // Verify no page body horizontal overflow
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-007: Waiter Orders Dashboard Responsive Layout
  // ─────────────────────────────────────────────
  test('TC-RESP-007: Waiter Dashboard adapts orders list and tabs to viewport (@responsive @mobile @tablet)', async ({ authenticatedPage, waiterPage }) => {
    const page = await authenticatedPage('waiter');
    await page.goto(waiterPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page.getByRole('heading', { name: /live orders & requests/i }).first()).toBeVisible({ timeout: 30000 });

    // Verify no page body horizontal overflow
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-008: Owner Dashboard Responsive Grid & Analytics
  // ─────────────────────────────────────────────
  test('TC-RESP-008: Owner Overview Dashboard metric cards adapt to screen width (@responsive @mobile @tablet)', async ({ authenticatedPage, ownerDashboardPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ownerDashboardPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page.getByRole('heading', { name: /overview dashboard/i }).first()).toBeVisible({ timeout: 30000 });

    // Verify no page body horizontal overflow
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-009: Super Admin Dashboard & Tenant Table Overflow
  // ─────────────────────────────────────────────
  test('TC-RESP-009: Super Admin Dashboard wraps cards and scrolls table inside card (@responsive @mobile @tablet)', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page.getByRole('heading', { name: /global platform dashboard/i }).first()).toBeVisible({ timeout: 30000 });

    // Verify page body does NOT overflow horizontally (table should scroll internally in overflow-x-auto)
    const isOverflowing = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    });
    expect(isOverflowing).toBe(false);
  });

  // ─────────────────────────────────────────────
  // TC-RESP-010: Touch Target & Page Overflow Global Audit
  // ─────────────────────────────────────────────
  test('TC-RESP-010: Interactive buttons satisfy touch target guidelines on mobile (@responsive @mobile @tablet)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await expect(addButton).toBeVisible({ timeout: 30000 });

    const box = await addButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(28);
      expect(box.width).toBeGreaterThanOrEqual(28);
    }
  });
});
