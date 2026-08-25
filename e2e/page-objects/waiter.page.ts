/**
 * SmartDine SaaS — Waiter Page Object
 * Phase 7A.6 — Waiter P0 Implementation
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class WaiterPage extends BasePage {
  readonly pageTitle: Locator;
  readonly customerCallsBanner: Locator;
  readonly readyOrdersBanner: Locator;
  readonly acceptRequestButton: Locator;
  readonly completeRequestButton: Locator;
  readonly serveOrderButton: Locator;

  constructor(page: Page) {
    super(page);

    this.pageTitle = page.getByRole('heading', { name: /live orders & requests/i });
    this.customerCallsBanner = page.getByText(/customer calling waiter/i);
    this.readyOrdersBanner = page.getByText(/order ready for pickup/i);
    this.acceptRequestButton = page.getByRole('button', { name: /^accept$/i });
    this.completeRequestButton = page.getByRole('button', { name: /resolve|complete/i });
    this.serveOrderButton = page.getByRole('button', { name: /serve order/i });
  }

  get path(): string {
    return ROUTES.ORDERS;
  }

  async acceptRequest(): Promise<void> {
    await this.acceptRequestButton.first().click();
  }

  async completeRequest(): Promise<void> {
    await this.completeRequestButton.first().click();
  }

  async serveOrder(): Promise<void> {
    await this.serveOrderButton.first().click();
  }
}
