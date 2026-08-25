/**
 * SmartDine SaaS — Network Helper & Guard
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix E (Console / Network / JS Error Validation - EV-005, EV-006, EV-007)
 */

import { Page, Request, Response } from '@playwright/test';

export interface NetworkErrorRecord {
  url: string;
  method: string;
  status?: number;
  errorText?: string;
  type: 'failed_request' | '5xx_server_error' | 'unexpected_4xx';
}

export class NetworkHelper {
  private errors: NetworkErrorRecord[] = [];

  // TI-002: Known benign 4xx URLs in dev/test environments.
  // Matching is substring-based (url.includes(entry)), not exact.
  // sw.js: Not deployed in test env — SW registration 404 is expected.
  // /offers: Supabase REST returns 404 when offers table is empty in test env.
  private allowed4xxPatterns: string[] = [
    '/sw.js',
    '/offers',
  ];

  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Starts listening to network failure and error status events.
   */
  public startMonitoring(): void {
    this.page.on('requestfailed', (request: Request) => {
      const url = request.url();
      if (url.includes('favicon.ico') || url.includes('fonts.googleapis.com')) {
        return;
      }
      this.errors.push({
        url,
        method: request.method(),
        errorText: request.failure()?.errorText ?? 'Failed request',
        type: 'failed_request',
      });
    });

    this.page.on('response', (response: Response) => {
      const status = response.status();
      const url = response.url();

      if (status >= 500) {
        this.errors.push({
          url,
          method: response.request().method(),
          status,
          type: '5xx_server_error',
        });
      } else if (status >= 400 && status < 500) {
        const isAllowed = this.allowed4xxPatterns.some((pattern) => url.includes(pattern));
        if (!isAllowed) {
          this.errors.push({
            url,
            method: response.request().method(),
            status,
            type: 'unexpected_4xx',
          });
        }
      }
    });
  }

  /**
   * Adds a URL substring to the 4xx allowlist at runtime.
   * Use sparingly — only for URLs that are genuinely benign in the test environment.
   */
  public allow4xxForUrl(urlSubstring: string): void {
    this.allowed4xxPatterns.push(urlSubstring);
  }

  public getErrors(): NetworkErrorRecord[] {
    return [...this.errors];
  }

  public clearErrors(): void {
    this.errors = [];
  }

  public assertNoNetworkErrors(): void {
    if (this.errors.length > 0) {
      const formatted = this.errors
        .map((e) => `[${e.type}] ${e.method} ${e.url} (status: ${e.status ?? 'N/A'}, err: ${e.errorText ?? 'N/A'})`)
        .join('\n');
      throw new Error(`Network Error Guard Triggered:\n${formatted}`);
    }
  }
}
