/**
 * SmartDine SaaS — Master Test Data Factory
 * Phase 7A.2 — Infrastructure
 *
 * Provides factory stubs for in-memory object generation (Spec TDM-003).
 * No database writes are performed directly in factories.
 */

import { Restaurant, MenuItem, Order, UserProfile } from '../types';
import { generateUUID } from '../utils';

export class TestDataFactory {
  public static buildRestaurant(overrides?: Partial<Restaurant>): Restaurant {
    const id = generateUUID();
    return {
      id,
      name: `QA-EPHEMERAL-Restaurant-${id.slice(0, 8)}`,
      slug: `qa-ephemeral-${id.slice(0, 8)}`,
      status: 'active',
      plan: 'pro',
      owner_email: `qa-ephemeral-${id.slice(0, 8)}@test.com`,
      gst_rate: 5,
      service_charge_rate: 10,
      currency: 'INR',
      ...overrides,
    };
  }

  public static buildMenuItem(overrides?: Partial<MenuItem>): MenuItem {
    const id = generateUUID();
    return {
      id,
      restaurant_id: 'test-restaurant-id',
      name: `QA-EPHEMERAL-Item-${id.slice(0, 8)}`,
      price: 150,
      is_available: true,
      ...overrides,
    };
  }

  public static buildOrder(overrides?: Partial<Order>): Order {
    const id = generateUUID();
    return {
      id,
      restaurant_id: 'test-restaurant-id',
      table_slug: 'table-1',
      status: 'new',
      items: [
        {
          menu_item_id: 'item-1',
          item_name: 'Paneer Butter Masala',
          price: 180,
          quantity: 1,
          subtotal: 180,
        },
      ],
      subtotal: 180,
      discount: 0,
      gst: 9,
      service_charge: 18,
      grand_total: 207,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  public static buildStaffUser(overrides?: Partial<UserProfile>): UserProfile {
    const id = generateUUID();
    return {
      id,
      email: `qa-ephemeral-staff-${id.slice(0, 8)}@test.com`,
      name: `QA Ephemeral Staff ${id.slice(0, 4)}`,
      role: 'waiter',
      restaurant_id: 'test-restaurant-id',
      ...overrides,
    };
  }
}
