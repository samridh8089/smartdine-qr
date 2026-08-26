/**
 * SmartDine SaaS — Console Error Guard Helper
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix E (EV-001, EV-002, EV-003, EV-004)
 */

import { Page, ConsoleMessage } from '@playwright/test';

export class ConsoleHelper {
  private errors: string[] = [];
  private warnings: string[] = [];
  private jsExceptions: Error[] = [];

  private allowedConsoleErrorPatterns = [
    /ResizeObserver loop limit exceeded/i,
    /\[HMR\]/i,
    /Failed to fetch dynamically imported module/i,
    // TI-001: sw.js is not deployed in dev/test environments — Service Worker
    // registration failure is expected and does not affect application behaviour.
    /Failed to register a ServiceWorker/i,
    /ServiceWorker.*404/i,
    /A bad HTTP response code \(404\) was received when fetching the script/i,
    /Failed to load resource: the server responded with a status of 404/i,
  ];

  private targetedWarnPatterns = [
    /Warning: Each child in a list should have a unique "key" prop/i,
    /Warning: Can't perform a React state update on an unmounted component/i,
    /Unhandled subscription error/i,
    /Channel error/i,
  ];

  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Subscribes to console and page error events.
   */
  public startMonitoring(): void {
    this.page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error') {
        const isAllowed = this.allowedConsoleErrorPatterns.some((pattern) => pattern.test(text));
        if (!isAllowed) {
          this.errors.push(text);
        }
      } else if (type === 'warning') {
        const isTargeted = this.targetedWarnPatterns.some((pattern) => pattern.test(text));
        if (isTargeted) {
          this.warnings.push(text);
        }
      }
    });

    this.page.on('pageerror', (exception: Error) => {
      this.jsExceptions.push(exception);
    });
  }

  public getErrors(): string[] {
    return [...this.errors];
  }

  public getWarnings(): string[] {
    return [...this.warnings];
  }

  public getExceptions(): Error[] {
    return [...this.jsExceptions];
  }

  public assertNoConsoleErrors(): void {
    const combined: string[] = [
      ...this.errors.map((e) => `[console.error] ${e}`),
      ...this.warnings.map((w) => `[targeted warning] ${w}`),
      ...this.jsExceptions.map((ex) => `[uncaught exception] ${ex.message}\n${ex.stack ?? ''}`),
    ];

    if (combined.length > 0) {
      throw new Error(`Console / JS Error Guard Triggered:\n${combined.join('\n')}`);
    }
  }
}
