/**
 * SmartDine SaaS — Kitchen Page Object
 * Phase 7A.5 — Kitchen P0 Implementation
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class KitchenPage extends BasePage {
  readonly pageTitle: Locator;
  readonly orderCards: Locator;
  readonly acceptButton: Locator;
  readonly startCookingButton: Locator;
  readonly readyButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page.getByRole('heading', { name: /kitchen display system/i });
    this.orderCards = page.locator('.shadow-md');
    this.acceptButton = page.getByRole('button', { name: /^accept$|^accept order$/i });
    this.startCookingButton = page.getByRole('button', { name: /start cooking/i });
    this.readyButton = page.getByRole('button', { name: /ready for pickup|mark ready/i });
    this.cancelButton = page.getByRole('button', { name: /decline|cancel/i });
  }

  get path(): string {
    return ROUTES.KDS;
  }

  async acceptOrderBatch(orderId?: string): Promise<void> {
    if (orderId) {
      const card = this.page.locator(`.shadow-md:has-text("${orderId}")`);
      await card.getByRole('button', { name: /^accept$|^accept order$/i }).first().click();
    } else {
      await this.acceptButton.first().click();
    }
  }

  async markBatchReady(orderId?: string): Promise<void> {
    if (orderId) {
      const card = this.page.locator(`.shadow-md:has-text("${orderId}")`);
      await card.getByRole('button', { name: /ready for pickup|mark ready/i }).first().click();
    } else {
      await this.readyButton.first().click();
    }
  }

  async cancelBatch(orderId?: string): Promise<void> {
    if (orderId) {
      const card = this.page.locator(`.shadow-md:has-text("${orderId}")`);
      await card.getByRole('button', { name: /decline|cancel/i }).first().click();
    } else {
      await this.cancelButton.first().click();
    }
  }
}
