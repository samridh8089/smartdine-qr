/**
 * SmartDine SaaS — Order Factory
 * Phase 7A.2 — Infrastructure
 */

import { Order } from '../types';
import { TestDataFactory } from './test-data.factory';

export class OrderFactory {
  public static createOrder(overrides?: Partial<Order>): Order {
    return TestDataFactory.buildOrder(overrides);
  }
}
