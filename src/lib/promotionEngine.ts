import { Offer } from './db';

export interface AppliedDiscountInput {
  offer?: Offer;
  customCode?: string;
  customTitle?: string;
  type?: 'flat' | 'percentage' | 'item_level' | 'category_discount' | 'happy_hour' | 'loyalty' | 'manual_discount' | 'external_coupon' | 'swiggy_coupon' | 'zomato_coupon';
  source?: 'restaurant' | 'swiggy' | 'zomato' | 'loyalty' | 'staff' | 'api' | 'campaign';
  value?: number;
  priority?: number;
  stackable?: boolean;
  metadata?: Record<string, any>;
}

export interface EvaluatedDiscount {
  offer_id?: string;
  type: 'flat' | 'percentage' | 'item_level' | 'category_discount' | 'happy_hour' | 'loyalty' | 'manual_discount' | 'external_coupon' | 'swiggy_coupon' | 'zomato_coupon';
  source: 'restaurant' | 'swiggy' | 'zomato' | 'loyalty' | 'staff' | 'api' | 'campaign';
  code?: string;
  title: string;
  value: number;
  applied_amount: number;
  priority: number;
  stackable: boolean;
  metadata: Record<string, any>;
}

export const PromotionEngine = {
  evaluateDiscount(input: AppliedDiscountInput, subtotal: number): EvaluatedDiscount | null {
    if (subtotal <= 0) return null;

    let offerId = input.offer?.id;
    let type = input.type || (input.offer?.discount_type === 'percentage' ? 'percentage' : 'flat');
    let source = input.source || 'restaurant';
    let code = input.customCode || input.offer?.code;
    let title = input.customTitle || input.offer?.title || 'Discount';
    let value = input.value !== undefined ? input.value : (input.offer?.discount_value || 0);
    let minAmount = input.offer?.min_order_amount || 0;
    let priority = input.priority !== undefined ? input.priority : 0;
    let stackable = input.stackable !== undefined ? input.stackable : true;
    let metadata = input.metadata || {};

    if (subtotal < minAmount) {
      return null;
    }

    let appliedAmount = 0;
    if (type === 'percentage') {
      appliedAmount = parseFloat(((subtotal * value) / 100).toFixed(2));
    } else if (type === 'flat') {
      appliedAmount = Math.min(value, subtotal);
    } else {
      appliedAmount = Math.min(value, subtotal);
    }

    return {
      offer_id: offerId,
      type,
      source,
      code,
      title,
      value,
      applied_amount: appliedAmount,
      priority,
      stackable,
      metadata
    };
  }
};
