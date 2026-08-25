/**
 * SmartDine SaaS — Order Tracking Page Object Skeleton
 * Phase 7A.2 — Infrastructure
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class OrderTrackingPage extends BasePage {
  readonly orderId: string;

  // Selectors
  readonly statusBadge: Locator;
  readonly callWaiterButton: Locator;

  constructor(page: Page, orderId: string = 'test-order-id') {
    super(page);
    this.orderId = orderId;

    this.statusBadge = page.locator('div').filter({ hasText: /Status:/i }).locator('span').first();
    this.callWaiterButton = page.getByRole('button', { name: /call waiter|help/i });
  }

  get path(): string {
    return ROUTES.ORDER_TRACKING(this.orderId);
  }

  // Methods
  async waitForStatus(expectedStatus: string): Promise<void> {
    await this.page.waitForFunction(
      (status) => document.body.innerText.toLowerCase().includes(status.toLowerCase()),
      expectedStatus,
      { timeout: 15000 }
    );
  }

  async callWaiter(): Promise<void> {
    await this.callWaiterButton.click();
    // Wait for some visual confirmation
    await this.page.getByText(/waiter has been called|request sent/i).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
}
