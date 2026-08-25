/**
 * SmartDine SaaS — Shared TypeScript Interfaces
 * Phase 7A.2 — Infrastructure
 */

import { OrderStatus, UserRole } from '../constants';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'cancelled' | 'suspended';
  plan: 'starter' | 'pro' | 'enterprise';
  owner_email: string;
  gst_rate: number;
  service_charge_rate: number;
  currency: string;
  created_at?: string;
  deleted_at?: string | null;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id?: string;
  category_name?: string;
  name: string;
  price: number;
  description?: string;
  is_available: boolean;
  image_url?: string;
  created_at?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  menu_item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  special_instructions?: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_slug: string;
  table_number?: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  gst: number;
  service_charge: number;
  grand_total: number;
  promo_code?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CustomerRequest {
  id: string;
  restaurant_id: string;
  table_slug: string;
  request_type: 'call_waiter' | 'request_bill' | 'water' | 'custom';
  status: 'pending' | 'accepted' | 'completed';
  notes?: string;
  created_at: string;
}

export interface BillingBreakdown {
  subtotal: number;
  discount: number;
  discountedSubtotal: number;
  taxableSubtotal: number;
  gst: number;
  serviceCharge: number;
  taxableCustomCharges: number;
  nonTaxableCustomCharges: number;
  customCharges: number;
  roundOff: number;
  grandTotal: number;
}

export interface BillingResult extends BillingBreakdown {
  breakdown: BillingBreakdown;
}

export interface AuditLog {
  id: string;
  action: string;
  actor_id?: string;
  actor_email?: string;
  target_id?: string;
  target_type?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
  is_active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  restaurant_id?: string;
  created_at?: string;
}
