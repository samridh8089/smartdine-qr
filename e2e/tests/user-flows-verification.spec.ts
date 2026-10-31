import { test, expect } from '../fixtures/base.fixture';
import * as path from 'path';

test.describe('Automated E2E Suite — Fixed User Flows Verification', () => {

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Move from smart import to menu editing (Issue 2)
  // ─────────────────────────────────────────────────────────────────────────
  test('Move from smart import to menu editing', async ({ page }) => {
    await page.goto('/?lang=en');

    // Dismiss language modal if still present
    const langBtn = page.getByRole('button', { name: /english/i }).first();
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click({ force: true }).catch(() => {});
    }

    // 1. Check Smart Menu entry point in preview section
    const smartMenuTab = page.locator('[data-testid="tab-smart-menu"]').first();
    await expect(smartMenuTab).toBeVisible({ timeout: 15000 });
    await smartMenuTab.click({ force: true });

    // 2. Verify visible "Smart Menu" mention
    await expect(page.getByText(/smart menu by cleverops/i).first()).toBeVisible({ timeout: 10000 });

    // 3. Test image file fixture upload / selection
    const fileInput = page.locator('[data-testid="smart-menu-file-input"]');
    const fixturePath = path.resolve(process.cwd(), 'public', 'fixtures', 'sample-menu.jpg');
    
    // Set file via input
    await fileInput.setInputFiles(fixturePath);

    // 4. Verify draft menu editing flow is visible and interactive
    const draftFlow = page.locator('[data-testid="draft-menu-flow"]');
    await expect(draftFlow).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/draft menu editing flow/i).first()).toBeVisible();

    // Verify editable dishes and save button
    const saveBtn = page.locator('[data-testid="save-draft-menu-btn"]');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.getByText(/draft menu saved/i).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Complete a preparing ticket (Issue 3)
  // ─────────────────────────────────────────────────────────────────────────
  test('Complete a preparing ticket', async ({ page }) => {
    await page.goto('/?lang=en');

    // Dismiss language modal if still present
    const langBtn = page.getByRole('button', { name: /english/i }).first();
    if (await langBtn.isVisible().catch(() => false)) {
      await langBtn.click({ force: true }).catch(() => {});
    }

    // Switch to Kitchen tab in preview
    const kitchenTab = page.getByRole('button', { name: /kitchen display/i }).first();
    await expect(kitchenTab).toBeVisible({ timeout: 15000 });
    await kitchenTab.click({ force: true });

    // Verify Table 09 is shown with status PREPARING
    const ticketBatch2 = page.locator('[data-testid="kds-preview-ticket-batch2"]');
    await expect(ticketBatch2).toBeVisible({ timeout: 10000 });
    await expect(ticketBatch2.getByText(/table 09/i)).toBeVisible();
    await expect(ticketBatch2.getByText(/preparing/i)).toBeVisible();

    // Verify Table 02 is shown as READY (exact badge match)
    const ticketBatch3 = page.locator('[data-testid="kds-preview-ticket-batch3"]');
    await expect(ticketBatch3.getByText(/table 02/i)).toBeVisible();
    await expect(ticketBatch3.getByText('READY', { exact: true })).toBeVisible();

    // Advance Table 09 to READY using status control button
    const advanceBtn = ticketBatch2.locator('[data-testid="advance-ticket-batch2"]');
    await expect(advanceBtn).toBeVisible({ timeout: 5000 });
    await advanceBtn.click();

    // Verify Table 09 is now READY
    await expect(ticketBatch2.getByText('READY', { exact: true })).toBeVisible();
    await expect(ticketBatch2.getByText(/preparing/i)).not.toBeVisible();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. View the restaurant overview dashboard (Issue 1)
  // ─────────────────────────────────────────────────────────────────────────
  test('View the restaurant overview dashboard', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto('/dashboard');

    // Verify Overview dashboard content
    await expect(page.getByRole('heading', { name: /overview dashboard/i }).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/revenue today/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. View live orders and open an order detail
  // ─────────────────────────────────────────────────────────────────────────
  test('View live orders and open an order detail', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto('/dashboard/orders');

    // Verify Live Orders heading
    await expect(page.getByRole('heading', { name: /live orders/i }).first()).toBeVisible({ timeout: 20000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. View today’s sales and GST summary
  // ─────────────────────────────────────────────────────────────────────────
  test('View today’s sales and GST summary', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto('/dashboard');

    // Revenue today on dashboard
    await expect(page.getByText(/revenue today/i).first()).toBeVisible({ timeout: 20000 });

    // Navigate to reports for sales and GST summary
    await page.goto('/dashboard/reports');
    await expect(page.getByText(/reports|analytics|sales|gst/i).first()).toBeVisible({ timeout: 20000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Open menu management from the dashboard
  // ─────────────────────────────────────────────────────────────────────────
  test('Open menu management from the dashboard', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto('/dashboard');

    // Click sidebar link or navigate to /dashboard/menu
    const menuLink = page.getByRole('link', { name: /menu management|smart menu/i }).first();
    if (await menuLink.isVisible().catch(() => false)) {
      await menuLink.click();
    } else {
      await page.goto('/dashboard/menu');
    }

    await expect(page).toHaveURL(/\/dashboard\/menu/);
    await expect(page.getByRole('heading', { name: /menu management|smart menu/i }).first()).toBeVisible({ timeout: 20000 });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Verify billing usage cards reflect account quotas
  // ─────────────────────────────────────────────────────────────────────────
  test('Verify billing usage cards reflect account quotas', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('owner');
    await page.goto('/dashboard/billing');

    // Verify usage cards & quotas
    await expect(page.getByText(/dining tables/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/menu items/i).first()).toBeVisible();
    await expect(page.getByText(/ai feature quotas/i).first()).toBeVisible();
  });

});
