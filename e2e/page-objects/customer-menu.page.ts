/**
 * SmartDine SaaS — Customer Menu Page Object Skeleton
 * Phase 7A.2 — Infrastructure
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class CustomerMenuPage extends BasePage {
  readonly restaurantSlug: string;
  readonly tableSlug: string;

  // Selectors
  readonly searchInput: Locator;
  readonly categoryTabs: Locator;
  readonly viewCartButton: Locator;

  constructor(page: Page, restaurantSlug: string = 'test-restaurant', tableSlug: string = 'table-1') {
    super(page);
    this.restaurantSlug = restaurantSlug;
    this.tableSlug = tableSlug;

    this.searchInput = page.getByPlaceholder(/search/i);
    this.categoryTabs = page.getByRole('button');
    this.viewCartButton = page.getByRole('button', { name: /view cart|cart/i });
  }

  get path(): string {
    return ROUTES.ORDER(this.restaurantSlug, this.tableSlug);
  }

  // Methods
  async selectCategory(categoryName: string): Promise<void> {
    await this.page.getByRole('button', { name: new RegExp(`^${categoryName}$`, 'i') }).click();
  }

  async searchItem(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async addItemToCart(itemName: string): Promise<void> {
    const itemCard = this.page.locator('div').filter({ hasText: new RegExp(`^${itemName}$`, 'i') }).first().locator('..');
    const addButton = itemCard.getByRole('button', { name: /add|add to cart/i });
    await addButton.click();
  }

  async openCart(): Promise<void> {
    await this.viewCartButton.click();
    await this.page.waitForTimeout(500);
  }
}
