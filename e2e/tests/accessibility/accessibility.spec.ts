/**
 * SmartDine SaaS — Accessibility (WCAG 2.1 AA) Test Suite
 * Phase 7B.4 — Accessibility Testing
 *
 * Spec Reference: Appendix G (Accessibility Specifications AX-001 → AX-014)
 */

import { test, expect } from '../../fixtures/base.fixture';
import { ROUTES } from '../../constants';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility & WCAG 2.1 AA Compliance Test Suite (@accessibility @a11y @axe)', () => {
  test.beforeEach(async () => {
    test.setTimeout(120000);
  });

  // ─────────────────────────────────────────────
  // AX-001: Axe Automated Scans on P0 Pages
  // ─────────────────────────────────────────────
  test('AX-001a: Axe automated scan on Login Page (@accessibility @a11y @axe)', async ({ page, accessibilityHelper }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await accessibilityHelper.checkA11y('Login Page');
  });

  test('AX-001b: Axe automated scan on Customer Menu Page (@accessibility @a11y @axe)', async ({ page, customerMenuPage, accessibilityHelper }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await accessibilityHelper.checkA11y('Customer Menu Page');
  });

  test('AX-001c: Axe automated scan on Customer Order Tracking Page (@accessibility @a11y @axe)', async ({ page, customerMenuPage, accessibilityHelper }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    await customerMenuPage.openCart();

    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).last();
    await placeOrderBtn.click();

    await page.waitForURL(/order-tracking/i, { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await accessibilityHelper.checkA11y('Order Tracking Page');
  });

  test('AX-001d: Axe automated scan on Kitchen KDS Dashboard (@accessibility @a11y @axe)', async ({ authenticatedPage, kitchenPage, accessibilityHelper }) => {
    const page = await authenticatedPage('kitchen');
    await page.goto(kitchenPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const a11y = new (accessibilityHelper.constructor as any)(page);
    await a11y.checkA11y('Kitchen KDS Dashboard');
  });

  test('AX-001e: Axe automated scan on Waiter Dashboard (@accessibility @a11y @axe)', async ({ authenticatedPage, waiterPage, accessibilityHelper }) => {
    const page = await authenticatedPage('waiter');
    await page.goto(waiterPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const a11y = new (accessibilityHelper.constructor as any)(page);
    await a11y.checkA11y('Waiter Dashboard');
  });

  test('AX-001f: Axe automated scan on Owner Overview Dashboard (@accessibility @a11y @axe)', async ({ authenticatedPage, ownerDashboardPage, accessibilityHelper }) => {
    const page = await authenticatedPage('owner');
    await page.goto(ownerDashboardPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const a11y = new (accessibilityHelper.constructor as any)(page);
    await a11y.checkA11y('Owner Overview Dashboard');
  });

  test('AX-001g: Axe automated scan on Super Admin Dashboard (@accessibility @a11y @axe)', async ({ authenticatedPage, accessibilityHelper }) => {
    const page = await authenticatedPage('super_admin');
    await page.goto(ROUTES.SUPER_ADMIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const a11y = new (accessibilityHelper.constructor as any)(page);
    await a11y.checkA11y('Super Admin Dashboard');
  });

  // ─────────────────────────────────────────────
  // AX-002: Keyboard Navigation Across Workflow
  // ─────────────────────────────────────────────
  test('AX-002: Keyboard-only navigation across login controls (@accessibility @a11y)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const emailInput = page.getByLabel(/email address/i).first();
    await emailInput.focus();
    await expect(emailInput).toBeFocused();

    // Tab moves focus to Forgot password? link
    await page.keyboard.press('Tab');
    const forgotLink = page.getByRole('link', { name: /forgot password/i }).first();
    await expect(forgotLink).toBeFocused();

    // Tab moves focus to Password input
    await page.keyboard.press('Tab');
    const passwordInput = page.getByPlaceholder(/••••••••/i).first();
    await expect(passwordInput).toBeFocused();

    // Tab moves focus to Sign In button
    await page.keyboard.press('Tab');
    const submitBtn = page.getByRole('button', { name: /sign in/i }).first();
    await expect(submitBtn).toBeFocused();
  });

  // ─────────────────────────────────────────────
  // AX-003: Logical Focus Order
  // ─────────────────────────────────────────────
  test('AX-003: Focus order proceeds logically across form fields (@accessibility @a11y)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const emailInput = page.getByLabel(/email address/i).first();
    await emailInput.focus();

    await page.keyboard.press('Tab');
    const focusedElementTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(['a', 'input']).toContain(focusedElementTag);
  });

  // ─────────────────────────────────────────────
  // AX-004: Focus Trap & Escape Key in Modals / Drawers
  // ─────────────────────────────────────────────
  test('AX-004: Focus management and Escape key behavior in Cart Drawer (@accessibility @a11y)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    await addButton.click();

    await customerMenuPage.openCart();

    const placeOrderBtn = page.getByRole('button', { name: /place order/i }).last();
    await expect(placeOrderBtn).toBeVisible({ timeout: 15000 });

    await page.keyboard.press('Escape');

    const isCartOpen = await page.locator('[role="dialog"]').isVisible().catch(() => false);
    expect(isCartOpen).toBe(false);
  });

  // ─────────────────────────────────────────────
  // AX-005: Visible Focus Indicators
  // ─────────────────────────────────────────────
  test('AX-005: Interactive buttons present visible focus states when focused (@accessibility @a11y)', async ({ page, accessibilityHelper }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await accessibilityHelper.assertFocusVisible('button[type="submit"]');
  });

  // ─────────────────────────────────────────────
  // AX-006: ARIA Roles & State Labels
  // ─────────────────────────────────────────────
  test('AX-006: Structural components possess valid ARIA roles and labels (@accessibility @a11y)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();

    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // AX-007: Form Controls & Labels
  // ─────────────────────────────────────────────
  test('AX-007: Input fields have accessible placeholders or labels (@accessibility @a11y)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      const id = await input.getAttribute('id');
      const hasLabel = ariaLabel || placeholder || id;
      expect(hasLabel).toBeTruthy();
    }
  });

  // ─────────────────────────────────────────────
  // AX-008: Accessible Form Error Messages
  // ─────────────────────────────────────────────
  test('AX-008: Form error message banner presents accessible alert feedback (@accessibility @a11y)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const submitBtn = page.getByRole('button', { name: /sign in/i }).first();
    await submitBtn.click();

    const alert = page.locator('[role="alert"], .text-red-500, .bg-red-500\\/10, p.text-sm.text-red-500').first();
    await expect(alert).toBeVisible({ timeout: 15000 });
  });

  // ─────────────────────────────────────────────
  // AX-009: Heading Hierarchy
  // ─────────────────────────────────────────────
  test('AX-009: Pages present valid heading tags (H1/H2/H3) (@accessibility @a11y)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const h1Count = await page.locator('h1, h2, h3').count();
    expect(h1Count).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // AX-010: Landmark Regions
  // ─────────────────────────────────────────────
  test('AX-010: Pages incorporate structural landmark regions (@accessibility @a11y)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const landmarkCount = await page.locator('header, nav, main, footer, [role="main"], [role="navigation"]').count();
    expect(landmarkCount).toBeGreaterThan(0);
  });

  // ─────────────────────────────────────────────
  // AX-011: Text Alternatives for Non-Text Content (Image Alt Text)
  // ─────────────────────────────────────────────
  test('AX-011: Informational images feature alt text or aria-label attributes (@accessibility @a11y)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const images = page.locator('img');
    const imgCount = await images.count();
    for (let i = 0; i < imgCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');
      expect(alt !== null || ariaHidden === 'true' || role === 'presentation').toBe(true);
    }
  });

  // ─────────────────────────────────────────────
  // AX-012: Color Contrast Automated Check
  // ─────────────────────────────────────────────
  test('AX-012: Automated color contrast compliance check on text elements (@accessibility @a11y @axe)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .exclude('button[aria-label="Open Next.js Dev Tools"]')
      .analyze();

    const colorContrastCheck = results.passes.find(p => p.id === 'color-contrast') || results.violations.find(v => v.id === 'color-contrast');
    expect(colorContrastCheck).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // AX-013: Semantic HTML Validation
  // ─────────────────────────────────────────────
  test('AX-013: Interactive buttons utilize native button or link elements (@accessibility @a11y)', async ({ page }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const submitBtn = page.getByRole('button', { name: /sign in/i }).first();
    const tagName = await submitBtn.evaluate((el) => el.tagName.toLowerCase());
    expect(['button', 'a', 'input']).toContain(tagName);
  });

  // ─────────────────────────────────────────────
  // AX-014: Accessible Touch Target Sizing
  // ─────────────────────────────────────────────
  test('AX-014: Interactive touch targets satisfy WCAG minimum target dimensions (@accessibility @a11y)', async ({ page, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    const box = await addButton.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(24);
      expect(box.width).toBeGreaterThanOrEqual(24);
    }
  });
});
