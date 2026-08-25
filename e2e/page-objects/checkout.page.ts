/**
 * SmartDine SaaS — Checkout Page Object Skeleton
 * Phase 7A.2 — Infrastructure
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CheckoutPage extends BasePage {
  // Selectors
  readonly promoInput: Locator;
  readonly applyPromoButton: Locator;
  readonly notesInput: Locator;
  readonly placeOrderButton: Locator;
  readonly billingBreakdownContainer: Locator;

  constructor(page: Page) {
    super(page);

    this.promoInput = page.getByPlaceholder(/promo|coupon/i);
    this.applyPromoButton = page.getByRole('button', { name: /apply/i });
    this.notesInput = page.getByPlaceholder(/notes|instructions/i);
    this.placeOrderButton = page.getByRole('button', { name: /place order|confirm/i });
    this.billingBreakdownContainer = page.locator('div').filter({ hasText: /(?:subtotal|total|gst)/i }).first();
  }

  get path(): string {
    return '';
  }

  // Methods
  async applyPromoCode(code: string): Promise<void> {
    await this.promoInput.fill(code);
    await this.applyPromoButton.click();
  }

  async enterNotes(notes: string): Promise<void> {
    await this.notesInput.fill(notes);
  }

  async placeOrder(): Promise<string> {
    await this.placeOrderButton.click();
    await this.page.waitForURL(/order-tracking/i);
    // Parse order ID from URL if available, else just return a generic success
    const url = new URL(this.page.url());
    const match = url.pathname.match(/order-tracking\/([^/]+)/);
    return match ? match[1] : 'order-id-placeholder';
  }
}
