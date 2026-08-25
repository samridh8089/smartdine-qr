/**
 * SmartDine SaaS — Super Admin Page Object Skeleton
 * Phase 7A.2 — Infrastructure
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class SuperAdminPage extends BasePage {
  // Selectors
  readonly tenantRows: Locator;
  readonly mrrCard: Locator;
  readonly arrCard: Locator;
  readonly starterPlanInput: Locator;
  readonly proPlanInput: Locator;
  readonly deleteTenantButton: Locator;

  constructor(page: Page) {
    super(page);

    this.tenantRows = page.locator('[data-testid="tenant-row"]');
    this.mrrCard = page.locator('[data-testid="metric-mrr"]');
    this.arrCard = page.locator('[data-testid="metric-arr"]');
    this.starterPlanInput = page.locator('[data-testid="plan-starter-price"]');
    this.proPlanInput = page.locator('[data-testid="plan-pro-price"]');
    this.deleteTenantButton = page.locator('[data-testid="delete-tenant-button"]');
  }

  get path(): string {
    return ROUTES.SUPER_ADMIN;
  }

  // Method Skeletons
  async updatePlanPrice(_planId: string, _price: number): Promise<void> {}
  async deleteTenant(_tenantSlug: string): Promise<void> {}
  async purgeExpiredTenants(): Promise<void> {}
}
