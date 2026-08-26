/**
 * SmartDine SaaS — Visual Regression Test Suite
 * Phase 7B.2 — Visual Regression Tests
 *
 * Appendix C Visual Snapshot Coverage:
 *   1. Login Page (/login)
 *   2. Customer QR Menu (/menu/test-restaurant?table=table-1)
 *   3. Customer Cart Drawer
 *   4. Customer Checkout Modal
 *   5. Order Tracking Page (/order-tracking/[order_id])
 *   6. Kitchen KDS Dashboard (/dashboard/kds)
 *   7. Waiter Orders Dashboard (/dashboard/orders)
 *   8. Owner Overview Dashboard (/dashboard)
 *   9. Reports & Analytics (/dashboard/reports)
 *   10. Super Admin Control (/super-admin)
 */

import { test, expect } from '../../fixtures/base.fixture';
import { ROUTES } from '../../constants';
import { VR_CONFIG } from '../../visual';

test.describe('Visual Regression Test Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  // ─────────────────────────────────────────────
  // 1. Login Page
  // ─────────────────────────────────────────────
  test('VR-001: Login Page visual snapshot', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page).toHaveScreenshot('vr-001-login-page.png', {
      maxDiffPixelRatio: VR_CONFIG.loginThreshold,
      animations: 'disabled',
    });
  });

  // ─────────────────────────────────────────────
  // 2. Customer QR Menu
  // ─────────────────────────────────────────────
  test('VR-002: Customer QR Menu visual snapshot', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await expect(page).toHaveScreenshot('vr-002-customer-menu.png', {
      maxDiffPixelRatio: VR_CONFIG.menuThreshold,
      animations: 'disabled',
    });
  });

  // ─────────────────────────────────────────────
  // 3. Customer Cart Drawer
  // ─────────────────────────────────────────────
  test('VR-003: Customer Cart Drawer visual snapshot', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();

    await expect(page).toHaveScreenshot('vr-003-cart-drawer.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
    });
  });

  // ─────────────────────────────────────────────
  // 4. Customer Checkout Modal
  // ─────────────────────────────────────────────
  test('VR-004: Customer Checkout Modal visual snapshot', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();

    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderBtn).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveScreenshot('vr-004-checkout-modal.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
    });
  });

  // ─────────────────────────────────────────────
  // 5. Order Tracking Page
  // ─────────────────────────────────────────────
  test('VR-005: Order Tracking Page visual snapshot', async ({ page, customerMenuPage }) => {
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

    const volatileMasks = [
      page.getByText(/Receipt #|Order #|#SMA-|Order ID/i),
      page.getByText(/\d{1,2}:\d{2}/),
      page.getByText(/Just now|\d+m ago/i),
    ];

    await expect(page).toHaveScreenshot('vr-005-order-tracking.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
      mask: volatileMasks,
    });
  });

  // ─────────────────────────────────────────────
  // 6. Kitchen KDS Dashboard
  // ─────────────────────────────────────────────
  test('VR-006: Kitchen KDS Dashboard visual snapshot', async ({ authenticatedPage, kitchenPage }) => {
    const page = await authenticatedPage('kitchen');
    await page.goto(kitchenPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /kitchen display system/i }).first()).toBeVisible({ timeout: 30000 });

    const volatileMasks = [
      page.locator('main .grid'),
      page.getByRole('heading', { name: /new order waiting for confirmation/i }),
      page.getByText(/loud continuous alarm is active/i),
      page.getByRole('button', { name: /^accept order$/i }),
    ];

    await expect(page).toHaveScreenshot('vr-006-kitchen-kds.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
      mask: volatileMasks,
    });
  });

  // ─────────────────────────────────────────────
  // 7. Waiter Orders Dashboard
  // ─────────────────────────────────────────────
  test('VR-007: Waiter Orders Dashboard visual snapshot', async ({ authenticatedPage, waiterPage }) => {
    const page = await authenticatedPage('waiter');
    await page.goto(waiterPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /live orders & requests/i }).first()).toBeVisible({ timeout: 30000 });

    const volatileMasks = [
      page.getByText(/ORDER #|BATCH #|#SMA-/i),
      page.getByText(/Just now|\d+m ago|\d+s ago/i),
    ];

    await expect(page).toHaveScreenshot('vr-007-waiter-orders.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
      mask: volatileMasks,
    });
  });

  // ─────────────────────────────────────────────
  // 8. Owner Overview Dashboard
  // ─────────────────────────────────────────────
  test('VR-008: Owner Overview Dashboard visual snapshot', async ({ authenticatedPage, ownerDashboardPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ownerDashboardPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /overview dashboard/i }).first()).toBeVisible({ timeout: 30000 });

    const volatileMasks = [
      page.getByText(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i),
      page.getByText(/ORDER #|#SMA-/i),
    ];

    await expect(page).toHaveScreenshot('vr-008-owner-dashboard.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
      mask: volatileMasks,
    });
  });

  // ─────────────────────────────────────────────
  // 9. Reports Page
  // ─────────────────────────────────────────────
  test('VR-009: Reports & Analytics visual snapshot', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ROUTES.REPORTS, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.getByText(/analytics|revenue|reports/i).first()).toBeVisible({ timeout: 30000 });

    await expect(page).toHaveScreenshot('vr-009-reports-page.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
    });
  });

  // ─────────────────────────────────────────────
  // 10. Super Admin Central Control
  // ─────────────────────────────────────────────
  test('VR-010: Super Admin Central Control visual snapshot', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /global platform dashboard/i }).first()).toBeVisible({ timeout: 30000 });

    const volatileMasks = [
      page.locator('tbody tr td:nth-child(4)'),
      page.getByText(/Expires in \d+ days|Expired \d+ days ago/i),
    ];

    await expect(page).toHaveScreenshot('vr-010-super-admin.png', {
      maxDiffPixelRatio: VR_CONFIG.defaultThreshold,
      animations: 'disabled',
      mask: volatileMasks,
    });
  });
});
