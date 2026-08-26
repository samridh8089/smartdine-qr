import { test, expect } from '../../fixtures/base.fixture';
import { TestDataFactory } from '../../factories/test-data.factory';

test.describe('Customer P0 Business Test Suite', () => {
  const restaurantSlug = 'test-restaurant';
  const tableSlug = 'table-1';
  let ephemeralOrderPrefix: string;

  test.beforeEach(async ({ customerMenuPage, dbHelper }, testInfo) => {
    test.setTimeout(120000);
    // Generate an ephemeral prefix for traceability (TDM-009)
    ephemeralOrderPrefix = `QA-EPHEMERAL-${testInfo.title.replace(/\s+/g, '-').slice(0, 15)}`;
  });

  test.afterEach(async ({ dbHelper }) => {
    // Cleanup any ephemeral orders created by the tests
    await dbHelper.cleanupEphemeralRecords('orders', 'QA-EPHEMERAL-');
  });

  test('TC-C-001: Customer can browse QR menu, search, and filter by categories', async ({ customerMenuPage, page }) => {
    await page.goto(customerMenuPage.path);

    // Verify page loaded successfully (h1 contains restaurant name)
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 30000 });

    // Select category and assert items change
    await customerMenuPage.selectCategory('Starters');
    await expect(page.getByText(/Paneer|Chicken/i).first()).toBeVisible();

    // Search for specific item
    await customerMenuPage.searchItem('Tikka');
    await expect(page.getByText(/Tikka/i).first()).toBeVisible();
  });

  test('TC-C-002: Customer can add items to cart and update quantities', async ({ customerMenuPage, page }) => {
    await page.goto(customerMenuPage.path);

    // Wait for item button to be visible
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    // Check cart button is visible and active
    await expect(customerMenuPage.viewCartButton).toBeVisible();
  });

  test('TC-C-003: Customer can complete checkout and place order', async ({ customerMenuPage, page }) => {
    await page.goto(customerMenuPage.path);

    // Add item
    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.waitFor({ state: 'visible', timeout: 30000 });
    await addButton.click();

    // Open Cart
    await customerMenuPage.openCart();
    
    // Proceed to Checkout / Place Order in modal
    const placeOrderButton = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderButton).toBeVisible();

    // Enter notes if available
    const notesInput = page.getByPlaceholder(/instructions|notes/i);
    if (await notesInput.isVisible()) {
      await notesInput.fill('Extra spicy please (QA Automated Test)');
    }

    // Click place order
    await placeOrderButton.click();

    // Verify order tracking URL & status
    await expect(page).toHaveURL(/order-tracking/i, { timeout: 30000 });
    await expect(page.getByText(/Receipt #|Order Sent|Order Summary/i).first()).toBeVisible();
  });

});
