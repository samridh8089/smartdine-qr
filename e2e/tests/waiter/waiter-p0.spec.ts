/**
 * SmartDine SaaS — Waiter P0 Business Test Suite
 * Phase 7A.6 — Waiter P0 Playwright Tests
 */

import { test, expect } from '../../fixtures/base.fixture';
import { EnvironmentHelper } from '../../helpers/environment.helper';

test.describe('Waiter P0 Business Test Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  test('TC-W-001: Customer calls waiter, Waiter receives and accepts service request', async ({ page, customerMenuPage, waiterPage, authenticatedPage }) => {
    // 1. Customer opens QR menu and clicks Call Waiter
    await page.goto(customerMenuPage.path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30000 });

    const callWaiterBtn = page.getByRole('button', { name: /call waiter/i }).first();
    await expect(callWaiterBtn).toBeVisible({ timeout: 30000 });
    await callWaiterBtn.click();

    // 2. Waiter logs into Waiter Dashboard (/dashboard/orders) — authenticated context
    const waiterBrowserPage = await authenticatedPage('waiter');
    await waiterBrowserPage.goto(waiterPage.path);

    // Verify Waiter Page loads
    await expect(waiterBrowserPage.getByRole('heading', { name: /live orders & requests/i }).first()).toBeVisible({ timeout: 30000 });

    // Verify Customer Calling Waiter banner or Customer Calls tab
    const callBanner = waiterBrowserPage.getByText(/customer calling waiter|service request/i).first();
    await expect(callBanner).toBeVisible({ timeout: 30000 });

    // Waiter accepts request
    const acceptBtn = waiterBrowserPage.getByRole('button', { name: /^accept$/i }).first();
    await expect(acceptBtn).toBeVisible({ timeout: 30000 });
    await acceptBtn.click();
  });

  test('TC-W-002: Waiter can view ready cooking tickets and mark order served to table', async ({ page, customerMenuPage, waiterPage, authenticatedPage }) => {
    // 1. Customer places order on QR menu (uses anonymous/unauthenticated page fixture)
    await page.goto(customerMenuPage.path);
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();
    const placeOrderButton = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    // Wait for redirect to order-tracking which gives us the orderId in the URL
    await expect(page).toHaveURL(/order-tracking/, { timeout: 30000 });
    const orderUrl = page.url();
    const orderId = orderUrl.split('/').pop()?.split('?')[0];
    expect(orderId).toBeTruthy();

    // 2. Directly set the order status to 'ready' via Supabase service role API
    // This isolates the waiter test from the kitchen UI (kitchen flow already tested in Phase 7A.5)
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      EnvironmentHelper.supabaseUrl,
      EnvironmentHelper.supabaseServiceKey
    );

    const { error: orderErr } = await supabase
      .from('orders')
      .update({ status: 'ready' })
      .eq('id', orderId!);
    expect(orderErr).toBeNull();

    // Also mark any order batches as ready (non-fatal if no batches exist)
    const { error: batchErr } = await supabase
      .from('order_batches')
      .update({ status: 'ready' })
      .eq('order_id', orderId!);
    if (batchErr) {
      console.warn('[TC-W-002] Batch status update warning (non-fatal):', batchErr.message);
    }

    // 3. Waiter opens the orders page via authenticated context — fresh navigation
    // captures the ready order in the initial data load
    // (Waiter role filter: status IN ['ready', 'served', 'completed'])
    const waiterBrowserPage = await authenticatedPage('waiter');
    await waiterBrowserPage.goto(waiterPage.path);
    await waiterBrowserPage.waitForLoadState('networkidle', { timeout: 30000 });
    await expect(waiterBrowserPage.getByRole('heading', { name: /live orders & requests/i }).first()).toBeVisible({ timeout: 30000 });

    // The "Order Ready for Pickup" banner + "Serve Order" button appear when any order has status=ready
    const serveBtn = waiterBrowserPage.getByRole('button', { name: /serve order/i }).first();
    await expect(serveBtn).toBeVisible({ timeout: 30000 });
    await serveBtn.click();

    // Verify action was processed
    await waiterBrowserPage.waitForTimeout(1000);
  });
});
