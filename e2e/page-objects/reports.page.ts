/**
 * SmartDine SaaS — Reports Page Object Skeleton
 * Phase 7A.2 — Infrastructure
 */

import { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../constants';

export class ReportsPage extends BasePage {
  // Selectors
  readonly dailyTab: Locator;
  readonly weeklyTab: Locator;
  readonly monthlyTab: Locator;
  readonly chartContainer: Locator;
  readonly totalRevenueText: Locator;

  constructor(page: Page) {
    super(page);

    this.dailyTab = page.locator('[data-testid="report-tab-daily"]');
    this.weeklyTab = page.locator('[data-testid="report-tab-weekly"]');
    this.monthlyTab = page.locator('[data-testid="report-tab-monthly"]');
    this.chartContainer = page.locator('[data-testid="reports-chart"]');
    this.totalRevenueText = page.locator('[data-testid="report-total-revenue"]');
  }

  get path(): string {
    return ROUTES.REPORTS;
  }

  // Method Skeletons
  async selectDailyReport(): Promise<void> {}
  async selectWeeklyReport(): Promise<void> {}
  async selectMonthlyReport(): Promise<void> {}
}
