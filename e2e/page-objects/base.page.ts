/**
 * SmartDine SaaS — Base Page Object
 * Phase 7A.2 — Infrastructure
 */

import { Page, Locator, expect } from '@playwright/test';
import { WaitHelper } from '../helpers/wait.helper';
import { ConsoleHelper } from '../network/console.helper';
import { NetworkHelper } from '../network/network.helper';

export abstract class BasePage {
  protected waitHelper: WaitHelper;
  protected consoleHelper: ConsoleHelper;
  protected networkHelper: NetworkHelper;
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
    this.waitHelper = new WaitHelper(page);
    this.consoleHelper = new ConsoleHelper(page);
    this.networkHelper = new NetworkHelper(page);
  }

  /**
   * Abstract path property that subclasses must define.
   */
  abstract get path(): string;

  /**
   * Navigates to the page path and waits for network idle.
   */
  async goto(options?: { timeout?: number }): Promise<void> {
    await this.page.goto(this.path, { timeout: options?.timeout ?? 30_000 });
    await this.waitHelper.waitForNetworkIdle();
  }

  /**
   * Verifies page title.
   */
  async assertTitle(titleSubstring: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(titleSubstring);
  }

  /**
   * Verifies current URL matches path.
   */
  async assertUrlContains(substring: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(substring));
  }

  /**
   * Starts automatic error guards on this page.
   */
  startErrorGuards(): void {
    this.consoleHelper.startMonitoring();
    this.networkHelper.startMonitoring();
  }

  /**
   * Asserts that no console or network errors occurred during page operations.
   */
  assertNoErrors(): void {
    this.consoleHelper.assertNoConsoleErrors();
    this.networkHelper.assertNoNetworkErrors();
  }
}
