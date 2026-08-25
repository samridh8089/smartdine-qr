/**
 * SmartDine SaaS — Owner Dashboard Page Object Skeleton
 * Phase 7A.2 — Infrastructure
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class OwnerDashboardPage extends BasePage {
  // Selectors
  readonly revenueCard: Locator;
  readonly activeOrdersCard: Locator;
  readonly pendingOrdersCard: Locator;
  readonly activeTablesCard: Locator;
  readonly navigationSidebar: Locator;

  constructor(page: Page) {
    super(page);

    this.revenueCard = page.locator('[data-testid="metric-revenue"]');
    this.activeOrdersCard = page.locator('[data-testid="metric-active-orders"]');
    this.pendingOrdersCard = page.locator('[data-testid="metric-pending-orders"]');
    this.activeTablesCard = page.locator('[data-testid="metric-active-tables"]');
    this.navigationSidebar = page.locator('[data-testid="owner-sidebar"]');
  }

  get path(): string {
    return ROUTES.DASHBOARD;
  }

  // Method Skeletons
  async navigateToMenu(): Promise<void> {}
  async navigateToTables(): Promise<void> {}
  async navigateToStaff(): Promise<void> {}
  async navigateToReports(): Promise<void> {}
}
