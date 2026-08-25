/**
 * SmartDine SaaS — Menu Factory
 * Phase 7A.2 — Infrastructure
 */

import { MenuItem } from '../types';
import { TestDataFactory } from './test-data.factory';

export class MenuFactory {
  public static createItem(overrides?: Partial<MenuItem>): MenuItem {
    return TestDataFactory.buildMenuItem(overrides);
  }
}
