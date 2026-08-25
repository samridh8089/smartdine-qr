/**
 * SmartDine SaaS — Restaurant Factory
 * Phase 7A.2 — Infrastructure
 */

import { Restaurant } from '../types';
import { TestDataFactory } from './test-data.factory';

export class RestaurantFactory {
  public static create(overrides?: Partial<Restaurant>): Restaurant {
    return TestDataFactory.buildRestaurant(overrides);
  }
}
