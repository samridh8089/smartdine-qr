/**
 * SmartDine SaaS — Staff Factory
 * Phase 7A.2 — Infrastructure
 */

import { UserProfile } from '../types';
import { TestDataFactory } from './test-data.factory';

export class StaffFactory {
  public static createStaff(overrides?: Partial<UserProfile>): UserProfile {
    return TestDataFactory.buildStaffUser(overrides);
  }
}
