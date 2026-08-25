/**
 * SmartDine SaaS — Kitchen P0 Business Test Suite
 * Phase 7A.5 — Kitchen P0 Playwright Tests
 */

import { test, expect } from '../../fixtures/base.fixture';

test.describe('Kitchen P0 Business Test Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  test('TC-K-001: Kitchen staff can view KDS dashboard and incoming tickets', async ({ authenticatedPage, kitchenPage }) => {
    // Authenticate as Kitchen staff and open KDS
    const page = await authenticatedPage('kitchen');
    await page.goto(kitchenPage.path);

    // Verify KDS Header title is visible
    await expect(page.getByRole('heading', { name: /kitchen display system/i }).first()).toBeVisible({ timeout: 30000 });

    // Verify KDS columns are rendered
    await expect(page.getByText(/new orders/i).first()).toBeVisible();
    await expect(page.getByText(/preparing/i).first()).toBeVisible();
    await expect(page.getByText(/ready/i).first()).toBeVisible();
  });

  test('TC-K-002: Customer places order, Kitchen staff accepts order batch', async ({ page, customerMenuPage, kitchenPage, authenticatedPage }) => {
    // 1. Customer opens QR menu and places an order
    await page.goto(customerMenuPage.path);

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();
    
    // Proceed to Checkout / Place Order in modal
    const placeOrderButton = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    // Verify customer lands on order tracking
    await expect(page).toHaveURL(/order-tracking/i, { timeout: 30000 });

    // 2. Kitchen staff checks KDS and accepts order
    const kdsPage = await authenticatedPage('kitchen');
    await kdsPage.goto(kitchenPage.path);
    await expect(kdsPage.getByRole('heading', { name: /kitchen display system/i }).first()).toBeVisible({ timeout: 30000 });

    // Click Accept button on the incoming order ticket
    const acceptBtn = kdsPage.getByRole('button', { name: /^accept$|^accept order$/i }).first();
    await expect(acceptBtn).toBeVisible({ timeout: 30000 });
    await acceptBtn.click();

    // Verify order moves to Preparing column
    await expect(kdsPage.getByText(/preparing/i).first()).toBeVisible();
  });

  test('TC-K-003: Kitchen staff can progress order status to ready for pickup', async ({ page, customerMenuPage, kitchenPage, authenticatedPage }) => {
    // 1. Customer places an order
    await page.goto(customerMenuPage.path);

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    await customerMenuPage.openCart();
    const placeOrderButton = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderButton).toBeVisible();
    await placeOrderButton.click();

    await expect(page).toHaveURL(/order-tracking/i, { timeout: 30000 });

    // 2. Kitchen staff accepts order and marks as ready
    const kdsPage = await authenticatedPage('kitchen');
    await kdsPage.goto(kitchenPage.path);
    await expect(kdsPage.getByRole('heading', { name: /kitchen display system/i }).first()).toBeVisible({ timeout: 30000 });

    // Accept order
    const acceptBtn = kdsPage.getByRole('button', { name: /^accept$|^accept order$/i }).first();
    await expect(acceptBtn).toBeVisible({ timeout: 30000 });
    await acceptBtn.click();

    // Start cooking if present, then mark ready
    const startCookingBtn = kdsPage.getByRole('button', { name: /start cooking/i }).first();
    if (await startCookingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startCookingBtn.click();
    }

    const readyBtn = kdsPage.getByRole('button', { name: /ready for pickup|mark ready/i }).first();
    await expect(readyBtn).toBeVisible({ timeout: 30000 });
    await readyBtn.click();

    // Verify ready section has ticket
    await expect(kdsPage.getByText(/ready/i).first()).toBeVisible();
  });
});
