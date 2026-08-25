/**
 * SmartDine SaaS — Customer Factory
 * Phase 7A.2 — Infrastructure
 */

import { generateUUID } from '../utils';

export interface CustomerSession {
  id: string;
  tableSlug: string;
  restaurantSlug: string;
}

export class CustomerFactory {
  public static createSession(restaurantSlug: string = 'test-restaurant', tableSlug: string = 'table-1'): CustomerSession {
    return {
      id: generateUUID(),
      tableSlug,
      restaurantSlug,
    };
  }
}
