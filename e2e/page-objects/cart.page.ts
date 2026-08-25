/**
 * SmartDine SaaS — Cart Page Object Skeleton
 * Phase 7A.2 — Infrastructure
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CartPage extends BasePage {
  // Selectors
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.checkoutButton = page.getByRole('button', { name: /checkout|place order/i });
  }

  get path(): string {
    return '';
  }

  // Methods
  async increaseQuantity(itemName: string): Promise<void> {
    const itemCard = this.page.locator('div').filter({ hasText: new RegExp(`^${itemName}$`, 'i') }).first().locator('..');
    const plusButton = itemCard.getByRole('button', { name: /\+/i });
    await plusButton.click();
  }

  async decreaseQuantity(itemName: string): Promise<void> {
    const itemCard = this.page.locator('div').filter({ hasText: new RegExp(`^${itemName}$`, 'i') }).first().locator('..');
    const minusButton = itemCard.getByRole('button', { name: /-/i });
    await minusButton.click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await this.page.waitForURL(/checkout|order-tracking/i);
  }

  async closeCart(): Promise<void> {
    const closeButton = this.page.getByRole('button', { name: /close|x/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}
