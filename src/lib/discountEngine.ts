import { supabase } from './supabase';
import { EvaluatedDiscount } from './promotionEngine';

export interface OrderDiscountRow extends EvaluatedDiscount {
  id?: string;
  order_id: string;
  batch_id?: string;
  item_id?: string;
  created_at?: string;
}

export const DiscountEngine = {
  calculateTotalDiscount(discounts: EvaluatedDiscount[], subtotal: number): number {
    if (!discounts || discounts.length === 0 || subtotal <= 0) return 0;

    // Sort discounts by priority (highest priority first)
    const sorted = [...discounts].sort((a, b) => b.priority - a.priority);
    let remainingSubtotal = subtotal;
    let totalDiscount = 0;

    for (const d of sorted) {
      if (remainingSubtotal <= 0) break;

      let amt = 0;
      if (d.type === 'percentage') {
        amt = parseFloat(((subtotal * d.value) / 100).toFixed(2));
      } else {
        amt = Math.min(d.value, remainingSubtotal);
      }

      amt = Math.min(amt, remainingSubtotal);
      totalDiscount += amt;

      if (!d.stackable) {
        break; // Non-stackable discount stops further discount stacking
      }
      remainingSubtotal -= amt;
    }

    return parseFloat(totalDiscount.toFixed(2));
  },

  async applyDiscountsToOrder(orderId: string, discounts: EvaluatedDiscount[], subtotal: number, batchId?: string): Promise<number> {
    const totalDiscAmt = this.calculateTotalDiscount(discounts, subtotal);

    if (discounts.length > 0) {
      const rows = discounts.map(d => ({
        order_id: orderId,
        batch_id: batchId || null,
        offer_id: d.offer_id || null,
        type: d.type,
        source: d.source,
        code: d.code || null,
        title: d.title,
        value: d.value,
        applied_amount: d.applied_amount,
        priority: d.priority,
        stackable: d.stackable,
        metadata: d.metadata || {}
      }));

      try {
        await supabase.from('order_discounts').insert(rows);
      } catch (err) {
        console.warn('Failed to insert order_discounts rows:', err);
      }
    }

    return totalDiscAmt;
  },

  async getOrderDiscounts(orderId: string): Promise<OrderDiscountRow[]> {
    try {
      const { data, error } = await supabase
        .from('order_discounts')
        .select('*')
        .eq('order_id', orderId)
        .order('priority', { ascending: false });

      if (error || !data) return [];
      return data as OrderDiscountRow[];
    } catch (e) {
      return [];
    }
  },

  async recalculateMultiBatchDiscounts(orderId: string, newSubtotal: number): Promise<number> {
    const existingDiscounts = await this.getOrderDiscounts(orderId);
    if (!existingDiscounts || existingDiscounts.length === 0) return 0;

    let recalculatedTotal = 0;
    for (const d of existingDiscounts) {
      let newApplied = d.applied_amount;
      if (d.type === 'percentage') {
        newApplied = parseFloat(((newSubtotal * d.value) / 100).toFixed(2));
      } else if (d.type === 'flat') {
        newApplied = Math.min(d.value, newSubtotal);
      }

      recalculatedTotal += newApplied;

      if (newApplied !== d.applied_amount) {
        await supabase
          .from('order_discounts')
          .update({ applied_amount: newApplied })
          .eq('id', d.id);
      }
    }

    return parseFloat(recalculatedTotal.toFixed(2));
  }
};
