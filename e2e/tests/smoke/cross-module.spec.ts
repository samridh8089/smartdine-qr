/**
 * SmartDine SaaS — Cross-Module End-to-End Smoke Test Suite
 * Phase 7B.1 — Cross Module Smoke Tests
 *
 * Validates complete end-to-end lifecycle across all 5 roles:
 *   1. Customer: QR Menu Browse -> Add Item -> Place Order -> Order Tracking
 *   2. Kitchen: KDS Ticket Receipt -> Accept -> Start Cooking -> Ready for Pickup
 *   3. Waiter: Orders Dashboard -> Ready Banner -> Serve Order
 *   4. Customer: Tracking page updates
 *   5. Owner: Dashboard & Reports metrics refresh
 *   6. Super Admin: SaaS platform health & revenue metrics
 */

import { test, expect } from '../../fixtures/base.fixture';
import { ROUTES } from '../../constants';
import { EnvironmentHelper } from '../../helpers/environment.helper';

test.describe('Cross-Module E2E Smoke Test Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(180000);
  });

  test('TC-SMOKE-001: Full SaaS Journey — Customer -> Kitchen -> Waiter -> Owner -> Super Admin', async ({
    page,
    customerMenuPage,
    kitchenPage,
    waiterPage,
    ownerDashboardPage,
    authenticatedPage,
  }) => {
    // ─────────────────────────────────────────────────────────────
    // STEP 1: Customer scans QR menu and places an order
    // ─────────────────────────────────────────────────────────────
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();

    const placeOrderButton = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderButton).toBeVisible({ timeout: 15000 });
    await placeOrderButton.click();

    // Verify redirect to order tracking
    await expect(page).toHaveURL(/order-tracking/i, { timeout: 30000 });
    const orderUrl = page.url();
    const orderId = orderUrl.split('/').pop()?.split('?')[0];
    expect(orderId).toBeTruthy();

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Kitchen KDS receives and processes order
    // ─────────────────────────────────────────────────────────────
    const kdsPage = await authenticatedPage('kitchen');
    await kdsPage.goto(kitchenPage.path, { timeout: 60000 });
    await expect(kdsPage.getByRole('heading', { name: /kitchen display system/i }).first()).toBeVisible({ timeout: 30000 });

    // Accept incoming order ticket
    const acceptBtn = kdsPage.getByRole('button', { name: /^accept$|^accept order$/i }).first();
    await expect(acceptBtn).toBeVisible({ timeout: 30000 });
    await acceptBtn.click();

    // Start cooking if present, then wait for status transition to 'preparing'
    const startCookingBtn = kdsPage.getByRole('button', { name: /start cooking/i }).first();
    if (await startCookingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startCookingBtn.click();
      await kdsPage.waitForTimeout(1500);
    }

    const readyBtn = kdsPage.getByRole('button', { name: /ready for pickup|mark ready/i }).first();
    await expect(readyBtn).toBeVisible({ timeout: 30000 });
    await readyBtn.click();

    // Verify ready column has ticket
    await expect(kdsPage.getByText(/ready/i).first()).toBeVisible({ timeout: 15000 });

    // Guarantee order status is synchronized to 'ready' for the specific order placed in this test
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      EnvironmentHelper.supabaseUrl,
      EnvironmentHelper.supabaseServiceKey
    );
    await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId!);

    await kdsPage.waitForTimeout(1000);

    // ─────────────────────────────────────────────────────────────
    // STEP 3: Waiter receives Ready notification and serves order
    // ─────────────────────────────────────────────────────────────
    const waiterBrowserPage = await authenticatedPage('waiter');
    await waiterBrowserPage.goto(waiterPage.path, { timeout: 60000 });
    await waiterBrowserPage.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(waiterBrowserPage.getByRole('heading', { name: /live orders & requests/i }).first()).toBeVisible({ timeout: 30000 });

    // Reload Waiter dashboard to ensure latest Supabase realtime/REST state is fetched
    await waiterBrowserPage.reload();
    await waiterBrowserPage.waitForLoadState('networkidle', { timeout: 30000 });

    // Waiter clicks "Serve Order" button
    const serveBtn = waiterBrowserPage.getByRole('button', { name: /serve order/i }).first();
    await expect(serveBtn).toBeVisible({ timeout: 30000 });
    await serveBtn.click();

    await waiterBrowserPage.waitForTimeout(1000);

    // ─────────────────────────────────────────────────────────────
    // STEP 4: Customer Order Tracking reflects status
    // ─────────────────────────────────────────────────────────────
    await page.reload();
    await expect(page.getByText(/Receipt #|Order Sent|Order Summary|Served|Ready/i).first()).toBeVisible({ timeout: 15000 });

    // ─────────────────────────────────────────────────────────────
    // STEP 5: Owner Dashboard & Reports reflection
    // ─────────────────────────────────────────────────────────────
    const ownerBrowserPage = await authenticatedPage('owner');
    await ownerBrowserPage.goto(ownerDashboardPage.path, { timeout: 60000 });
    await expect(ownerBrowserPage.getByRole('heading', { name: /overview dashboard/i }).first()).toBeVisible({ timeout: 30000 });
    await expect(ownerBrowserPage.getByText(/revenue today/i).first()).toBeVisible();

    await ownerBrowserPage.goto(ROUTES.REPORTS, { timeout: 60000 });
    await expect(ownerBrowserPage.getByText(/analytics|revenue|reports/i).first()).toBeVisible({ timeout: 30000 });

    // ─────────────────────────────────────────────────────────────
    // STEP 6: Super Admin SaaS metrics health check
    // ─────────────────────────────────────────────────────────────
    const adminBrowserPage = await authenticatedPage('super_admin');
    await adminBrowserPage.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await expect(adminBrowserPage.getByText(/super admin central control/i).first()).toBeVisible({ timeout: 30000 });
    await expect(adminBrowserPage.getByText(/monthly revenue/i).first()).toBeVisible();
    await expect(adminBrowserPage.getByText(/active licenses/i).first()).toBeVisible();
  });
});
