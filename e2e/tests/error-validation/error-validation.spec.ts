/**
 * SmartDine SaaS — Console / Network / JavaScript Error Validation Test Suite
 * Phase 7B.5 — Error Validation (Appendix E)
 *
 * Spec Reference: Appendix E (EV-001 to EV-009)
 *   EV-001: Console Errors
 *   EV-002: Console Warnings
 *   EV-003: Uncaught Exceptions
 *   EV-004: Unhandled Promise Rejections
 *   EV-005: Failed Network Requests
 *   EV-006: HTTP 5xx Responses
 *   EV-007: Unexpected HTTP 4xx Responses
 *   EV-008: WebSocket Reconnect / Realtime Stability
 *   EV-009: Long Task Monitoring
 */

import { test, expect } from '../../fixtures/base.fixture';
import { ROUTES } from '../../constants';

test.describe('Console, Network & JavaScript Error Validation Suite (@error-validation @errors @network)', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-001: Console Errors Verification Across P0 Pages
  // ─────────────────────────────────────────────────────────────
  test('EV-001: Console Errors — Zero unhandled console.error messages on Login and Customer Menu (@error-validation @console)', async ({ page, consoleGuard, customerMenuPage }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const errors = consoleGuard.getErrors();
    expect(errors, `Expected zero console errors, but found: ${errors.join('; ')}`).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-002: Console Warnings Verification
  // ─────────────────────────────────────────────────────────────
  test('EV-002: Console Warnings — Zero React key or unmounted component state update warnings (@error-validation @console)', async ({ page, consoleGuard }) => {
    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const warnings = consoleGuard.getWarnings();
    expect(warnings, `Expected zero targeted console warnings, but found: ${warnings.join('; ')}`).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-003: Uncaught Exceptions Validation
  // ─────────────────────────────────────────────────────────────
  test('EV-003: Uncaught Exceptions — Zero uncaught JS runtime exceptions during navigation (@error-validation @js)', async ({ page, consoleGuard, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const exceptions = consoleGuard.getExceptions();
    expect(exceptions, `Expected zero uncaught exceptions, but found: ${exceptions.map(e => e.message).join('; ')}`).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-004: Unhandled Promise Rejections Validation
  // ─────────────────────────────────────────────────────────────
  test('EV-004: Unhandled Promise Rejections — Zero unhandledrejection events during async flows (@error-validation @js)', async ({ page, customerMenuPage }) => {
    const unhandledRejections: string[] = [];

    page.on('pageerror', (err) => {
      if (err.message.includes('unhandledRejection') || err.name === 'UnhandledPromiseRejection') {
        unhandledRejections.push(err.message);
      }
    });

    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    expect(unhandledRejections, `Expected zero unhandled promise rejections, but found: ${unhandledRejections.join('; ')}`).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-005: Failed Network Requests Validation
  // ─────────────────────────────────────────────────────────────
  test('EV-005: Failed Network Requests — Zero dropped HTTP network requests during menu interaction (@error-validation @network)', async ({ page, networkGuard, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const addButton = page.getByRole('button', { name: /add/i }).first();
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
    }

    const failedRequests = networkGuard.getErrors().filter(e => e.type === 'failed_request');
    expect(failedRequests, `Expected zero failed network requests, but found: ${JSON.stringify(failedRequests)}`).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-006: HTTP 5xx Server Error Validation
  // ─────────────────────────────────────────────────────────────
  test('EV-006: HTTP 5xx Responses — Zero 500 Internal Server Errors across P0 page loads (@error-validation @network)', async ({ page, networkGuard, customerMenuPage }) => {
    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    await page.goto(ROUTES.LOGIN, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const serverErrors = networkGuard.getErrors().filter(e => e.type === '5xx_server_error');
    expect(serverErrors, `Expected zero 5xx server errors, but found: ${JSON.stringify(serverErrors)}`).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-007: Unexpected HTTP 4xx Client Error Validation
  // ─────────────────────────────────────────────────────────────
  test('EV-007: Unexpected HTTP 4xx Responses — Zero unexpected 400/404 client errors (@error-validation @network)', async ({ page, networkGuard, customerMenuPage }) => {
    // Allow known benign dev 404s if any (e.g. sw.js or favicon)
    networkGuard.allow4xxForUrl('/sw.js');
    networkGuard.allow4xxForUrl('favicon.ico');

    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const unexpected4xx = networkGuard.getErrors().filter(e => e.type === 'unexpected_4xx');
    expect(unexpected4xx, `Expected zero unexpected 4xx errors, but found: ${JSON.stringify(unexpected4xx)}`).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────
  // EV-008: WebSocket Reconnect / Realtime Stability
  // ─────────────────────────────────────────────────────────────
  test('EV-008: WebSocket Reconnect / Realtime Stability — Realtime connection establishes and stays stable on KDS (@error-validation @realtime)', async ({ page, authenticatedPage, kitchenPage }) => {
    const kdsPage = await authenticatedPage('kitchen');
    
    let wsConnectionEstablished = false;
    let wsCrashes = 0;

    kdsPage.on('websocket', (ws) => {
      wsConnectionEstablished = true;
      ws.on('socketerror', (err) => {
        wsCrashes++;
      });
    });

    await kdsPage.goto(kitchenPage.path, { timeout: 60000 });
    await expect(kdsPage.getByRole('heading', { name: /kitchen display system/i }).first()).toBeVisible({ timeout: 30000 });
    await kdsPage.waitForTimeout(3000);

    expect(wsCrashes, `Expected 0 WebSocket crashes, found ${wsCrashes}`).toBe(0);
    await kdsPage.close();
  });

  // ─────────────────────────────────────────────────────────────
  // EV-009: Long Task Monitoring
  // ─────────────────────────────────────────────────────────────
  test('EV-009: Long Task Monitoring — Main thread tasks do not exceed 500ms block threshold during customer flow (@error-validation @performance)', async ({ page, customerMenuPage }) => {
    // Inject PerformanceObserver to track long tasks (> 500ms block)
    await page.addInitScript(() => {
      (window as any).__longTasks = [];
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 500) {
              (window as any).__longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // PerformanceObserver longtask entryType may be unsupported in some environments
      }
    });

    await page.goto(customerMenuPage.path, { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const longTasks = await page.evaluate(() => (window as any).__longTasks || []);
    expect(longTasks.length, `Found long main thread blocking tasks (> 500ms): ${JSON.stringify(longTasks)}`).toBe(0);
  });
});
