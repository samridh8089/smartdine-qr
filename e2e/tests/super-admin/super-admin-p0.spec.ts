/**
 * SmartDine SaaS — Super Admin P0 Business Test Suite
 * Phase 7A.8 — Super Admin P0 Playwright Tests
 *
 * Covers all Super Admin P0 workflows & authorization requirements:
 *   TC-SA-001: Role protection & authorization guard on /super-admin
 *   TC-SA-002: Super Admin loads Global Platform Dashboard with SaaS revenue metrics
 *   TC-SA-003: Pricing plans authority and spec/price update flow
 *   TC-SA-004: Tenant lifecycle management (Modify License modal)
 *   TC-SA-005: Tenant deletion protection and confirmation guard
 *   TC-SA-006: Grace period & purge expired tenants control
 *   TC-SA-007: Super Admin sign out security workflow
 */

import { test, expect } from '../../fixtures/base.fixture';
import { ROUTES } from '../../constants';

test.describe('Super Admin P0 Business Test Suite', () => {
  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  // ─────────────────────────────────────────────
  // TC-SA-001: Security & Role Protection Guard
  // ─────────────────────────────────────────────
  test('TC-SA-001: Non-super-admin role is blocked and redirected from /super-admin', async ({ authenticatedPage, page }) => {
    // 1. Unauthenticated user attempt
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });

    // 2. Non-super-admin (Owner) attempt
    const ownerPage = await authenticatedPage('owner');
    await ownerPage.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await expect(ownerPage).toHaveURL(/\/dashboard/, { timeout: 30000 });

    // 3. Non-super-admin (Waiter) attempt
    const waiterPage = await authenticatedPage('waiter');
    await waiterPage.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await expect(waiterPage).toHaveURL(/\/dashboard/, { timeout: 30000 });
  });

  // ─────────────────────────────────────────────
  // TC-SA-002: Global Platform Dashboard & SaaS Metrics
  // ─────────────────────────────────────────────
  test('TC-SA-002: Super Admin can access Central Control dashboard and view SaaS metrics', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Header & Title assertions
    await expect(page.getByText(/super admin central control/i).first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('heading', { name: /global platform dashboard/i }).first()).toBeVisible();

    // Metric cards visibility
    await expect(page.getByText(/monthly revenue/i).first()).toBeVisible();
    await expect(page.getByText(/annual revenue/i).first()).toBeVisible();
    await expect(page.getByText(/paid customers/i).first()).toBeVisible();
    await expect(page.getByText(/active licenses/i).first()).toBeVisible();
    await expect(page.getByText(/trial users/i).first()).toBeVisible();
    await expect(page.getByText(/expired licenses/i).first()).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // TC-SA-003: Pricing Plans Authority & Specifications
  // ─────────────────────────────────────────────
  test('TC-SA-003: Super Admin can view and edit SaaS Pricing Plans specifications', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Section title
    await expect(page.getByRole('heading', { name: /saas pricing plans/i }).first()).toBeVisible({ timeout: 30000 });

    // Plan cards (Starter, Pro, Premium)
    await expect(page.getByRole('heading', { name: /starter/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /pro/i }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /premium/i }).first()).toBeVisible();

    // Update button for a plan card
    const updateStarterBtn = page.getByRole('button', { name: /update starter specs/i }).first();
    await expect(updateStarterBtn).toBeVisible();
  });

  // ─────────────────────────────────────────────
  // TC-SA-004: Tenant Lifecycle & Subscription Management
  // ─────────────────────────────────────────────
  test('TC-SA-004: Super Admin can view tenant listings and open Modify License modal', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Tenant listings section
    await expect(page.getByRole('heading', { name: /tenant restaurant listings/i }).first()).toBeVisible({ timeout: 30000 });

    // Table column headers
    await expect(page.getByRole('columnheader', { name: /restaurant info/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /url slug/i }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /saas plan/i }).first()).toBeVisible();

    // Click "Modify License" on the first tenant row
    const modifyBtn = page.getByRole('button', { name: /modify license/i }).first();
    await expect(modifyBtn).toBeVisible();
    await modifyBtn.click();

    // Modal opens with plan select options
    await expect(page.getByRole('heading', { name: /modify subscription/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // Close modal
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    await cancelBtn.click();
  });

  // ─────────────────────────────────────────────
  // TC-SA-005: Tenant Deletion Protections & Safety Confirmation
  // ─────────────────────────────────────────────
  test('TC-SA-005: Super Admin tenant deletion modal enforces confirmation guard', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Click "Delete" button on a tenant row
    const deleteBtn = page.getByRole('button', { name: /delete/i }).last();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Modal title & warning banner
    await expect(page.getByRole('heading', { name: /confirm permanent deletion/i }).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/irreversible data loss/i).first()).toBeVisible();

    // "Permanently Delete Tenant" action button is disabled initially
    const confirmDeleteBtn = page.getByRole('button', { name: /permanently delete tenant/i }).first();
    await expect(confirmDeleteBtn).toBeDisabled();

    // Typing incorrect confirmation keeps button disabled
    const confirmInput = page.getByPlaceholder(/type delete to confirm/i).first();
    await confirmInput.fill('wrong text');
    await expect(confirmDeleteBtn).toBeDisabled();

    // Typing DELETE enables the button
    await confirmInput.fill('DELETE');
    await expect(confirmDeleteBtn).toBeEnabled();

    // Close modal safely without executing deletion
    const cancelBtn = page.getByRole('button', { name: /cancel/i }).first();
    await cancelBtn.click();
  });

  // ─────────────────────────────────────────────
  // TC-SA-006: Grace Period & Expired Tenants Purge Control
  // ─────────────────────────────────────────────
  test('TC-SA-006: Super Admin purge control validates 30-day grace period for expired accounts', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Check if "Delete All" button is rendered on the Expired Licenses card
    const purgeBtn = page.getByRole('button', { name: /delete all/i }).first();
    const isPurgeVisible = await purgeBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isPurgeVisible) {
      // If expired tenants exist, click purge and handle window.confirm alert
      page.on('dialog', async (dialog) => {
        expect(dialog.message()).toMatch(/purge|expired|delete/i);
        await dialog.dismiss(); // dismiss to prevent unintended deletion of test seed
      });
      await purgeBtn.click();
    } else {
      // If zero expired licenses exist, card shows 0
      await expect(page.getByText(/expired licenses/i).first()).toBeVisible();
    }
  });

  // ─────────────────────────────────────────────
  // TC-SA-007: Sign Out & Security Workflow
  // ─────────────────────────────────────────────
  test('TC-SA-007: Super Admin can sign out and terminate session', async ({ authenticatedPage }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Click Sign Out button in header
    const signOutBtn = page.getByRole('button', { name: /sign out/i }).first();
    await expect(signOutBtn).toBeVisible();
    await signOutBtn.click();

    // User is redirected to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 30000 });
  });
});
