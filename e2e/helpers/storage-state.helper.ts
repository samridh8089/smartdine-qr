/**
 * SmartDine SaaS — Storage State Helper
 * Phase 7A.2 — Infrastructure
 *
 * Spec Reference: Appendix I — Storage State Paths per Role
 */

import * as path from 'path';
import { UserRole } from '../constants';

export class StorageStateHelper {
  private static authDir = path.join(process.cwd(), 'e2e', '.auth');

  public static getPathForRole(role: UserRole): string {
    const roleFilenameMap: Record<UserRole, string> = {
      owner: 'owner.json',
      manager: 'manager.json',
      kitchen: 'kitchen.json',
      waiter: 'waiter.json',
      cashier: 'cashier.json',
      super_admin: 'super-admin.json',
      customer: 'customer.json',
    };

    return path.join(this.authDir, roleFilenameMap[role] ?? `${role}.json`);
  }
}
