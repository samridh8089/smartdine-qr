/**
 * SmartDine SaaS — Coupon Factory
 * Phase 7A.2 — Infrastructure
 */

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order_amount: number;
  is_active: boolean;
}

export class CouponFactory {
  public static create(overrides?: Partial<Coupon>): Coupon {
    return {
      code: 'SAVE10',
      type: 'percentage',
      value: 10,
      min_order_amount: 100,
      is_active: true,
      ...overrides,
    };
  }
}
