/**
 * SmartDine SaaS — Wait Helper
 * Phase 7A.2 — Infrastructure
 *
 * Enforces rule: Never use arbitrary waits (e.g. page.waitForTimeout).
 * Always wait for locators, network events, or explicit conditions.
 */

import { Page, Locator } from '@playwright/test';
import { TIMEOUTS } from '../constants';

export class WaitHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits for a locator to be visible and stable.
   */
  async waitForVisible(locator: Locator, timeoutMs: number = TIMEOUTS.MEDIUM): Promise<void> {
    await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  }

  /**
   * Waits for loading spinners to disappear.
   */
  async waitForSpinnerToDisappear(
    spinnerSelector: string = '[data-testid="loading-spinner"]',
    timeoutMs: number = TIMEOUTS.LONG
  ): Promise<void> {
    const spinner = this.page.locator(spinnerSelector);
    if (await spinner.isVisible().catch(() => false)) {
      await spinner.waitFor({ state: 'detached', timeout: timeoutMs }).catch(() => {});
    }
  }

  /**
   * Waits for network requests to complete (network idle state).
   */
  async waitForNetworkIdle(timeoutMs: number = TIMEOUTS.NAVIGATION): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: timeoutMs });
  }

  /**
   * Waits for a specific API response URL.
   */
  async waitForApiResponse(
    urlSubstr: string,
    expectedStatus: number = 200,
    timeoutMs: number = TIMEOUTS.API
  ): Promise<void> {
    await this.page.waitForResponse(
      (res) => res.url().includes(urlSubstr) && res.status() === expectedStatus,
      { timeout: timeoutMs }
    );
  }
}
