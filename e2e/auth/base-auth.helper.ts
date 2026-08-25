/**
 * SmartDine SaaS — Base Auth Helper
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix I (Storage State per Role)
 */

import { Page } from '@playwright/test';
import { UserRole, ROUTES } from '../constants';
import { StorageStateHelper } from '../helpers/storage-state.helper';

export class BaseAuthHelper {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to login page and authenticates with credentials.
   */
  async login(email: string, pass: string): Promise<void> {
    await this.page.goto(ROUTES.LOGIN);
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/password/i).fill(pass);
    await this.page.getByRole('button', { name: /sign in|log in|login/i }).click();
    await this.page.waitForURL((url) => !url.pathname.includes('/login'));
  }

  /**
   * Obtains the pre-stored storage state file path for a role.
   */
  getStorageStatePath(role: UserRole): string {
    return StorageStateHelper.getPathForRole(role);
  }
}
