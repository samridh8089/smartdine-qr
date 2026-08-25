/**
 * SmartDine SaaS — Screenshot Helper
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix C (Visual Regression Testing)
 */

import { Page, expect } from '@playwright/test';
import { buildScreenshotName } from '../utils';

export class ScreenshotHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Captures a full page screenshot and asserts against baseline.
   */
  async comparePageSnapshot(
    testId: string,
    variant: string = 'default',
    maxDiffPixelRatio: number = 0.001 // 0.1% default
  ): Promise<void> {
    const viewport = this.page.viewportSize();
    const viewportStr = viewport ? `${viewport.width}x${viewport.height}` : 'default';
    const screenshotName = buildScreenshotName(testId, variant, viewportStr, 'chromium');

    await expect(this.page).toHaveScreenshot(screenshotName, {
      maxDiffPixelRatio,
      animations: 'disabled',
    });
  }

  /**
   * Masks dynamic elements (timestamps, counters) before taking a screenshot.
   */
  async captureWithMask(
    selectorsToMask: string[],
    screenshotPath: string
  ): Promise<Buffer> {
    const maskLocators = selectorsToMask.map((s) => this.page.locator(s));
    return await this.page.screenshot({
      path: screenshotPath,
      fullPage: true,
      mask: maskLocators,
    });
  }
}
