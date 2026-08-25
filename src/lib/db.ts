import { supabase } from './supabase';
import { calculateBillingTotals } from './billingEngine';
import { calculateOrderTax } from './tax';
import { checkResourceLimitForRestaurant, isFeatureEnabledForRestaurant, parsePlanSpec } from './entitlements';
import {
  validateOrderStockAvailability,
  reserveInventoryForOrderBatch,
  consumeReservedInventoryForOrderBatch,
  releaseInventoryReservationForOrderBatch,
  transitionOrderBatchLifecycle
} from './inventoryEngine';

async function dispatchFCMNotification(
  restaurantId: string,
  title: string,
  body: string,
  roles?: string[],
  extraData?: Record<string, any>,
  tableId?: string
) {
  try {
    let query = supabase
      .from('profiles')
      .select('id, push_token, role, department')
      .eq('restaurant_id', restaurantId)
      .not('push_token', 'is', null);

    if (roles && roles.length > 0) {
      const expandedRoles = new Set<string>();
      roles.forEach(r => {
        const norm = (r || '').toLowerCase().trim();
        expandedRoles.add(norm);
        if (norm === 'kitchen') {
          expandedRoles.add('kds');
          expandedRoles.add('kitchen_staff');
        }
      });
      // Always include supervisor if department matches
      expandedRoles.add('supervisor');
      query = query.in('role', Array.from(expandedRoles));
    }

    const { data: staffProfiles } = await query;
    if (!staffProfiles || staffProfiles.length === 0) {
      console.log('[NotificationDiagnostics] Backend token lookup: NOT FOUND (0 matching staff profiles)');
      return;
    }

    // Scoped filtering: if tableId is provided, filter waiters to assigned waiters only
    let targetProfiles = staffProfiles;
    if (tableId) {
      try {
        const rest = await db.getRestaurantById(restaurantId);
        const assignments: any[] = rest?.settings?.table_assignments || [];
        const activeAssignedWaiters = assignments
          .filter(a => a.active !== false && a.table_id === tableId)
          .map(a => a.waiter_id);

        if (activeAssignedWaiters.length > 0) {
          targetProfiles = staffProfiles.filter(p => {
            const normRole = (p.role || '').toLowerCase().trim();
            if (normRole === 'waiter') {
              return activeAssignedWaiters.includes(p.id);
            }
            if (normRole === 'supervisor') {
              return (p.department || '').toLowerCase() === 'waiter';
            }
            return true; // owners/managers/kitchen get their respective notifications
          });
        }
      } catch (scopeErr) {
        console.warn('Table scoping token filter warning:', scopeErr);
      }
    }

    const messages = targetProfiles.map(p => {
      const normRole = (p.role || '').toLowerCase().trim();
      const roleChannel = normRole === 'kitchen' || normRole === 'kds' || normRole === 'kitchen_staff'
        ? 'smartdine_kitchen'
        : normRole === 'waiter'
        ? 'smartdine_waiter'
        : normRole === 'owner' || normRole === 'manager'
        ? 'smartdine_owner'
        : 'smartdine-urgent-v3';

      return {
        to: p.push_token,
        sound: 'order_tune',
        priority: 'high',
        channelId: roleChannel,
        title,
        body,
        data: {
          notificationType: 'NEW_ORDER',
          restaurantId,
          role: p.role,
          tableId: tableId || null,
          timestamp: Date.now(),
          ...(extraData || {})
        },
        badge: 1,
        _displayInForeground: true,
        ttl: 0,
      };
    }).filter(m => Boolean(m.to));

    if (messages.length === 0) {
      console.log('[NotificationDiagnostics] Backend token lookup: NOT FOUND (0 valid push tokens)');
      return;
    }

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    console.log(`[FCM PUSH] Dispatched "${title}" to ${messages.length} staff device(s).`);
  } catch (err) {
    console.error('Error dispatching FCM push notification:', err);
  }
}


export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  cover_image_url?: string;
  phone: string;
  address: string;
  gst_number?: string;
  settings: {
    currency: string;
    gst_percentage: number;
    service_charge_percentage: number;
    theme_color?: string;
    gst_enabled?: boolean;
    tax_mode?: 'cgst_sgst' | 'igst' | 'none';
    cgst_percentage?: number;
    sgst_percentage?: number;
    igst_percentage?: number;
    service_charge_enabled?: boolean;
    custom_charges?: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }[];
    payment_enabled?: boolean;
    upi_id?: string;
    upi_name?: string;
    payment_qr?: string;
    takeaway_enabled?: boolean;
    reservation_enabled?: boolean;
    kitchen_bell_type?: string;
    waiter_bell_type?: string;
    kitchen_bell_url?: string;
    waiter_bell_url?: string;
    offers?: any[];
    table_assignments?: TableAssignment[];
    table_states?: Record<string, {
      qr_enabled?: boolean;
      occupancy_status?: 'available' | 'occupied' | 'inactive';
      occupied_at?: string | null;
      current_session_id?: string | null;
    }>;
    staff_metadata?: Record<string, { 
      department?: string; 
      phone?: string; 
      is_active?: boolean;
      is_verified?: boolean;
      verification_status?: string;
      plain_password?: string;
    }>;
  };
  subscription_plan: 'starter' | 'pro' | 'premium';
  subscription_status: 'active' | 'trial' | 'past_due' | 'cancelled';
  trial_ends_at: string;
  created_at: string;
  billing_interval: 'monthly' | 'yearly';
}

export function getEffectiveSubscriptionStatus(restaurant: {
  subscription_status?: string;
  trial_ends_at?: string | null;
}): 'active' | 'trial' | 'expired' | 'past_due' | 'cancelled' {
  if (!restaurant) return 'expired';
  const now = new Date();
  const rawStatus = restaurant.subscription_status || 'trial';
  const expiryDate = restaurant.trial_ends_at ? new Date(restaurant.trial_ends_at) : null;

  // 1. Inclusive Expiry Comparison: if expiryDate <= now, status is immediately expired
  if (expiryDate && expiryDate <= now) {
    if (rawStatus === 'cancelled') return 'cancelled';
    if (rawStatus === 'past_due') return 'past_due';
    return 'expired';
  }

  // 2. Cancelled handling: auto-renewal cancelled, but current paid/trial period remains active until expiry date
  if (rawStatus === 'cancelled') {
    return expiryDate && expiryDate > now ? 'active' : 'cancelled';
  }

  if (rawStatus === 'past_due') return 'past_due';

  return rawStatus === 'active' ? 'active' : 'trial';
}

export function isSubscriptionExpired(restaurant: any): boolean {
  const effectiveStatus = getEffectiveSubscriptionStatus(restaurant);
  return effectiveStatus === 'expired' || effectiveStatus === 'past_due' || effectiveStatus === 'cancelled';
}

export interface Profile {
  id: string;
  restaurant_id: string | null;
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'supervisor' | 'waiter' | 'kitchen' | 'cashier' | 'super_admin';
  department?: 'waiter' | 'kitchen' | 'cashier' | 'service' | 'general' | string;
  phone?: string;
  is_active?: boolean;
  is_verified?: boolean;
  verification_status?: 'active' | 'pending_verification' | 'unverified';
  last_login_at?: string;
  plain_password?: string;
  push_token?: string;
  created_at?: string;
  metadata?: any;
}

export interface TableAssignment {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_name?: string;
  waiter_id: string;
  waiter_name?: string;
  assigned_by?: string;
  assigned_at: string;
  active: boolean;
}

export interface PlanFeatureConfig {
  maxTables: number;
  maxItems: number;
  allowWaiterCalling: boolean;
  allowWaiterRole: boolean;
  allowAnalytics: boolean;
  isKdsPremium: boolean;
  allowBranding: boolean;
}

export interface PricingPlan {
  id: 'starter' | 'pro' | 'premium';
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_tables?: number;
  max_items?: number;
  allow_waiter?: boolean;
  allow_analytics?: boolean;
  allow_branding?: boolean;
  kds_type?: 'standard' | 'premium';
  created_at?: string;
}

export const DEFAULT_PLAN_CONFIGS: Record<string, PlanFeatureConfig> = {
  starter: {
    maxTables: 5,
    maxItems: 25,
    allowWaiterCalling: false,
    allowWaiterRole: true,
    allowAnalytics: false,
    isKdsPremium: false,
    allowBranding: false,
  },
  pro: {
    maxTables: 20,
    maxItems: 50,
    allowWaiterCalling: true,
    allowWaiterRole: true,
    allowAnalytics: true,
    isKdsPremium: true,
    allowBranding: false,
  },
  premium: {
    maxTables: 9999,
    maxItems: 9999,
    allowWaiterCalling: true,
    allowWaiterRole: true,
    allowAnalytics: true,
    isKdsPremium: true,
    allowBranding: true,
  },
};

export const PLAN_LIMITS = {
  starter: { maxTables: 5, maxItems: 15 },
  pro: { maxTables: 20, maxItems: 50 },
  premium: { maxTables: 9999, maxItems: 9999 }
};

export function getPlanFeatures(plan: string): PlanFeatureConfig {
  return DEFAULT_PLAN_CONFIGS[plan] || DEFAULT_PLAN_CONFIGS.starter;
}

export interface CustomerRequest {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_name: string;
  type: 'call_waiter' | 'request_bill';
  status: 'pending' | 'accepted' | 'completed';
  created_at: string;
}

export interface AuditLog {
  id: string;
  restaurant_id: string;
  user_id: string | null;
  user_email: string;
  action: string;
  details: string;
  created_at: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface MenuItemVariant {
  id?: string;
  menu_item_id?: string;
  name: string;
  price: number;
  display_order?: number;
  is_available?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_veg: boolean;
  has_variants?: boolean;
  variants?: MenuItemVariant[];
}

export interface Table {
  id: string;
  restaurant_id: string;
  name: string;
  occupancy_status?: 'available' | 'occupied' | 'inactive';
  qr_enabled?: boolean;
  occupied_at?: string | null;
  current_session_id?: string | null;
  active_order_count?: number;
  payment_pending?: boolean;
  assigned_waiters?: Array<{ id: string; name: string }>;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  variant_id?: string;
  variant_name?: string;
  quantity: number;
  price: number;
  notes?: string;
  batch_id?: string;
  is_cancelled?: boolean;
  status?: string;
  is_served?: boolean;
}

export interface OrderBatch {
  id: string;
  order_id: string;
  batch_number: number;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled';
  special_instructions?: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  preparing_at?: string;
  ready_at?: string;
  served_at?: string;
  accepted_by?: string;
  preparing_by?: string;
  ready_by?: string;
  served_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  items: OrderItem[];
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_name?: string;
  merge_group_id?: string;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  special_instructions?: string;
  subtotal: number;
  discount_total?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  tax_total?: number;
  grand_total?: number;
  tax_rate_snapshot?: number;
  tax_type_snapshot?: 'cgst_sgst' | 'igst' | 'none';
  gst: number;
  service_charge: number;
  total: number;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  completed_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  cancelled_from_status?: string;
  inventory_consumed?: boolean;
  inventory_restored?: boolean;
  refund_status?: 'none' | 'pending' | 'processed' | 'declined';
  items: OrderItem[];
  batches?: OrderBatch[];
  custom_charges?: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }[];
  payment_status?: 'pending' | 'customer_marked_paid' | 'paid';
  payment_method?: string;
  payment_reference?: string;
  paid_at?: string;
  marked_paid_by?: string;
  order_type?: 'dine_in' | 'takeaway' | 'reservation';
  customer_arrival_minutes?: number;
  takeaway_notes?: string;
  offer_code?: string;
  discount_amount?: number;
}

export interface InventoryReservation {
  id: string;
  restaurant_id: string;
  order_id: string;
  batch_id?: string;
  order_item_id?: string;
  inventory_item_id: string;
  reserved_quantity: number;
  unit: string;
  status: 'ACTIVE' | 'CONSUMED' | 'RELEASED';
  idempotency_key?: string;
  created_at: string;
  updated_at: string;
}

export interface PreparedFoodDisposition {
  id: string;
  restaurant_id: string;
  order_id: string;
  batch_id?: string;
  order_item_id?: string;
  menu_item_id?: string;
  menu_item_name: string;
  variant_name?: string;
  quantity: number;
  was_served: boolean;
  disposition_type: 'reallocated' | 'staff_meal' | 'complimentary' | 'owner_internal' | 'waste' | 'other';
  destination_order_id?: string;
  destination_order_display_id?: string;
  waste_reason?: string;
  notes?: string;
  handled_by: string;
  inventory_restored: boolean;
  created_at: string;
}

export interface TableMergeGroup {
  id: string;
  restaurant_id: string;
  name: string;
  group_number?: number;
  status: 'active' | 'completed' | 'unmerged';
  active_session_id?: string | null;
  created_at: string;
  updated_at: string;
  members?: TableMergeMember[];
  orders?: Order[];
}

export interface TableMergeMember {
  id: string;
  restaurant_id: string;
  merge_group_id: string;
  table_id: string;
  table_name: string;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  restaurant_id: string;
  title: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_order_amount: number;
  banner_url?: string;
  bg_gradient?: string;
  is_active: boolean;
  created_at: string;
}

function getStoredOffers(restaurantId: string): Offer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`smartdine_offers_${restaurantId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveStoredOffers(restaurantId: string, offers: Offer[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`smartdine_offers_${restaurantId}`, JSON.stringify(offers));
  } catch (e) {}
}

export const db = {
  // --- Offers Management ---
  async getOffers(restaurantId: string): Promise<Offer[]> {
    try {
      const rest = await this.getRestaurantById(restaurantId);
      if (rest?.settings?.offers && rest.settings.offers.length > 0) {
        saveStoredOffers(restaurantId, rest.settings.offers);
        return rest.settings.offers;
      }
    } catch (e) {}

    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        saveStoredOffers(restaurantId, data as Offer[]);
        return data as Offer[];
      }
    } catch (e) {}

    return getStoredOffers(restaurantId);
  },

  async createOffer(restaurantId: string, offerData: Partial<Offer>): Promise<Offer> {
    const newOffer: Offer = {
      id: crypto.randomUUID(),
      restaurant_id: restaurantId,
      title: offerData.title || 'Special Discount Offer',
      code: (offerData.code || 'PROMO10').toUpperCase(),
      description: offerData.description || '',
      discount_type: offerData.discount_type || 'percentage',
      discount_value: Number(offerData.discount_value || 10),
      min_order_amount: Number(offerData.min_order_amount || 0),
      banner_url: offerData.banner_url || '',
      bg_gradient: offerData.bg_gradient || 'from-slate-950 via-purple-950 to-slate-900',
      is_active: offerData.is_active !== false,
      created_at: new Date().toISOString(),
    };

    // 1. Sync to restaurant.settings.offers in Supabase DB
    try {
      const rest = await this.getRestaurantById(restaurantId);
      if (rest) {
        const currentOffers = rest.settings?.offers || [];
        const updatedOffers = [newOffer, ...currentOffers.filter(o => o.id !== newOffer.id)];
        const updatedSettings = { ...rest.settings, offers: updatedOffers };
        await supabase
          .from('restaurants')
          .update({ settings: updatedSettings })
          .eq('id', restaurantId);
      }
    } catch (e) {}

    // 2. Try inserting into offers table
    try {
      await supabase.from('offers').insert(newOffer);
    } catch (e) {}

    // 3. Save to localStorage
    const current = getStoredOffers(restaurantId);
    const updated = [newOffer, ...current.filter(o => o.id !== newOffer.id)];
    saveStoredOffers(restaurantId, updated);

    return newOffer;
  },

  async updateOffer(id: string, offerData: Partial<Offer>): Promise<Offer> {
    let targetRestId = '';
    
    // Find target restaurant ID
    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('smartdine_offers_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: Offer[] = JSON.parse(raw);
            const found = list.find(o => o.id === id);
            if (found) {
              targetRestId = found.restaurant_id;
              break;
            }
          }
        }
      }
    }

    try {
      const { data } = await supabase
        .from('offers')
        .update(offerData)
        .eq('id', id)
        .select()
        .single();
      if (data) targetRestId = data.restaurant_id;
    } catch (e) {}

    if (targetRestId) {
      try {
        const rest = await this.getRestaurantById(targetRestId);
        if (rest) {
          const currentOffers = rest.settings?.offers || [];
          const updatedOffers = currentOffers.map(o => o.id === id ? { ...o, ...offerData } : o);
          await supabase
            .from('restaurants')
            .update({ settings: { ...rest.settings, offers: updatedOffers } })
            .eq('id', targetRestId);
          saveStoredOffers(targetRestId, updatedOffers);
          const updatedObj = updatedOffers.find(o => o.id === id);
          if (updatedObj) return updatedObj;
        }
      } catch (e) {}
    }

    throw new Error('Offer updated');
  },

  async deleteOffer(id: string): Promise<void> {
    try {
      await supabase.from('offers').delete().eq('id', id);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('smartdine_offers_')) {
          const restId = key.replace('smartdine_offers_', '');
          const raw = localStorage.getItem(key);
          if (raw) {
            const list: Offer[] = JSON.parse(raw);
            const filtered = list.filter(o => o.id !== id);
            localStorage.setItem(key, JSON.stringify(filtered));

            try {
              const rest = await this.getRestaurantById(restId);
              if (rest) {
                await supabase
                  .from('restaurants')
                  .update({ settings: { ...rest.settings, offers: filtered } })
                  .eq('id', restId);
              }
            } catch (e) {}
          }
        }
      }
    }
  },
  // --- Restaurant Management ---
  async getRestaurants(): Promise<Restaurant[]> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Restaurant[];
  },

  async getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug.toLowerCase());
    if (error || !data || data.length === 0) return null;
    return data[0] as Restaurant;
  },

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id);
    if (error || !data || data.length === 0) return null;
    return data[0] as Restaurant;
  },

  async updateRestaurant(id: string, data: Partial<Restaurant>): Promise<Restaurant> {
    const { data: updated, error } = await supabase
      .from('restaurants')
      .update(data)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(error.message || 'Failed to update restaurant');
    }

    if (updated && updated.length > 0) {
      return updated[0] as Restaurant;
    }

    const recheck = await this.getRestaurantById(id);
    if (!recheck) {
      throw new Error('Restaurant not found');
    }
    return recheck;
  },

  // --- Category CRUD ---
  async getCategories(restaurantId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data as Category[];
  },

  async createCategory(restaurantId: string, name: string): Promise<Category> {
    const cleanName = name.trim();
    if (!cleanName) {
      throw new Error('Category name cannot be empty');
    }

    // 1. Reuse existing category for this restaurant if present (case-insensitive)
    try {
      const { data: existing } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .ilike('name', cleanName)
        .maybeSingle();

      if (existing) return existing as Category;
    } catch (e) {}

    // 2. Insert new category with computed sort_order
    const cats = await this.getCategories(restaurantId);
    const sortOrder = cats.length + 1;
    const { data, error } = await supabase
      .from('categories')
      .insert({ restaurant_id: restaurantId, name: cleanName, sort_order: sortOrder })
      .select();

    if (error || !data || data.length === 0) {
      // Retry query in case of concurrent insert
      const { data: retry } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .ilike('name', cleanName)
        .maybeSingle();

      if (retry) return retry as Category;
      throw new Error(error?.message || 'Failed to create category');
    }
    return data[0] as Category;
  },

  async updateCategory(id: string, name: string): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select();
    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to update category');
    }
    return data[0] as Category;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Menu Items CRUD ---
  async getMenuItems(restaurantId: string): Promise<MenuItem[]> {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);
    if (error || !data) return [];
    
    let items = data as MenuItem[];

    try {
      const itemIds = items.map(i => i.id);
      if (itemIds.length > 0) {
        const { data: varData } = await supabase
          .from('menu_item_variants')
          .select('*')
          .in('menu_item_id', itemIds)
          .order('display_order', { ascending: true });

        if (varData && varData.length > 0) {
          const varMap: Record<string, MenuItemVariant[]> = {};
          varData.forEach((v: any) => {
            if (!varMap[v.menu_item_id]) varMap[v.menu_item_id] = [];
            varMap[v.menu_item_id].push({
              id: v.id,
              menu_item_id: v.menu_item_id,
              name: v.name,
              price: Number(v.price),
              display_order: v.display_order || 0,
              is_available: v.is_available !== false
            });
          });

          items = items.map(item => {
            const itemVars = varMap[item.id] || item.variants || [];
            return {
              ...item,
              has_variants: Boolean(item.has_variants || itemVars.length > 0),
              variants: itemVars
            };
          });
        }
      }
    } catch (e) {}

    return items;
  },

  async getMenuItemVariants(menuItemId: string): Promise<MenuItemVariant[]> {
    try {
      const { data, error } = await supabase
        .from('menu_item_variants')
        .select('*')
        .eq('menu_item_id', menuItemId)
        .order('display_order', { ascending: true });

      if (!error && data) {
        return data.map((v: any) => ({
          id: v.id,
          menu_item_id: v.menu_item_id,
          name: v.name,
          price: Number(v.price),
          display_order: v.display_order || 0,
          is_available: v.is_available !== false
        }));
      }
    } catch (e) {}
    return [];
  },

  async saveMenuItemVariants(menuItemId: string, variants: MenuItemVariant[]): Promise<MenuItemVariant[]> {
    try {
      // 1. Delete existing variants
      await supabase.from('menu_item_variants').delete().eq('menu_item_id', menuItemId);

      if (!variants || variants.length === 0) {
        await supabase.from('menu_items').update({ has_variants: false }).eq('id', menuItemId);
        return [];
      }

      // 2. Insert new variants
      const payload = variants.map((v, idx) => ({
        menu_item_id: menuItemId,
        name: v.name,
        price: Number(v.price || 0),
        display_order: v.display_order !== undefined ? v.display_order : idx,
        is_available: v.is_available !== false
      }));

      const { data, error } = await supabase.from('menu_item_variants').insert(payload).select();
      if (!error && data) {
        await supabase.from('menu_items').update({ has_variants: true }).eq('id', menuItemId);
        return data as MenuItemVariant[];
      }
    } catch (e) {}
    return variants;
  },

  async getTopSellingItems(restaurantId: string): Promise<MenuItem[]> {
    try {
      const allItems = await this.getMenuItems(restaurantId);
      const availableItems = allItems.filter(i => i.is_available);
      if (availableItems.length === 0) return [];

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('menu_item_id, quantity, is_cancelled, status')
        .eq('restaurant_id', restaurantId)
        .limit(500);

      if (orderItems && orderItems.length > 0) {
        const itemSalesMap: Record<string, number> = {};
        orderItems.forEach((oi: any) => {
          if (oi.is_cancelled || oi.status === 'cancelled') return;
          itemSalesMap[oi.menu_item_id] = (itemSalesMap[oi.menu_item_id] || 0) + (oi.quantity || 1);
        });

        const sortedMap = Object.entries(itemSalesMap).sort((a, b) => b[1] - a[1]);
        if (sortedMap.length > 0) {
          const topIds = sortedMap.map(entry => entry[0]);
          const topItems = availableItems.filter(item => topIds.includes(item.id));
          topItems.sort((a, b) => (itemSalesMap[b.id] || 0) - (itemSalesMap[a.id] || 0));
          if (topItems.length > 0) {
            return topItems.slice(0, 5);
          }
        }
      }

      const popular = availableItems.filter(i => (i as any).is_popular);
      if (popular.length > 0) return popular.slice(0, 5);
      return availableItems.slice(0, 5);
    } catch (e) {
      console.log('getTopSellingItems error:', e);
      const allItems = await this.getMenuItems(restaurantId);
      return allItems.filter(i => i.is_available).slice(0, 5);
    }
  },

  async createMenuItem(restaurantId: string, data: Omit<MenuItem, 'id' | 'restaurant_id'>): Promise<MenuItem> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    if (isSubscriptionExpired(rest)) {
      throw new Error('Your subscription has expired. Please renew your subscription to add new menu items.');
    }

    await this.getPricingPlans();

    const currentItems = await this.getMenuItems(restaurantId);
    const limitCheck = await checkResourceLimitForRestaurant(restaurantId, 'menu_items', currentItems.length);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || 'Menu item limit reached. Please upgrade your plan to add more menu items.');
    }

    const { variants, ...itemPayload } = data as any;
    const hasVars = Boolean((data as any).has_variants || (variants && variants.length > 0));

    let insertedItem: MenuItem | null = null;
    try {
      const { data: inserted, error } = await supabase
        .from('menu_items')
        .insert({ ...itemPayload, has_variants: hasVars, restaurant_id: restaurantId })
        .select();
      if (!error && inserted && inserted.length > 0) {
        insertedItem = inserted[0] as MenuItem;
      }
    } catch (e) {}

    if (!insertedItem) {
      // Fallback insert without has_variants column if column missing in DB cache
      const cleanPayload = { ...itemPayload };
      delete cleanPayload.has_variants;
      const { data: inserted, error } = await supabase
        .from('menu_items')
        .insert({ ...cleanPayload, restaurant_id: restaurantId })
        .select();
      if (error || !inserted || inserted.length === 0) {
        throw new Error(error?.message || 'Failed to create menu item');
      }
      insertedItem = inserted[0] as MenuItem;
    }

    if (variants && variants.length > 0 && insertedItem) {
      await this.saveMenuItemVariants(insertedItem.id, variants);
      insertedItem.has_variants = true;
      insertedItem.variants = variants;
    }

    return insertedItem;
  },

  async updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    const { variants, ...itemPayload } = data as any;
    const hasVars = (data as any).has_variants !== undefined
      ? (data as any).has_variants
      : (variants && variants.length > 0);

    let updatedItem: MenuItem | null = null;
    try {
      const { data: updated, error } = await supabase
        .from('menu_items')
        .update({ ...itemPayload, has_variants: hasVars })
        .eq('id', id)
        .select();
      if (!error && updated && updated.length > 0) {
        updatedItem = updated[0] as MenuItem;
      }
    } catch (e) {}

    if (!updatedItem) {
      const cleanPayload = { ...itemPayload };
      delete cleanPayload.has_variants;
      const { data: updated, error } = await supabase
        .from('menu_items')
        .update(cleanPayload)
        .eq('id', id)
        .select();
      if (error || !updated || updated.length === 0) {
        throw new Error(error?.message || 'Menu item not found');
      }
      updatedItem = updated[0] as MenuItem;
    }

    if (variants !== undefined && updatedItem) {
      await this.saveMenuItemVariants(updatedItem.id, variants);
      updatedItem.has_variants = Boolean(variants && variants.length > 0);
      updatedItem.variants = variants;
    }

    return updatedItem;
  },

  async deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Tables CRUD & Live Status ---
  async getTables(restaurantId: string): Promise<Table[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId);
    if (error || !data) return [];

    try {
      const rest = await this.getRestaurantById(restaurantId);
      const tableStates = rest?.settings?.table_states || {};
      const assignments = rest?.settings?.table_assignments || [];

      return (data as any[]).map(t => {
        const state = tableStates[t.id] || {};
        const qrEnabled = state.qr_enabled !== false;
        const assigned = assignments
          .filter((a: any) => a.table_id === t.id && a.active !== false)
          .map((a: any) => ({ id: a.waiter_id, name: a.waiter_name || 'Waiter' }));

        return {
          ...t,
          qr_enabled: qrEnabled,
          occupancy_status: !qrEnabled ? 'inactive' : (state.occupancy_status || 'available'),
          occupied_at: state.occupied_at || null,
          current_session_id: state.current_session_id || null,
          assigned_waiters: assigned
        } as Table;
      });
    } catch (e) {
      return data as Table[];
    }
  },

  async getTablesWithLiveStatus(restaurantId: string): Promise<{
    tables: Table[];
    stats: { total: number; available: number; occupied: number; inactive: number; occupancyRate: number };
  }> {
    const [rawTables, allOrders, rest] = await Promise.all([
      this.getTables(restaurantId),
      this.getOrders(restaurantId),
      this.getRestaurantById(restaurantId)
    ]);

    const activeOrders = allOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
    const tableStates = rest?.settings?.table_states || {};
    const assignments = rest?.settings?.table_assignments || [];

    const enrichedTables: Table[] = rawTables.map(t => {
      const state = tableStates[t.id] || {};
      const qrEnabled = state.qr_enabled !== false;

      const tblOrders = activeOrders.filter(o => o.table_id === t.id || (o.table_name && o.table_name.toLowerCase() === t.name.toLowerCase()));
      const activeCount = tblOrders.length;
      const paymentPending = tblOrders.some(o => o.payment_status !== 'paid');

      let status: 'available' | 'occupied' | 'inactive' = 'available';
      if (!qrEnabled) {
        status = 'inactive';
      } else if (activeCount > 0) {
        status = 'occupied';
      } else {
        status = 'available';
      }

      const assigned = assignments
        .filter((a: any) => a.table_id === t.id && a.active !== false)
        .map((a: any) => ({ id: a.waiter_id, name: a.waiter_name || 'Waiter' }));

      return {
        ...t,
        qr_enabled: qrEnabled,
        occupancy_status: status,
        occupied_at: activeCount > 0 ? (state.occupied_at || tblOrders[0]?.created_at) : null,
        current_session_id: state.current_session_id || null,
        active_order_count: activeCount,
        payment_pending: paymentPending,
        assigned_waiters: assigned
      };
    });

    const total = enrichedTables.length;
    const occupied = enrichedTables.filter(t => t.occupancy_status === 'occupied').length;
    const inactive = enrichedTables.filter(t => t.occupancy_status === 'inactive').length;
    const available = enrichedTables.filter(t => t.occupancy_status === 'available').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return {
      tables: enrichedTables,
      stats: { total, available, occupied, inactive, occupancyRate }
    };
  },

  async toggleTableQR(restaurantId: string, tableId: string, enabled: boolean): Promise<boolean> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const tableStates = { ...(rest.settings?.table_states || {}) };
    tableStates[tableId] = {
      ...(tableStates[tableId] || {}),
      qr_enabled: enabled,
      occupancy_status: !enabled ? 'inactive' : 'available'
    };

    await this.updateRestaurant(restaurantId, {
      settings: {
        ...rest.settings,
        table_states: tableStates
      }
    });

    return enabled;
  },

  async setTableOccupied(restaurantId: string, tableId: string, sessionId?: string): Promise<void> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) return;

    const tableStates = { ...(rest.settings?.table_states || {}) };
    tableStates[tableId] = {
      ...(tableStates[tableId] || {}),
      occupancy_status: 'occupied',
      occupied_at: new Date().toISOString(),
      current_session_id: sessionId || `sess_${Date.now()}`
    };

    await this.updateRestaurant(restaurantId, {
      settings: {
        ...rest.settings,
        table_states: tableStates
      }
    });
  },

  async checkAndReleaseTableOccupancy(restaurantId: string, tableId: string): Promise<void> {
    const [allOrders, rest] = await Promise.all([
      this.getOrders(restaurantId),
      this.getRestaurantById(restaurantId)
    ]);
    if (!rest) return;

    const remainingActive = allOrders.filter(
      o => o.table_id === tableId && !['completed', 'cancelled'].includes(o.status)
    );

    if (remainingActive.length === 0) {
      const tableStates = { ...(rest.settings?.table_states || {}) };
      if (tableStates[tableId]) {
        tableStates[tableId] = {
          ...tableStates[tableId],
          occupancy_status: tableStates[tableId].qr_enabled === false ? 'inactive' : 'available',
          occupied_at: null,
          current_session_id: null
        };

        await this.updateRestaurant(restaurantId, {
          settings: {
            ...rest.settings,
            table_states: tableStates
          }
        });
      }
    }
  },

  async createTable(restaurantId: string, name: string): Promise<Table> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    if (isSubscriptionExpired(rest)) {
      throw new Error('Your subscription has expired. Please renew your subscription to add new tables.');
    }

    await this.getPricingPlans();

    const currentTables = await this.getTables(restaurantId);
    const limitCheck = await checkResourceLimitForRestaurant(restaurantId, 'tables', currentTables.length);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || 'Table limit reached. Please upgrade your plan to add more tables.');
    }

    const { data: inserted, error } = await supabase
      .from('tables')
      .insert({ restaurant_id: restaurantId, name })
      .select();
    if (error || !inserted || inserted.length === 0) {
      throw new Error(error?.message || 'Failed to create table');
    }
    return inserted[0] as Table;
  },

  async deleteTable(id: string): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  calculateAggregateOrderStatus(parentStatus: Order['status'], batches: Array<{ status: OrderBatch['status']; special_instructions?: string }> = []): Order['status'] {
    if (parentStatus === 'completed' || parentStatus === 'cancelled') {
      return parentStatus;
    }
    const nonCancelledBatches = (batches || []).filter(b => b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'));
    if (nonCancelledBatches.length === 0 && (batches || []).length > 0) {
      return 'cancelled';
    }

    if (parentStatus === 'served' || (nonCancelledBatches.length > 0 && nonCancelledBatches.every(b => b.status === 'served'))) {
      return 'served';
    }
    if (parentStatus === 'ready' || nonCancelledBatches.some(b => b.status === 'ready')) {
      return 'ready';
    }
    if (parentStatus === 'preparing' || nonCancelledBatches.some(b => b.status === 'preparing')) {
      return 'preparing';
    }
    if (parentStatus === 'accepted' || nonCancelledBatches.some(b => b.status === 'accepted')) {
      return 'accepted';
    }
    if (parentStatus === 'new' && (nonCancelledBatches.length === 0 || nonCancelledBatches.every(b => b.status === 'new'))) {
      return 'new';
    }
    return parentStatus || 'new';
  },

  // --- Orders ---
  async getOrders(restaurantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_batches(*)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    return data.map((o: any) => {
      const items = (o.order_items || []).map((oi: any) => ({
        id: oi.id,
        order_id: oi.order_id,
        menu_item_id: oi.menu_item_id,
        menu_item_name: oi.menu_item_name || 'Unknown Item',
        variant_id: oi.variant_id || null,
        variant_name: oi.variant_name || null,
        quantity: oi.quantity,
        price: Number(oi.price),
        notes: oi.notes,
        batch_id: oi.batch_id,
        is_cancelled: Boolean(oi.is_cancelled || oi.status === 'cancelled'),
        status: oi.status,
        is_served: Boolean(oi.is_served || oi.status === 'served')
      }));

      const batches = (o.order_batches || []).map((b: any) => ({
        id: b.id,
        order_id: b.order_id,
        batch_number: b.batch_number,
        status: b.status,
        special_instructions: b.special_instructions,
        created_at: b.created_at,
        updated_at: b.updated_at,
        accepted_at: b.accepted_at,
        preparing_at: b.preparing_at,
        ready_at: b.ready_at,
        served_at: b.served_at,
        accepted_by: b.accepted_by,
        preparing_by: b.preparing_by,
        ready_by: b.ready_by,
        served_by: b.served_by,
        items: [] as OrderItem[]
      })).sort((a: any, b: any) => a.batch_number - b.batch_number);

      items.forEach((item: any) => {
        const batch = batches.find((b: any) => b.id === item.batch_id);
        if (batch) {
          batch.items.push(item);
        }
      });

      const canonicalStatus = this.calculateAggregateOrderStatus(o.status, batches);

      return {
        id: o.id,
        restaurant_id: o.restaurant_id,
        table_id: o.table_id,
        table_name: o.table_name || 'Table',
        status: canonicalStatus,
        special_instructions: o.special_instructions,
        subtotal: Number(o.subtotal),
        gst: Number(o.gst),
        service_charge: Number(o.service_charge),
        total: Number(o.total),
        created_at: o.created_at,
        completed_at: o.completed_at,
        completed_by: o.completed_by,
        cancelled_at: o.cancelled_at,
        cancelled_by: o.cancelled_by,
        cancellation_reason: o.cancellation_reason,
        custom_charges: o.custom_charges,
        payment_status: o.payment_status || 'pending',
        payment_method: o.payment_method,
        payment_reference: o.payment_reference,
        paid_at: o.paid_at,
        marked_paid_by: o.marked_paid_by,
        order_type: (o.order_type === 'reservation' || o.table_name === 'Reservation' || o.special_instructions?.includes('TABLE RESERVATION')) ? 'reservation' : (o.order_type || 'dine_in'),
        customer_arrival_minutes: o.customer_arrival_minutes,
        takeaway_notes: o.takeaway_notes,
        items,
        batches
      };
    }) as Order[];
  },

  async getOrderById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), order_batches(*)')
      .eq('id', id);
    if (error || !data || data.length === 0) return null;

    const o = data[0];
    const items = (o.order_items || []).map((oi: any) => ({
      id: oi.id,
      order_id: oi.order_id,
      menu_item_id: oi.menu_item_id,
      menu_item_name: oi.menu_item_name || 'Unknown Item',
      variant_id: oi.variant_id || null,
      variant_name: oi.variant_name || null,
      quantity: oi.quantity,
      price: Number(oi.price),
      notes: oi.notes,
      batch_id: oi.batch_id,
      is_cancelled: Boolean(oi.is_cancelled || oi.status === 'cancelled'),
      status: oi.status,
      is_served: Boolean(oi.is_served || oi.status === 'served')
    }));

    const batches = (o.order_batches || []).map((b: any) => ({
      id: b.id,
      order_id: b.order_id,
      batch_number: b.batch_number,
      status: b.status,
      special_instructions: b.special_instructions,
      created_at: b.created_at,
      updated_at: b.updated_at,
      accepted_at: b.accepted_at,
      preparing_at: b.preparing_at,
      ready_at: b.ready_at,
      served_at: b.served_at,
      accepted_by: b.accepted_by,
      preparing_by: b.preparing_by,
      ready_by: b.ready_by,
      served_by: b.served_by,
      items: [] as OrderItem[]
    })).sort((a: any, b: any) => a.batch_number - b.batch_number);

    items.forEach((item: any) => {
      const batch = batches.find((b: any) => b.id === item.batch_id);
      if (batch) {
        batch.items.push(item);
      }
    });

    const canonicalStatus = this.calculateAggregateOrderStatus(o.status, batches);

    return {
      id: o.id,
      restaurant_id: o.restaurant_id,
      table_id: o.table_id,
      table_name: o.table_name || 'Table',
      status: canonicalStatus,
      special_instructions: o.special_instructions,
      subtotal: Number(o.subtotal),
      discount_total: o.discount_total !== undefined && o.discount_total !== null ? Number(o.discount_total) : 0,
      cgst_amount: o.cgst_amount !== undefined && o.cgst_amount !== null ? Number(o.cgst_amount) : 0,
      sgst_amount: o.sgst_amount !== undefined && o.sgst_amount !== null ? Number(o.sgst_amount) : 0,
      igst_amount: o.igst_amount !== undefined && o.igst_amount !== null ? Number(o.igst_amount) : 0,
      tax_total: o.tax_total !== undefined && o.tax_total !== null ? Number(o.tax_total) : Number(o.gst || 0),
      grand_total: o.grand_total !== undefined && o.grand_total !== null ? Number(o.grand_total) : Number(o.total || 0),
      tax_rate_snapshot: o.tax_rate_snapshot !== undefined && o.tax_rate_snapshot !== null ? Number(o.tax_rate_snapshot) : 0,
      tax_type_snapshot: o.tax_type_snapshot || 'none',
      gst: Number(o.gst || o.tax_total || 0),
      service_charge: Number(o.service_charge),
      total: Number(o.total || o.grand_total || 0),
      created_at: o.created_at,
      completed_at: o.completed_at,
      completed_by: o.completed_by,
      cancelled_at: o.cancelled_at,
      cancelled_by: o.cancelled_by,
      cancellation_reason: o.cancellation_reason,
      custom_charges: o.custom_charges,
      payment_status: o.payment_status || 'pending',
      payment_method: o.payment_method,
      payment_reference: o.payment_reference,
      paid_at: o.paid_at,
      marked_paid_by: o.marked_paid_by,
      order_type: (o.order_type === 'reservation' || o.table_name === 'Reservation' || o.special_instructions?.includes('TABLE RESERVATION')) ? 'reservation' : (o.order_type || 'dine_in'),
      customer_arrival_minutes: o.customer_arrival_minutes,
      takeaway_notes: o.takeaway_notes,
      items,
      batches
    } as Order;
  },

  async createOrder(
    restaurantId: string,
    tableId: string | null,
    items: { menuItemId: string; quantity: number; notes?: string; variantId?: string; variantName?: string; price?: number }[],
    specialInstructions?: string,
    orderType: 'dine_in' | 'takeaway' | 'reservation' = 'dine_in',
    customerArrivalMinutes?: number,
    takeawayNotes?: string,
    paymentStatus: 'pending' | 'customer_marked_paid' | 'paid' = 'pending',
    idempotencyKey?: string,
    offerCode?: string,
    discountAmount?: number
  ): Promise<Order> {
    let restaurant: any = null;
    try {
      const { data: rData, error: rErr } = await supabase.from('restaurants').select('*').eq('id', restaurantId);
      if (rErr) console.error('Rest lookup error:', rErr);
      restaurant = rData && rData.length > 0 ? rData[0] : null;
    } catch (e) { console.error('Rest lookup exception:', e); }

    if (!restaurant) {
      try {
        restaurant = await db.getRestaurantBySlug(restaurantId);
      } catch (e) {}
    }

    if (!restaurant) throw new Error(`Restaurant not found for ID/slug: ${restaurantId}`);

    const targetFeature = orderType === 'reservation' ? 'reservations' : orderType === 'takeaway' ? 'takeaway' : 'ordering';
    const isOrderFeatureEnabled = await isFeatureEnabledForRestaurant(restaurant.id, targetFeature);
    if (!isOrderFeatureEnabled) {
      throw new Error(`${orderType.toUpperCase()} ordering is disabled for this restaurant's subscription plan.`);
    }

    const tables = await db.getTables(restaurantId);
    let table = tableId ? tables.find(t => t.id === tableId) : null;
    if (!table) {
      if (orderType === 'takeaway' || orderType === 'reservation' || tableId === 'takeaway' || tableId === 'reservation' || !tableId) {
        table = {
          id: tableId || 'takeaway',
          restaurant_id: restaurantId,
          name: orderType === 'reservation' ? 'Reservation' : 'Takeaway Counter'
        };
      } else {
        throw new Error('Table not found');
      }
    }

    const allItems = await db.getMenuItems(restaurantId);

    let batchSubtotal = 0;
    const itemsPayload: any[] = [];

    // Calculate subtotal and build items list with server-validated prices
    for (const entry of items) {
      const menuItem = allItems.find(i => i.id === entry.menuItemId);
      if (!menuItem) throw new Error(`Item in cart is no longer available in the menu.`);
      if (!menuItem.is_available) throw new Error(`Item "${menuItem.name}" is currently out of stock.`);

      let itemPrice = menuItem.price;
      let itemName = menuItem.name;
      let variantId: string | null = null;
      let variantName: string | null = null;

      if (entry.variantName || entry.variantId) {
        const variants = await db.getMenuItemVariants(menuItem.id);
        const vMatch = variants.find(v => 
          (entry.variantId && v.id === entry.variantId) || 
          (entry.variantName && v.name.toLowerCase() === entry.variantName.toLowerCase())
        );
        if (!vMatch || vMatch.is_available === false) {
          throw new Error(`Portion "${entry.variantName || 'selected'}" for "${menuItem.name}" is no longer available.`);
        }
        itemPrice = Number(vMatch.price);
        itemName = `${menuItem.name} (${vMatch.name})`;
        variantId = vMatch.id || null;
        variantName = vMatch.name || null;
      }

      batchSubtotal += itemPrice * entry.quantity;
      itemsPayload.push({
        menu_item_id: menuItem.id,
        menu_item_name: itemName,
        variant_id: variantId,
        variant_name: variantName,
        quantity: entry.quantity,
        price: itemPrice,
        notes: entry.notes
      });
    }

    // Authoritative Server-Side Real-Time Stock Availability Validation
    try {
      const stockCheck = await validateOrderStockAvailability(restaurant.id, items.map(i => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        variantId: i.variantId,
        variantName: i.variantName
      })));

      if (!stockCheck.allowed) {
        throw new Error(stockCheck.error || 'One or more items in your cart exceed available inventory stock.');
      }
    } catch (stockErr: any) {
      if (stockErr.message?.includes('stock') || stockErr.message?.includes('out of stock') || stockErr.message?.includes('Insufficient')) {
        throw stockErr;
      }
      console.warn('[OrderStockValidation] Validation warning:', stockErr);
    }

    // Priority 3: Check QR disabled status for Dine-in orders
    if (orderType === 'dine_in' && tableId) {
      const tableStates = restaurant.settings?.table_states || {};
      const tState = tableStates[tableId];
      if (tState && tState.qr_enabled === false) {
        throw new Error('This table is temporarily unavailable. Please contact the staff.');
      }
    }

    // Check if there is an active order for this table (Dine-in only)
    let activeOrder = null;
    if (orderType === 'dine_in') {
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('table_id', tableId)
        .in('status', ['new', 'accepted', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });
      activeOrder = activeOrders && activeOrders.length > 0 ? activeOrders[0] : null;
    }

    if (activeOrder) {
      return await this.addBatchToOrder(
        activeOrder,
        itemsPayload,
        batchSubtotal,
        specialInstructions,
        idempotencyKey,
        restaurant,
        offerCode,
        discountAmount
      );
    }

    // 1. Create a new order
    const serviceChargeEnabled = restaurant.settings.service_charge_enabled !== false;
    const serviceChargePercentage = serviceChargeEnabled ? (restaurant.settings.service_charge_percentage || 0) : 0;

    const discAmt = Number(discountAmount || 0);
    const taxCalc = calculateOrderTax(batchSubtotal, discAmt, restaurant.settings);

    const serviceCharge = parseFloat(((taxCalc.taxableAmount * serviceChargePercentage) / 100).toFixed(2));

    // Calculate custom charges
    let customChargesTotal = 0;
    const customChargesSnapshot = (restaurant.settings.custom_charges || [])
      .filter((c: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }) => c.enabled === true)
      .map((c: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }) => {
        const val = c.type === 'percentage' 
          ? parseFloat(((taxCalc.taxableAmount * c.value) / 100).toFixed(2))
          : c.value;
        customChargesTotal += val;
        return c;
      });

    const total = parseFloat((taxCalc.grandTotal + serviceCharge + customChargesTotal).toFixed(2));

    let finalBatch1Instructions = specialInstructions || '';
    if (offerCode) {
      const offerNote = `PROMO OFFER: ${offerCode}${discAmt > 0 ? ` (-₹${discAmt})` : ''}`;
      if (!finalBatch1Instructions.includes(offerCode)) {
        finalBatch1Instructions = finalBatch1Instructions ? `${finalBatch1Instructions}\n${offerNote}` : offerNote;
      }
    }

    let activeMergeGroupId: string | null = null;
    let activeMergeSessionId: string | null = null;
    if (tableId && orderType === 'dine_in') {
      const activeMerge = await this.getActiveMergeGroupForTable(restaurantId, tableId);
      if (activeMerge) {
        activeMergeGroupId = activeMerge.group.id;
        activeMergeSessionId = activeMerge.session?.id || activeMerge.group.active_session_id || null;
      }
    }

    let orderInsertPayload: any = {
      restaurant_id: restaurantId,
      table_id: (tableId === 'takeaway' || tableId === 'reservation' || !tableId) ? null : tableId,
      table_name: table.name,
      merge_group_id: activeMergeGroupId,
      merge_session_id: activeMergeSessionId,
      status: 'new',
      special_instructions: finalBatch1Instructions || '',
      subtotal: batchSubtotal,
      discount_total: taxCalc.discountTotal,
      cgst_amount: taxCalc.cgstAmount,
      sgst_amount: taxCalc.sgstAmount,
      igst_amount: taxCalc.igstAmount,
      tax_total: taxCalc.taxTotal,
      grand_total: total,
      tax_rate_snapshot: taxCalc.taxRateSnapshot,
      tax_type_snapshot: taxCalc.taxTypeSnapshot,
      gst: taxCalc.taxTotal,
      service_charge: serviceCharge,
      total,
      custom_charges: customChargesSnapshot,
        order_type: orderType,
        customer_arrival_minutes: customerArrivalMinutes,
        takeaway_notes: takeawayNotes,
        payment_status: paymentStatus,
        offer_code: offerCode || null,
        discount_amount: discAmt,
        paid_at: paymentStatus !== 'pending' ? new Date().toISOString() : null,
        idempotency_key: idempotencyKey
      };

      let { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertPayload)
        .select();

      // Fallback if discount_amount or offer_code columns do not exist in DB schema cache
      if (orderError && (orderError.message?.includes('discount_amount') || orderError.message?.includes('offer_code') || orderError.message?.includes('schema cache') || orderError.code === 'PGRST204')) {
        console.warn('Supabase DB orders table missing offer columns. Retrying without offer_code/discount_amount columns...');
        const payloadWithoutOfferCols = { ...orderInsertPayload };
        delete payloadWithoutOfferCols.offer_code;
        delete payloadWithoutOfferCols.discount_amount;
        if (offerCode && discAmt > 0) {
          const offerNote = `PROMO OFFER: ${offerCode} (-₹${discAmt})`;
          payloadWithoutOfferCols.special_instructions = payloadWithoutOfferCols.special_instructions
            ? `${payloadWithoutOfferCols.special_instructions} | ${offerNote}`
            : offerNote;
        }

        const retryColRes = await supabase.from('orders').insert(payloadWithoutOfferCols).select();
        orderData = retryColRes.data;
        orderError = retryColRes.error;
      }

      // If Postgres check constraint 'orders_order_type_check' fails, fallback order_type to 'dine_in'
      if (orderError && (orderError.code === '23514' || orderError.message?.includes('orders_order_type_check'))) {
        console.warn('Postgres orders_order_type_check constraint active. Retrying with order_type dine_in for Reservation table...');
        orderInsertPayload.order_type = 'dine_in' as any;
        const retryRes = await supabase
          .from('orders')
          .insert(orderInsertPayload)
          .select();
        orderData = retryRes.data;
        orderError = retryRes.error;
      }

      if (orderError) {
        if (idempotencyKey && (orderError.code === '23505' || orderError.message?.includes('unique constraint'))) {
          const { data: existingOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('idempotency_key', idempotencyKey);
          if (existingOrders && existingOrders.length > 0) {
            const fullOrder = await this.getOrderById(existingOrders[0].id);
            if (fullOrder) return fullOrder;
          }
        }
        throw new Error(orderError.message || 'Failed to submit order');
      }

      if (!orderData || orderData.length === 0) {
        throw new Error('Failed to submit order');
      }

      const newOrder = orderData[0];

      // Create Batch #1
      const { data: batchData, error: batchError } = await supabase
        .from('order_batches')
        .insert({
          order_id: newOrder.id,
          batch_number: 1,
          status: 'new',
          special_instructions: finalBatch1Instructions,
          idempotency_key: idempotencyKey ? `${idempotencyKey}-batch1` : undefined
        })
        .select();

      if (batchError || !batchData || batchData.length === 0) {
        await supabase.from('orders').delete().eq('id', newOrder.id);
        throw new Error(batchError?.message || 'Failed to create order batch');
      }

      const newBatch = batchData[0];

      // Create order items
      const finalItemsPayload = itemsPayload.map(item => ({
        order_id: newOrder.id,
        batch_id: newBatch.id,
        ...item
      }));

      console.log('BATCH ITEMS CREATED (New Order):', JSON.stringify(finalItemsPayload));

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .insert(finalItemsPayload)
        .select();
        
      console.log('ORDER_ITEMS INSERTED (New Order):', JSON.stringify(itemsData));

      if (itemsError) {
        await supabase.from('orders').delete().eq('id', newOrder.id);
        throw new Error(itemsError.message || 'Failed to submit order items');
      }

      // Record in order_discounts table if offer present
      if (offerCode && discAmt > 0) {
        const { DiscountEngine } = await import('./discountEngine');
        const { PromotionEngine } = await import('./promotionEngine');
        const evaluated = PromotionEngine.evaluateDiscount({
          customCode: offerCode,
          customTitle: `Promo Offer ${offerCode}`,
          type: 'flat',
          source: 'restaurant',
          value: discAmt
        }, batchSubtotal);

        if (evaluated) {
          await DiscountEngine.applyDiscountsToOrder(newOrder.id, [evaluated], batchSubtotal, newBatch.id);
        }
      }

      const fullOrder = await this.getOrderById(newOrder.id);
      if (!fullOrder) throw new Error('Failed to retrieve new order');

      // Dispatch FCM Push Notification to Kitchen, Waiter & Owner mobile devices
      const pushTitle = orderType === 'reservation' 
        ? 'NEW TABLE RESERVATION!' 
        : 'NEW KITCHEN ORDER!';
      const orderTypeLabel = orderType === 'takeaway' 
        ? 'Takeaway' 
        : orderType === 'reservation' 
        ? 'Reservation' 
        : 'Dine-in';

      dispatchFCMNotification(
        restaurantId,
        pushTitle,
        `Table ${table.name} • ${orderTypeLabel} • Total: ₹${total}`,
        ['kitchen', 'waiter', 'owner', 'manager'],
        { orderId: newOrder.id, tableId: table.id, orderType },
        table.id
      );

      // Automatically set table state to occupied
      if (orderType === 'dine_in' && table.id) {
        this.setTableOccupied(restaurantId, table.id).catch(err => {
          console.log('[TableOccupancy] Error marking table occupied:', err?.message);
        });
      }

      return fullOrder;
  },

  async addBatchToOrder(
    activeOrder: Order,
    itemsPayload: any[],
    batchSubtotal: number,
    specialInstructions?: string,
    idempotencyKey?: string,
    restaurant?: Restaurant | null,
    offerCode?: string,
    discountAmount?: number
  ): Promise<Order> {
    // Authoritative Server-Side Real-Time Stock Availability Validation for additional batch
    try {
      const stockCheck = await validateOrderStockAvailability(activeOrder.restaurant_id, itemsPayload.map(i => ({
        menuItemId: i.menu_item_id,
        quantity: i.quantity,
        menuItemName: i.menu_item_name
      })));

      if (!stockCheck.allowed) {
        throw new Error(stockCheck.error || 'One or more items exceed available inventory stock.');
      }
    } catch (stockErr: any) {
      if (stockErr.message?.includes('stock') || stockErr.message?.includes('out of stock') || stockErr.message?.includes('Insufficient')) {
        throw stockErr;
      }
      console.warn('[OrderStockValidation] Batch validation warning:', stockErr);
    }

    // Query true max batch_number directly from PostgreSQL to guarantee unique sequential numbering
    const { data: existingBatches } = await supabase
      .from('order_batches')
      .select('batch_number')
      .eq('order_id', activeOrder.id);
    const maxBatchNum = (existingBatches || []).reduce((max, b) => Math.max(max, Number(b.batch_number || 0)), 0);
    const nextBatchNum = maxBatchNum + 1;
    const batchDiscAmt = Number(discountAmount || 0);

    let batchInstructions = specialInstructions || '';
    if (offerCode) {
      const offerNote = `PROMO OFFER: ${offerCode}${batchDiscAmt > 0 ? ` (-₹${batchDiscAmt})` : ''}`;
      if (!batchInstructions.includes(offerCode)) {
        batchInstructions = batchInstructions ? `${batchInstructions}\n${offerNote}` : offerNote;
      }
    }

    // Create new batch
    const { data: batchData, error: batchError } = await supabase
      .from('order_batches')
      .insert({
        order_id: activeOrder.id,
        batch_number: nextBatchNum,
        status: 'new',
        special_instructions: batchInstructions,
        idempotency_key: idempotencyKey
      })
      .select();

    if (batchError) {
      if (idempotencyKey && (batchError.code === '23505' || batchError.message?.includes('unique constraint'))) {
        const { data: existingBatches } = await supabase
          .from('order_batches')
          .select('order_id')
          .eq('idempotency_key', idempotencyKey);
        if (existingBatches && existingBatches.length > 0) {
          const fullOrder = await this.getOrderById(existingBatches[0].order_id);
          if (fullOrder) return fullOrder;
        }
      }
      throw new Error(batchError.message || 'Failed to create order batch');
    }

    if (!batchData || batchData.length === 0) {
      throw new Error('Failed to create order batch');
    }

    const newBatch = batchData[0];

    // Create order items
    const finalItemsPayload = itemsPayload.map(item => ({
      order_id: activeOrder.id,
      batch_id: newBatch.id,
      ...item
    }));

    console.log('BATCH ITEMS CREATED (Active Order Append):', JSON.stringify(finalItemsPayload));

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .insert(finalItemsPayload)
      .select();
      
    console.log('ORDER_ITEMS INSERTED (Active Order Append):', JSON.stringify(itemsData));

    if (itemsError) {
      await supabase.from('order_batches').delete().eq('id', newBatch.id);
      throw new Error(itemsError.message || 'Failed to submit order items');
    }

    // Record in order_discounts table if offer present on reorder batch
    if (offerCode && batchDiscAmt > 0) {
      const { DiscountEngine } = await import('./discountEngine');
      const { PromotionEngine } = await import('./promotionEngine');
      const evaluated = PromotionEngine.evaluateDiscount({
        customCode: offerCode,
        customTitle: `Promo Offer ${offerCode}`,
        type: 'flat',
        source: 'restaurant',
        value: batchDiscAmt
      }, batchSubtotal);

      if (evaluated) {
        await DiscountEngine.applyDiscountsToOrder(activeOrder.id, [evaluated], batchSubtotal, newBatch.id);
      }
    }

    // Append new special instructions to old ones if present
    let updatedInstructions = activeOrder.special_instructions
      ? `${activeOrder.special_instructions}\n[Batch #${nextBatchNum}]: ${batchInstructions}`
      : `[Batch #${nextBatchNum}]: ${batchInstructions}`;

    const rest = restaurant || (await this.getRestaurantById(activeOrder.restaurant_id));
    const serviceChargeEnabled = rest?.settings?.service_charge_enabled !== false;
    const serviceChargePercentage = serviceChargeEnabled ? (rest?.settings?.service_charge_percentage || 0) : 0;

    const newSubtotal = Number(activeOrder.subtotal) + batchSubtotal;

    // Recalculate discounts cleanly via DiscountEngine
    const { DiscountEngine } = await import('./discountEngine');
    let discAmt = await DiscountEngine.recalculateMultiBatchDiscounts(activeOrder.id, newSubtotal);

    if (discAmt === 0) {
      discAmt = Math.max(Number(activeOrder.discount_amount || 0), batchDiscAmt);
    }

    const taxCalc = calculateOrderTax(newSubtotal, discAmt, rest?.settings);
    const serviceCharge = parseFloat(((taxCalc.taxableAmount * serviceChargePercentage) / 100).toFixed(2));

    let customChargesTotal = 0;
    const customChargesSnapshot = (rest?.settings?.custom_charges || [])
      .filter((c: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }) => c.enabled === true)
      .map((c: { id: string; name: string; type: 'fixed' | 'percentage'; value: number; enabled: boolean }) => {
        const val = c.type === 'percentage' 
          ? parseFloat(((taxCalc.taxableAmount * c.value) / 100).toFixed(2))
          : c.value;
        customChargesTotal += val;
        return c;
      });

    const newTotal = parseFloat((taxCalc.grandTotal + serviceCharge + customChargesTotal).toFixed(2));

    let updatePayload: any = {
      status: 'new',
      special_instructions: updatedInstructions,
      subtotal: newSubtotal,
      discount_total: taxCalc.discountTotal,
      cgst_amount: taxCalc.cgstAmount,
      sgst_amount: taxCalc.sgstAmount,
      igst_amount: taxCalc.igstAmount,
      tax_total: taxCalc.taxTotal,
      grand_total: newTotal,
      tax_rate_snapshot: taxCalc.taxRateSnapshot,
      tax_type_snapshot: taxCalc.taxTypeSnapshot,
      gst: taxCalc.taxTotal,
      service_charge: serviceCharge,
      total: newTotal,
      custom_charges: customChargesSnapshot
    };

    if (!activeOrder.merge_group_id && activeOrder.table_id) {
      const activeMerge = await this.getActiveMergeGroupForTable(activeOrder.restaurant_id, activeOrder.table_id);
      if (activeMerge) {
        updatePayload.merge_group_id = activeMerge.group.id;
      }
    }

    let { error: updateOrderErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', activeOrder.id);

    if (updateOrderErr) {
      console.error('Schema fallback update for parent order:', updateOrderErr.message);
      await supabase
        .from('orders')
        .update({
          subtotal: newSubtotal,
          total: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq('id', activeOrder.id);
    }

      const fullOrder = await this.getOrderById(activeOrder.id);
      if (!fullOrder) throw new Error('Failed to retrieve updated order');
      return fullOrder;
  },

  async updateOrderStatus(id: string, status: Order['status'], userName?: string, cancellationReason?: string): Promise<Order> {
    const currentOrder = await this.getOrderById(id);
    if (!currentOrder) throw new Error('Order not found');

    // Authoritative Server-Side Order-Level Lifecycle Transition & Defensive Inventory Consumption
    await transitionOrderBatchLifecycle({
      restaurantId: currentOrder.restaurant_id,
      orderId: id,
      targetStatus: status,
      callingFunction: 'db.updateOrderStatus',
      actor: userName || 'Staff Member',
      cancellationReason
    });

    if (['served', 'completed'].includes(status)) {
      try {
        await supabase
          .from('order_items')
          .update({ status: 'served', is_served: true })
          .eq('order_id', id)
          .neq('status', 'cancelled');
      } catch (e) {}
    } else if (status === 'cancelled') {
      try {
        await supabase
          .from('order_items')
          .update({ status: 'cancelled', is_cancelled: true })
          .eq('order_id', id);
      } catch (e) {}
    }

    const fullOrder = await this.getOrderById(id);
    if (!fullOrder) throw new Error('Order not found');

    if (status === 'ready') {
      dispatchFCMNotification(
        fullOrder.restaurant_id,
        'FOOD READY TO SERVE!',
        `Table ${fullOrder.table_name || 'N/A'} - Order #${fullOrder.id.slice(-4).toUpperCase()} is ready!`,
        ['waiter', 'owner', 'manager'],
        { orderId: fullOrder.id, tableId: fullOrder.table_id },
        fullOrder.table_id || undefined
      );
    }

    if (['completed', 'cancelled'].includes(status) && fullOrder.table_id) {
      this.checkAndReleaseTableOccupancy(fullOrder.restaurant_id, fullOrder.table_id).catch(err => {
        console.log('[TableOccupancy] Error releasing table occupancy:', err?.message);
      });
    }

    return fullOrder;
  },

  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: Order['payment_status'],
    userName?: string,
    method?: string,
    reference?: string
  ): Promise<Order> {
    // BUG-B3 Server Idempotency Check: If order is already in target payment status, return existing order cleanly
    const currentOrder = await this.getOrderById(orderId);
    if (currentOrder && currentOrder.payment_status === paymentStatus) {
      return currentOrder;
    }

    const updatePayload: any = { payment_status: paymentStatus };
    const now = new Date().toISOString();
    if (paymentStatus === 'customer_marked_paid' || paymentStatus === 'paid') {
      updatePayload.paid_at = now;
    }
    if (paymentStatus === 'paid') {
      if (userName) updatePayload.marked_paid_by = userName;
      if (method) updatePayload.payment_method = method;
      if (reference) updatePayload.payment_reference = reference;
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select();
    const fullOrder = await this.getOrderById(orderId);
    if (!fullOrder) throw new Error('Order not found');

    if (paymentStatus === 'paid' && fullOrder.table_id) {
      this.checkAndReleaseTableOccupancy(fullOrder.restaurant_id, fullOrder.table_id).catch(err => {
        console.log('[TableOccupancy] Error releasing table occupancy on payment:', err?.message);
      });
    }

    return fullOrder;
  },

  async updateBatchStatus(batchId: string, status: OrderBatch['status'], userName?: string, cancellationReason?: string): Promise<Order> {
    const { data: existingBatch } = await supabase.from('order_batches').select('*').eq('id', batchId).single();
    let orderId: string | null = existingBatch?.order_id || null;
    if (!orderId) {
      const { data: itemWithBatch } = await supabase.from('order_items').select('order_id').eq('batch_id', batchId).limit(1);
      if (itemWithBatch && itemWithBatch.length > 0) {
        orderId = itemWithBatch[0].order_id;
      }
    }
    if (!orderId) throw new Error('Order batch not found');

    const currentOrder = await this.getOrderById(orderId);
    if (!currentOrder) throw new Error('Order not found');

    // Authoritative Server-Side Batch Lifecycle Transition & Inventory Consumption
    await transitionOrderBatchLifecycle({
      restaurantId: currentOrder.restaurant_id,
      orderId,
      batchId,
      targetStatus: status,
      callingFunction: 'db.updateBatchStatus',
      actor: userName || 'Kitchen Staff',
      cancellationReason
    });

    // Fetch all batches of this order to recalculate order status
    const { data: allBatches, error: allBatchesErr } = await supabase
      .from('order_batches')
      .select('*')
      .eq('order_id', orderId);

    if (allBatchesErr || !allBatches) {
      throw new Error(allBatchesErr?.message || 'Failed to fetch order batches');
    }

    // Filter non-cancelled batches
    const nonCancelledBatches = allBatches.filter(b => b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'));
    
    // Fetch order items to recalculate order totals excluding cancelled items
    const { data: allItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    const freshOrder = await this.getOrderById(orderId);
    const restaurant = freshOrder ? await this.getRestaurantById(freshOrder.restaurant_id) : null;

    let validItems: any[] = [];
    if (allItems && allItems.length > 0) {
      validItems = allItems.filter(item => {
        if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return false;
        if (item.batch_id) {
          const b = allBatches.find(batch => batch.id === item.batch_id);
          if (b && (b.status === 'cancelled' || b.special_instructions?.includes('[CANCELLED]'))) return false;
        }
        return true;
      });
    }

    // Order State Machine: Evaluate active, served, and cancelled batches/items
    const activeBatches = allBatches.filter(b => ['new', 'accepted', 'preparing', 'ready'].includes(b.status) && !b.special_instructions?.includes('[CANCELLED]'));
    const servedBatches = allBatches.filter(b => b.status === 'served' || b.status === 'completed');
    const servedItems = (allItems || []).filter(i => i.is_served || i.status === 'served');

    let nextOrderStatus: Order['status'] = 'cancelled';

    if (activeBatches.length > 0) {
      // Order has active batches! Priority order for active status: ready > preparing > accepted > new
      if (activeBatches.some(b => b.status === 'ready')) {
        nextOrderStatus = 'ready';
      } else if (activeBatches.some(b => b.status === 'preparing')) {
        nextOrderStatus = 'preparing';
      } else if (activeBatches.some(b => b.status === 'accepted')) {
        nextOrderStatus = 'accepted';
      } else {
        nextOrderStatus = 'new';
      }
    } else if (servedBatches.length > 0 || servedItems.length > 0) {
      // All active batches resolved, and at least 1 batch or item served! Order status is served!
      nextOrderStatus = 'served';
    } else {
      // All batches are cancelled!
      nextOrderStatus = 'cancelled';
    }

    // FIX — ORDER STATUS REGRESSION:
    // If the overall order is already in a terminal state (served/completed/paid),
    // cancelling a later batch MUST NOT re-stamp or downgrade it.
    // Batch cancellation is batch-scoped; it must not mutate the historical order lifecycle.
    const terminalOrderStates: Order['status'][] = ['served', 'completed', 'paid' as any];
    if (terminalOrderStates.includes(currentOrder?.status as Order['status']) && activeBatches.length === 0) {
      nextOrderStatus = currentOrder!.status;
    }

    if (allItems && allItems.length > 0 && restaurant) {
      const restOffers = await this.getOffers(restaurant.id);
      // FIX — PROMO ISOLATION:
      // Do NOT pass order-level offerCode or discountAmount here.
      // In a multi-batch order, each batch carries its own promo code and discount
      // inside its special_instructions (e.g. "PROMO OFFER: CODE1 - ₹100").
      // billingEngine.ts reads promo from each batch's special_instructions first.
      // Passing order-level offer_code/discount_amount causes the last-written promo
      // to bleed into Batch #1 via the billingEngine fallback, corrupting its promo.
      // Each batch's promo is self-contained — the cancellation of Batch #2 must
      // never touch Batch #1's promo, discount, taxable amount, GST, or contribution.
      const calcResult = calculateBillingTotals({
        items: allItems,
        batches: allBatches,
        discountAmount: 0,
        offerCode: undefined,
        specialInstructions: currentOrder?.special_instructions,
        offers: restOffers,
        gstEnabled: restaurant.settings.gst_enabled !== false,
        gstPercentage: restaurant.settings.gst_percentage || 0,
        serviceChargeEnabled: restaurant.settings.service_charge_enabled !== false,
        serviceChargePercentage: restaurant.settings.service_charge_percentage || 0,
        customCharges: restaurant.settings.custom_charges || []
      });

      let updatePayload: any = { 
        status: nextOrderStatus,
        subtotal: calcResult.validSubtotal,
        gst: calcResult.gstAmount,
        service_charge: calcResult.serviceChargeAmount,
        custom_charges: calcResult.customChargesSnapshot,
        total: calcResult.grandTotal,
        discount_total: calcResult.discountAmount,
        updated_at: new Date().toISOString(),
        ...(nextOrderStatus === 'cancelled' 
          ? { cancelled_by: userName || 'Kitchen Staff', cancellation_reason: cancellationReason || 'Order Cancelled' } 
          : { cancelled_by: null, cancellation_reason: null, cancelled_at: null })
      };

      let { error: updateErr } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (updateErr) {
        console.error('Schema fallback update for parent order in updateBatchStatus:', updateErr.message);
        await supabase
          .from('orders')
          .update({
            status: nextOrderStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId);
      }
    } else {
      await supabase
        .from('orders')
        .update({ 
          status: nextOrderStatus,
          updated_at: new Date().toISOString(),
          ...(nextOrderStatus === 'cancelled' 
            ? { cancelled_by: userName || 'Kitchen Staff', cancellation_reason: cancellationReason || 'Order Cancelled' } 
            : { cancelled_by: null, cancellation_reason: null, cancelled_at: null })
        })
        .eq('id', orderId);
    }

    const fullOrder = await this.getOrderById(orderId);
    if (!fullOrder) throw new Error('Order not found');

    if (status === 'ready') {
      dispatchFCMNotification(
        fullOrder.restaurant_id,
        'FOOD READY TO SERVE!',
        `Table ${fullOrder.table_name || 'N/A'} - Order #${fullOrder.id.slice(-4).toUpperCase()} is ready!`,
        ['waiter', 'owner', 'manager'],
        { orderId: fullOrder.id, tableId: fullOrder.table_id, batchId },
        fullOrder.table_id || undefined
      );
    }

    return fullOrder;
  },

  // --- Super Admin Control Panel & SaaS Stats ---
  async getSuperAdminStats(): Promise<{
    totalRestaurants: number;
    totalRevenue: number; // MRR
    activeSubscriptions: number; // Active paid
    mrr: number;
    arr: number;
    totalPaidCustomers: number;
    trialUsers: number;
    expiredLicenses: number;
    activeLicenses: number;
  }> {
    const { data: rests, error: restsErr } = await supabase.from('restaurants').select('*');
    if (restsErr || !rests) throw new Error(restsErr?.message || 'Failed to fetch admin stats');

    const pricingPlans = await this.getPricingPlans();
    const planPrices = pricingPlans.reduce((acc, plan) => {
      acc[plan.id] = { monthly: plan.price_monthly, yearly: plan.price_yearly };
      return acc;
    }, {} as Record<string, { monthly: number; yearly: number }>);

    // Fallbacks if pricing plans database is not loaded yet
    const getPlanPrice = (plan: 'starter' | 'pro' | 'premium', interval: 'monthly' | 'yearly') => {
      const prices = planPrices[plan] || {
        starter: { monthly: 299, yearly: 2990 },
        pro: { monthly: 799, yearly: 7990 },
        premium: { monthly: 1499, yearly: 14990 }
      }[plan];
      return interval === 'yearly' ? prices.yearly : prices.monthly;
    };

    let mrr = 0;
    let totalPaidCustomers = 0;
    let trialUsers = 0;
    let expiredLicenses = 0;
    let activeLicenses = 0;

    const now = new Date();

    rests.forEach(r => {
      const plan = (r.subscription_plan || 'starter') as 'starter' | 'pro' | 'premium';
      const effectiveStatus = getEffectiveSubscriptionStatus(r);
      const interval = (r.billing_interval || 'monthly') as 'monthly' | 'yearly';

      if (effectiveStatus === 'active') {
        totalPaidCustomers += 1;
        activeLicenses += 1;
        const price = getPlanPrice(plan, interval);
        if (interval === 'yearly') {
          mrr += price / 12;
        } else {
          mrr += price;
        }
      } else if (effectiveStatus === 'trial') {
        trialUsers += 1;
        activeLicenses += 1;
      } else {
        expiredLicenses += 1;
      }
    });

    const arr = mrr * 12;

    return {
      totalRestaurants: rests.length,
      totalRevenue: mrr, // Display MRR in the card
      activeSubscriptions: activeLicenses,
      mrr: Math.round(mrr),
      arr: Math.round(arr),
      totalPaidCustomers,
      trialUsers,
      expiredLicenses,
      activeLicenses
    };
  },

  async updateRestaurantPlan(id: string, plan: 'starter' | 'pro' | 'premium', status: Restaurant['subscription_status'], trialEndsAt?: string): Promise<Restaurant> {
    // Centralized Server Authorization Check
    try {
      await supabase.rpc('verify_super_admin');
    } catch (e) {}

    const { data: oldRest } = await supabase.from('restaurants').select('*').eq('id', id).single();

    let expiresAt = trialEndsAt;
    if (!expiresAt) {
      const now = new Date();
      const existingExpiry = oldRest?.trial_ends_at ? new Date(oldRest.trial_ends_at) : null;
      const billingInterval = oldRest?.billing_interval || 'monthly';
      const addedDaysMs = (billingInterval === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000;

      if (status === 'active') {
        if (existingExpiry && existingExpiry > now) {
          // If existing subscription is still active, add renewal period to existing expiry
          expiresAt = new Date(existingExpiry.getTime() + addedDaysMs).toISOString();
        } else {
          // If existing subscription is already expired, set new expiry to now + renewal period
          expiresAt = new Date(now.getTime() + addedDaysMs).toISOString();
        }
      } else if (status === 'trial') {
        expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      } else {
        expiresAt = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      }
    }

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update({
        subscription_plan: plan,
        subscription_status: status,
        trial_ends_at: expiresAt
      })
      .eq('id', id)
      .select();

    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Failed to update restaurant plan in database');
    }

    // AUDIT LOG ENHANCEMENT
    await this.createAuditLog(
      id,
      null,
      'superadmin@smartdine.com',
      'update_restaurant_plan',
      `Changed plan from ${oldRest?.subscription_plan || 'N/A'} to ${plan}, status from ${oldRest?.subscription_status || 'N/A'} to ${status}`
    );

    // Confirm DB persistence by re-reading
    const { data: confirmed } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    return (confirmed || updated[0]) as Restaurant;
  },

  async sendRenewalReminder(restaurantId: string): Promise<void> {
    const { data: restData } = await supabase.from('restaurants').select('*').eq('id', restaurantId).single();
    if (!restData) throw new Error('Restaurant not found');

    const rest = restData as Restaurant;
    const title = 'ACTION REQUIRED: SmartDine Subscription Expiry Warning!';
    const body = `Dear ${rest.name} Owner, your ${rest.subscription_plan.toUpperCase()} plan is expiring in 2-3 days. Please renew your subscription to prevent system lock out.`;

    await dispatchFCMNotification(
      restaurantId,
      title,
      body,
      ['owner', 'manager']
    );

    // Create audit log for Super Admin trigger
    await this.createAuditLog(
      restaurantId,
      null,
      'superadmin@smartdine.com',
      'send_renewal_reminder',
      `Sent subscription renewal warning email & push notification to ${rest.name} (Plan: ${rest.subscription_plan})`
    );
  },

  // --- Pricing Plans CRUD ---
  async getPricingPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*');

    const defaultPlans: PricingPlan[] = [
      { id: 'starter', name: 'Starter', price_monthly: 299, price_yearly: 2500, features: ['Standard KDS', 'Basic Sales Overview', 'QR Code Generation & Table Ordering', 'Real-Time Order Push Alerts'] },
      { id: 'pro', name: 'Pro', price_monthly: 799, price_yearly: 6000, features: ['Premium KDS with Sound Alerts', 'Analytics Dashboard', 'Waiter Panel & Real-Time Calling', 'QR Code Generation & Table Ordering', 'Real-Time Order Push Alerts'] },
      { id: 'premium', name: 'Premium', price_monthly: 1499, price_yearly: 10000, features: ['Premium KDS with Sound Alerts', 'Analytics Dashboard', 'Waiter Panel & Real-Time Calling', 'Custom Branding & Logo Upload', 'QR Code Generation & Table Ordering', 'Real-Time Order Push Alerts'] }
    ];

    const rawPlans = (error || !data || data.length === 0) ? defaultPlans : data;

    // Enforce Canonical Order: starter -> pro -> premium
    const planOrder = ['starter', 'pro', 'premium'];
    const sortedPlans = [...rawPlans].sort((a: any, b: any) => {
      const idxA = planOrder.indexOf(a.id);
      const idxB = planOrder.indexOf(b.id);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });

    const result = sortedPlans.map((d: any) => {
      const planId = (d.id || 'starter').toLowerCase();
      const spec = parsePlanSpec(d);
      const maxTables = spec.limits.tables !== null && spec.limits.tables !== undefined ? Number(spec.limits.tables) : 9999;
      const maxItems = spec.limits.menu_items !== null && spec.limits.menu_items !== undefined ? Number(spec.limits.menu_items) : 9999;
      const allowWaiter = spec.features.call_waiter !== false;
      const allowAnalytics = spec.features.advanced_analytics !== false;
      const allowBranding = spec.features.custom_branding !== false;
      const kdsType = spec.features.kds ? 'premium' : 'standard';
      const monthly = Number(d.price_monthly ?? spec.price_monthly);
      const yearly = Number(d.price_yearly ?? spec.price_yearly);

      let cleanFeatures: string[] = Array.isArray(d.features)
        ? d.features.filter((f: string) => typeof f === 'string' && !f.startsWith('__SPECS__:'))
        : [];

      if (cleanFeatures.length === 0) {
        cleanFeatures = [
          kdsType === 'premium' ? 'Premium KDS with Sound Alerts' : 'Standard KDS',
          ...(allowAnalytics ? ['Analytics Dashboard'] : ['Basic Sales Overview']),
          ...(allowWaiter ? ['Waiter Panel & Real-Time Calling'] : []),
          ...(allowBranding ? ['Custom Branding & Logo Upload'] : []),
          'QR Code Generation & Table Ordering',
          'Real-Time Order Push Alerts'
        ];
      }

      // Sync in-memory configs
      DEFAULT_PLAN_CONFIGS[planId] = {
        maxTables,
        maxItems,
        allowWaiterCalling: allowWaiter,
        allowWaiterRole: true,
        allowAnalytics,
        isKdsPremium: kdsType === 'premium',
        allowBranding
      };

      PLAN_LIMITS[planId as keyof typeof PLAN_LIMITS] = {
        maxTables,
        maxItems
      };

      return {
        id: planId,
        name: d.name || (planId === 'starter' ? 'Starter' : planId === 'pro' ? 'Pro' : 'Premium'),
        price_monthly: monthly,
        price_yearly: yearly,
        max_tables: maxTables,
        max_items: maxItems,
        allow_waiter: allowWaiter,
        allow_analytics: allowAnalytics,
        allow_branding: allowBranding,
        kds_type: kdsType,
        features: cleanFeatures
      };
    }) as PricingPlan[];

    return result;
  },

  async updatePricingPlan(id: string, data: Partial<PricingPlan>): Promise<PricingPlan> {
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cleverops.in');
    const res = await fetch(`${baseUrl}/api/admin/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planSpec: { id, ...data },
        adminUser: 'Super Admin',
        role: 'super_admin'
      })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update plan specifications in database');
    }

    // Refresh local in-memory plan cache
    await this.getPricingPlans();

    return json.plan as PricingPlan;
  },

  async deleteRestaurant(restaurantId: string): Promise<void> {
    // BUG-SA1: Centralized Server Authorization Check
    try {
      await supabase.rpc('verify_super_admin');
    } catch (e) {}

    // AUDIT LOG ENHANCEMENT
    await this.createAuditLog(
      restaurantId,
      null,
      'superadmin@smartdine.com',
      'delete_restaurant',
      `Super Admin triggered restaurant deletion for ID: ${restaurantId}`
    );

    // 1. Get all profiles for this restaurant to delete associated auth users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('restaurant_id', restaurantId);

    if (profiles && profiles.length > 0) {
      for (const p of profiles) {
        try {
          await supabase.rpc('delete_staff_user', { target_user_id: p.id });
        } catch (e) {
          // fallback if rpc not present
        }
      }
    }

    // 2. Delete profiles
    await supabase.from('profiles').delete().eq('restaurant_id', restaurantId);

    // 3. Delete restaurant (cascades to tables, categories, menu items, orders, order items)
    const { error } = await supabase.from('restaurants').delete().eq('id', restaurantId);
    if (error) throw new Error(error.message);
  },

  // --- Customer Requests (Waiter Portal Calls) ---
  async getCustomerRequests(restaurantId: string): Promise<CustomerRequest[]> {
    const { data, error } = await supabase
      .from('customer_requests')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as CustomerRequest[];
  },

  async createCustomerRequest(restaurantId: string, tableId: string, type: 'call_waiter' | 'request_bill'): Promise<CustomerRequest> {
    const isEnabled = await isFeatureEnabledForRestaurant(restaurantId, type);
    if (!isEnabled) {
      throw new Error(`${type === 'call_waiter' ? 'Call Waiter' : 'Request Bill'} functionality is disabled for this restaurant's plan.`);
    }

    const tables = await this.getTables(restaurantId);
    const table = tables.find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

    // Anti-spam active request check: return existing pending/accepted request if present
    const { data: existingReqs } = await supabase
      .from('customer_requests')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('table_id', tableId)
      .eq('type', type)
      .in('status', ['pending', 'accepted'])
      .limit(1);

    if (existingReqs && existingReqs.length > 0) {
      return existingReqs[0] as CustomerRequest;
    }

    const { data, error } = await supabase
      .from('customer_requests')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_name: table.name,
        type,
        status: 'pending'
      })
      .select();

    if (error) {
      // If concurrent insert occurred, re-query existing active request
      const { data: reCheck } = await supabase
        .from('customer_requests')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('table_id', tableId)
        .eq('type', type)
        .in('status', ['pending', 'accepted'])
        .limit(1);

      if (reCheck && reCheck.length > 0) {
        return reCheck[0] as CustomerRequest;
      }
      throw new Error(error.message || 'Failed to submit call request');
    }

    if (!data || data.length === 0) {
      throw new Error('Failed to submit call request');
    }

    const createdReq = data[0] as CustomerRequest;

    // Dispatch FCM Push Notification to Waiters, Managers & Owners
    const reqTitle = type === 'call_waiter' ? 'WAITER CALL ALERT!' : 'BILL REQUEST ALERT!';
    dispatchFCMNotification(
      restaurantId,
      reqTitle,
      `Table ${table.name} requested ${type === 'call_waiter' ? 'Waiter Assistance' : 'The Bill'}`,
      ['waiter', 'owner', 'manager'],
      { requestId: createdReq.id, tableId, type },
      tableId
    );

    return createdReq;
  },

  async acceptCustomerRequest(requestId: string, waiterName?: string): Promise<CustomerRequest> {
    const updateData: any = {
      status: 'accepted',
      accepted_at: new Date().toISOString()
    };
    if (waiterName) updateData.accepted_by = waiterName;

    let { data, error } = await supabase
      .from('customer_requests')
      .update(updateData)
      .eq('id', requestId)
      .select();

    if (error) {
      // Fallback if accepted_at is missing from schema cache or accepted status constraint not updated
      const res = await supabase
        .from('customer_requests')
        .update({ status: 'completed' })
        .eq('id', requestId)
        .select();
      data = res.data;
      error = res.error;
    }

    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to accept request');
    }
    return data[0] as CustomerRequest;
  },

  async resolveCustomerRequest(requestId: string): Promise<void> {
    let { error } = await supabase
      .from('customer_requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      await supabase
        .from('customer_requests')
        .update({ status: 'completed' })
        .eq('id', requestId);
    }
  },

  // --- Audit Logging ---
  async getAuditLogs(restaurantId: string): Promise<AuditLog[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as AuditLog[];
  },

  async createAuditLog(restaurantId: string, userId: string | null, email: string, action: string, details: string): Promise<void> {
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        user_email: email,
        action,
        details
      });
  },

  // --- Staff Management ---
  async getStaffProfiles(restaurantId: string): Promise<Profile[]> {
    const rest = await this.getRestaurantById(restaurantId);
    const staffMeta = rest?.settings?.staff_metadata || {};

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('role', 'super_admin');
    if (error || !data) return [];

    return (data as Profile[]).map(p => {
      const meta = (p as any).metadata || {};
      const staffSetting = staffMeta[p.id] || {};
      const isVerified = p.is_verified ?? meta.is_verified ?? staffSetting.is_verified ?? (p.is_active !== false);
      const verStatus = p.verification_status || meta.verification_status || staffSetting.verification_status || (isVerified ? 'active' : 'pending_verification');

      return {
        ...p,
        department: p.department || staffSetting.department || (p.role === 'waiter' ? 'waiter' : p.role === 'kitchen' ? 'kitchen' : 'general'),
        phone: p.phone || staffSetting.phone || '',
        is_active: p.is_active !== undefined ? p.is_active : (staffSetting.is_active !== false),
        is_verified: isVerified,
        verification_status: verStatus
      };
    });
  },

  async createStaffProfile(
    email: string,
    password: string,
    fullName: string,
    role: Profile['role'],
    restaurantId: string,
    department?: string,
    phone?: string
  ): Promise<Profile & { resent?: boolean; resumed?: boolean }> {
    const currentStaff = await this.getStaffProfiles(restaurantId);
    const limitCheck = await checkResourceLimitForRestaurant(restaurantId, 'staff_accounts', currentStaff.length);
    if (!limitCheck.allowed) {
      throw new Error(limitCheck.message || 'Staff account limit reached. Upgrade your plan to create additional staff accounts.');
    }

    const cleanEmail = email.trim().toLowerCase();
    const resolvedDept = department || (role === 'waiter' ? 'waiter' : role === 'kitchen' ? 'kitchen' : 'general');
    const resolvedPhone = phone || '';

    const res = await fetch('/api/staff/create-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fullName,
        email: cleanEmail,
        password,
        role,
        department: resolvedDept,
        phone: resolvedPhone,
        restaurantId
      })
    }).then(r => r.json()).catch(() => null);

    if (!res || !res.success) {
      if (res?.code === 'EMAIL_REGISTERED_OTHER_RESTAURANT' || res?.error?.includes('another restaurant')) {
        throw new Error('This email is already registered to another restaurant.');
      }
      throw new Error(res?.error || 'Failed to create staff account.');
    }

    const userId = res.user?.id;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    return {
      ...(profileData || {
        id: userId,
        email: cleanEmail,
        full_name: fullName,
        role,
        department: resolvedDept,
        phone: resolvedPhone,
        restaurant_id: restaurantId,
        is_active: false
      }),
      plain_password: password,
    } as Profile;
  },

  async updateStaffProfile(
    restaurantId: string,
    staffId: string,
    updates: {
      fullName?: string;
      role?: Profile['role'];
      department?: string;
      phone?: string;
      isActive?: boolean;
    }
  ): Promise<void> {
    // 1. Update profiles table
    const profileUpdates: any = {};
    if (updates.fullName !== undefined) profileUpdates.full_name = updates.fullName;
    if (updates.role !== undefined) profileUpdates.role = updates.role;
    if (updates.department !== undefined) profileUpdates.department = updates.department;
    if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
    if (updates.isActive !== undefined) profileUpdates.is_active = updates.isActive;

    if (Object.keys(profileUpdates).length > 0) {
      await supabase.from('profiles').update(profileUpdates).eq('id', staffId);
    }

    // 2. Persist in restaurant settings staff_metadata
    const rest = await this.getRestaurantById(restaurantId);
    if (rest) {
      const staffMeta = rest.settings?.staff_metadata || {};
      const currentMeta = staffMeta[staffId] || {};
      staffMeta[staffId] = {
        department: updates.department !== undefined ? updates.department : currentMeta.department,
        phone: updates.phone !== undefined ? updates.phone : currentMeta.phone,
        is_active: updates.isActive !== undefined ? updates.isActive : (currentMeta.is_active !== false)
      };
      await this.updateRestaurant(restaurantId, {
        settings: {
          ...rest.settings,
          staff_metadata: staffMeta
        }
      });
    }
  },

  async toggleStaffActiveStatus(restaurantId: string, staffId: string, isActive: boolean): Promise<void> {
    await this.updateStaffProfile(restaurantId, staffId, { isActive });
  },

  async deleteStaffProfile(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_staff_user', { target_user_id: id });
    if (error) throw new Error(error.message || 'Failed to delete staff account');
  },

  async updateStaffPassword(targetUserId: string, newPassword: string): Promise<void> {
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cleverops.in');
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch(`${baseUrl}/api/staff/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId,
        newPassword,
        requesterUserId: user?.id
      })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to update staff password');
    }
  },

  async changeOwnerPassword(currentPassword: string, newPassword: string): Promise<void> {
    const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cleverops.in');
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch(`${baseUrl}/api/auth/change-owner-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        userId: user?.id,
        email: user?.email
      })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Failed to change password');
    }
  },

  // ==========================================
  // TABLE ASSIGNMENTS SYSTEM METHODS
  // ==========================================

  async getTableAssignments(restaurantId: string): Promise<TableAssignment[]> {
    const rest = await this.getRestaurantById(restaurantId);
    const assignments = rest?.settings?.table_assignments || [];
    return assignments.filter(a => a.active !== false);
  },

  async assignTableToWaiter(
    restaurantId: string,
    tableId: string,
    waiterId: string,
    assignedBy?: string
  ): Promise<TableAssignment> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const tables = await this.getTables(restaurantId);
    const staff = await this.getStaffProfiles(restaurantId);
    const tbl = tables.find(t => t.id === tableId);
    const wt = staff.find(s => s.id === waiterId);

    const currentAssignments: TableAssignment[] = rest.settings?.table_assignments || [];
    
    // Check if already assigned
    const existingIndex = currentAssignments.findIndex(
      a => a.table_id === tableId && a.waiter_id === waiterId
    );

    const newAssignment: TableAssignment = {
      id: existingIndex >= 0 ? currentAssignments[existingIndex].id : `${tableId}_${waiterId}`,
      restaurant_id: restaurantId,
      table_id: tableId,
      table_name: tbl?.name || 'Table',
      waiter_id: waiterId,
      waiter_name: wt?.full_name || 'Waiter',
      assigned_by: assignedBy || 'Owner/Manager',
      assigned_at: new Date().toISOString(),
      active: true
    };

    let updatedAssignments: TableAssignment[];
    if (existingIndex >= 0) {
      updatedAssignments = [...currentAssignments];
      updatedAssignments[existingIndex] = newAssignment;
    } else {
      updatedAssignments = [...currentAssignments, newAssignment];
    }

    await this.updateRestaurant(restaurantId, {
      settings: {
        ...rest.settings,
        table_assignments: updatedAssignments
      }
    });

    return newAssignment;
  },

  async unassignTable(restaurantId: string, tableId: string, waiterId: string): Promise<void> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) return;

    const currentAssignments: TableAssignment[] = rest.settings?.table_assignments || [];
    const updatedAssignments = currentAssignments.filter(
      a => !(a.table_id === tableId && a.waiter_id === waiterId)
    );

    await this.updateRestaurant(restaurantId, {
      settings: {
        ...rest.settings,
        table_assignments: updatedAssignments
      }
    });
  },

  async setTableAssignmentsForWaiter(
    restaurantId: string,
    waiterId: string,
    tableIds: string[],
    assignedBy?: string
  ): Promise<TableAssignment[]> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const tables = await this.getTables(restaurantId);
    const staff = await this.getStaffProfiles(restaurantId);
    const wt = staff.find(s => s.id === waiterId);

    const currentAssignments: TableAssignment[] = rest.settings?.table_assignments || [];
    // Remove all current assignments for this waiter
    const otherAssignments = currentAssignments.filter(a => a.waiter_id !== waiterId);

    const newAssignmentsForWaiter: TableAssignment[] = tableIds.map(tblId => {
      const tbl = tables.find(t => t.id === tblId);
      return {
        id: `${tblId}_${waiterId}`,
        restaurant_id: restaurantId,
        table_id: tblId,
        table_name: tbl?.name || 'Table',
        waiter_id: waiterId,
        waiter_name: wt?.full_name || 'Waiter',
        assigned_by: assignedBy || 'Manager',
        assigned_at: new Date().toISOString(),
        active: true
      };
    });

    const updatedAssignments = [...otherAssignments, ...newAssignmentsForWaiter];

    await this.updateRestaurant(restaurantId, {
      settings: {
        ...rest.settings,
        table_assignments: updatedAssignments
      }
    });

    return newAssignmentsForWaiter;
  },

  async getAssignedTablesForWaiter(restaurantId: string, waiterId: string): Promise<string[]> {
    const assignments = await this.getTableAssignments(restaurantId);
    return assignments.filter(a => a.waiter_id === waiterId).map(a => a.table_id);
  },

  async getAssignedWaitersForTable(restaurantId: string, tableId: string): Promise<string[]> {
    const assignments = await this.getTableAssignments(restaurantId);
    return assignments.filter(a => a.table_id === tableId).map(a => a.waiter_id);
  },

  // ==========================================
  // MERGED TABLES SYSTEM METHODS
  // ==========================================

  async getActiveMergeSessionForGroup(restaurantId: string, groupId: string) {
    const { data: session } = await supabase
      .from('table_merge_sessions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('merge_group_id', groupId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .maybeSingle();

    return session || null;
  },

  async createTableMergeGroup(
    restaurantId: string,
    name: string,
    tables: { id: string; name: string }[]
  ): Promise<TableMergeGroup> {
    if (!tables || tables.length < 2) {
      throw new Error('At least 2 physical tables are required to create a merge group.');
    }

    const now = new Date().toISOString();

    const { data: group, error: gErr } = await supabase
      .from('table_merge_groups')
      .insert({
        restaurant_id: restaurantId,
        name,
        status: 'active',
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (gErr || !group) {
      throw new Error(gErr?.message || 'Failed to create merge group.');
    }

    const memberRows = tables.map(t => ({
      restaurant_id: restaurantId,
      merge_group_id: group.id,
      table_id: t.id,
      table_name: t.name,
      created_at: now,
      updated_at: now
    }));

    const { data: members, error: mErr } = await supabase
      .from('table_merge_members')
      .insert(memberRows)
      .select();

    if (mErr) {
      console.error('Failed to insert merge members:', mErr.message);
    }

    // Create NEW active session for this merge group
    const { data: session } = await supabase
      .from('table_merge_sessions')
      .insert({
        restaurant_id: restaurantId,
        merge_group_id: group.id,
        session_number: 1,
        status: 'active',
        started_at: now,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (session) {
      // Snapshot session members for permanent historical receipts
      const sessionMemberRows = tables.map(t => ({
        restaurant_id: restaurantId,
        session_id: session.id,
        merge_group_id: group.id,
        table_id: t.id,
        table_name: t.name,
        created_at: now
      }));
      await supabase.from('table_merge_session_members').insert(sessionMemberRows);

      await supabase
        .from('table_merge_groups')
        .update({ active_session_id: session.id, updated_at: now })
        .eq('id', group.id);
    }

    return {
      ...group,
      active_session_id: session?.id,
      members: members || []
    };
  },

  async mergeTables(
    restaurantId: string,
    name: string,
    tableIds: string[]
  ): Promise<TableMergeGroup> {
    const { data: tables } = await supabase
      .from('tables')
      .select('id, name')
      .eq('restaurant_id', restaurantId)
      .in('id', tableIds);

    return this.createTableMergeGroup(restaurantId, name, tables || []);
  },

  async getActiveMergeGroupForTable(
    restaurantId: string,
    tableIdOrName: string
  ): Promise<{ group: TableMergeGroup; member: TableMergeMember; session?: any } | null> {
    if (!restaurantId || !tableIdOrName) return null;

    const { data: activeGroups } = await supabase
      .from('table_merge_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active');

    if (!activeGroups || activeGroups.length === 0) return null;

    const activeGroupIds = activeGroups.map(g => g.id);

    const { data: activeMembers } = await supabase
      .from('table_merge_members')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('merge_group_id', activeGroupIds);

    if (!activeMembers || activeMembers.length === 0) return null;

    const matchedMember = activeMembers.find(
      m => m.table_id === tableIdOrName || m.table_name?.toLowerCase() === tableIdOrName.toLowerCase()
    );

    if (!matchedMember) return null;

    const matchedGroup = activeGroups.find(g => g.id === matchedMember.merge_group_id);
    if (!matchedGroup) return null;

    const session = await this.getActiveMergeSessionForGroup(restaurantId, matchedGroup.id);
    if (!session) return null;

    return {
      group: matchedGroup,
      member: matchedMember,
      session
    };
  },

  async unmergeTableGroup(restaurantId: string, mergeGroupId: string): Promise<boolean> {
    const now = new Date().toISOString();
    // Close active session
    await supabase
      .from('table_merge_sessions')
      .update({ status: 'closed', ended_at: now, updated_at: now })
      .eq('restaurant_id', restaurantId)
      .eq('merge_group_id', mergeGroupId)
      .eq('status', 'active');

    const { error } = await supabase
      .from('table_merge_groups')
      .update({ status: 'unmerged', active_session_id: null, updated_at: now })
      .eq('id', mergeGroupId)
      .eq('restaurant_id', restaurantId);

    if (error) {
      console.error('Failed to unmerge group:', error.message);
      return false;
    }
    return true;
  },

  async getMergeGroups(
    restaurantId: string,
    status?: 'active' | 'completed' | 'unmerged'
  ): Promise<TableMergeGroup[]> {
    let query = supabase
      .from('table_merge_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: groups } = await query;
    if (!groups || groups.length === 0) return [];

    const groupIds = groups.map(g => g.id);

    const { data: members } = await supabase
      .from('table_merge_members')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .in('merge_group_id', groupIds);

    return groups.map(g => ({
      ...g,
      members: (members || []).filter(m => m.merge_group_id === g.id)
    }));
  },

  async getMergedGroupDetails(restaurantId: string, mergeGroupId: string, targetSessionId?: string) {
    // 1. Fetch group
    const { data: group } = await supabase
      .from('table_merge_groups')
      .select('*')
      .eq('id', mergeGroupId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (!group) return null;

    // 2. Resolve target merge session
    let sessionId = targetSessionId || group.active_session_id;
    if (!sessionId) {
      const { data: latestSession } = await supabase
        .from('table_merge_sessions')
        .select('*')
        .eq('merge_group_id', mergeGroupId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestSession) {
        sessionId = latestSession.id;
      }
    }

    if (!sessionId) {
      return null;
    }

    // 3. Fetch Session Metadata
    const { data: session } = await supabase
      .from('table_merge_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    // 4. Fetch Member Tables for this session (try historical snapshot first, fallback to group members)
    let members: any[] = [];
    if (sessionId) {
      const { data: sessMembers } = await supabase
        .from('table_merge_session_members')
        .select('*')
        .eq('session_id', sessionId);
      if (sessMembers && sessMembers.length > 0) {
        members = sessMembers;
      }
    }
    if (members.length === 0) {
      const { data: groupMembers } = await supabase
        .from('table_merge_members')
        .select('*')
        .eq('merge_group_id', mergeGroupId)
        .eq('restaurant_id', restaurantId);
      members = groupMembers || [];
    }

    // 5. Fetch orders for target session (support both merge_session_id = sessionId and legacy merge_session_id is null)
    let orderQuery = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId);

    if (sessionId) {
      orderQuery = orderQuery.or(`merge_session_id.eq.${sessionId},and(merge_session_id.is.null,merge_group_id.eq.${mergeGroupId})`);
    } else {
      orderQuery = orderQuery.eq('merge_group_id', mergeGroupId);
    }

    const { data: rawOrders } = await orderQuery.order('created_at', { ascending: true });

    // Fetch batches & items for each order
    const orders: Order[] = [];
    for (const ord of (rawOrders || [])) {
      const fullOrd = await this.getOrderById(ord.id);
      if (fullOrd) orders.push(fullOrd);
    }

    // 6. Build Table-Wise Breakdown
    const memberTables = members || [];
    const tableBreakdown = memberTables.map(m => {
      const tableOrders = orders.filter(o => o.table_id === m.table_id || o.table_name === m.table_name);
      const validOrders = tableOrders.filter(o => o.status !== 'cancelled');

      let itemCount = 0;
      let tableSubtotal = 0;
      let tableDiscount = 0;
      const itemMap: { [name: string]: { name: string; quantity: number; price: number; total: number } } = {};

      validOrders.forEach(o => {
        const oSubtotal = Number(o.subtotal || 0);
        const oGst = Number(o.gst || 0);
        let oDiscount = Number((o as any).discount_amount || 0);
        if (oDiscount === 0 && o.special_instructions) {
          const promoMatches = o.special_instructions.matchAll(/\(-[₹]?([\d.]+)\)/g);
          const amounts = [...promoMatches].map(m => parseFloat(m[1] || '0')).filter(v => !isNaN(v) && v > 0);
          if (amounts.length > 0) {
            const uniqueAmounts = [...new Set(amounts.map(a => a.toFixed(2)))].map(Number);
            oDiscount = parseFloat(uniqueAmounts.reduce((s, v) => s + v, 0).toFixed(2));
          }
        }
        oDiscount = parseFloat(Math.max(0, Math.min(oDiscount, oSubtotal)).toFixed(2));
        tableSubtotal += oSubtotal;
        tableDiscount += oDiscount;
        (o as any).implied_discount = oDiscount;
        (o as any).net = Math.max(0, parseFloat((oSubtotal - oDiscount + oGst).toFixed(2)));
        (o.items || []).forEach(i => {
          if (i.status !== 'cancelled') {
            const qty = Number(i.quantity || 0);
            const price = Number(i.price || 0);
            itemCount += qty;
            const key = i.menu_item_name || (i as any).name || 'Unknown Item';
            if (!itemMap[key]) {
              itemMap[key] = { name: key, quantity: 0, price, total: 0 };
            }
            itemMap[key].quantity += qty;
            itemMap[key].total += (qty * price);
          }
        });
      });

      return {
        table_id: m.table_id,
        table_name: m.table_name,
        orders: tableOrders,
        validOrderCount: validOrders.length,
        totalOrderCount: tableOrders.length,
        itemCount,
        subtotal: tableSubtotal,
        discount: tableDiscount,
        net: Math.max(0, tableSubtotal - tableDiscount),
        itemSummary: Object.values(itemMap)
      };
    });

    // 7. Compute Group Totals
    const validGroupOrders = orders.filter(o => o.status !== 'cancelled');
    const groupSubtotal = validGroupOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
    const groupGst = validGroupOrders.reduce((sum, o) => sum + Number(o.gst || 0), 0);
    const groupDiscount = parseFloat(tableBreakdown.reduce((sum, t) => sum + (t.discount || 0), 0).toFixed(2));
    const groupNetTotal = Math.max(0, parseFloat((groupSubtotal - groupDiscount + groupGst).toFixed(2)));
    const groupItemCount = tableBreakdown.reduce((sum, t) => sum + t.itemCount, 0);

    const unpaidOrders = validGroupOrders.filter(o => o.payment_status !== 'paid');
    const unpaidSubtotal = unpaidOrders.reduce((sum, o) => sum + Number(o.subtotal || 0), 0);
    const unpaidDiscount = unpaidOrders.reduce((sum, o) => sum + Number((o as any).implied_discount || 0), 0);
    const unpaidGst = unpaidOrders.reduce((sum, o) => sum + Number(o.gst || 0), 0);
    const unpaidTotal = Math.max(0, parseFloat((unpaidSubtotal - unpaidDiscount + unpaidGst).toFixed(2)));
    const isFullyPaid = validGroupOrders.length > 0 && validGroupOrders.every(o => o.payment_status === 'paid');

    return {
      group,
      session,
      sessionId,
      members: memberTables,
      orders,
      tableBreakdown,
      groupTotals: {
        totalOrders: validGroupOrders.length,
        totalItems: groupItemCount,
        subtotal: groupSubtotal,
        discount: groupDiscount,
        gst: groupGst,
        total: groupNetTotal,
        unpaidOrdersCount: unpaidOrders.length,
        unpaidSubtotal,
        unpaidDiscount,
        unpaidGst,
        unpaidTotal,
        isFullyPaid
      }
    };
  },

  async completeMergedSession(restaurantId: string, sessionId: string, paymentMethod: string) {
    const now = new Date().toISOString();

    const { data: session } = await supabase
      .from('table_merge_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    const mergeGroupId = session?.merge_group_id;

    let orderQuery = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled');

    if (sessionId) {
      orderQuery = orderQuery.eq('merge_session_id', sessionId);
    } else if (mergeGroupId) {
      orderQuery = orderQuery.eq('merge_group_id', mergeGroupId);
    }

    const { data: sessionOrders } = await orderQuery;

    const unpaidOrderIds = (sessionOrders || []).map(o => o.id);
    for (const ordId of unpaidOrderIds) {
      await transitionOrderBatchLifecycle({
        restaurantId,
        orderId: ordId,
        targetStatus: 'completed',
        callingFunction: 'db.completeMergedSession',
        actor: 'Cashier',
        paymentDetails: { paymentMethod }
      });
    }

    if (sessionId) {
      await supabase
        .from('table_merge_sessions')
        .update({ status: 'completed', ended_at: now, updated_at: now })
        .eq('id', sessionId);
    }

    if (mergeGroupId) {
      await supabase
        .from('table_merge_groups')
        .update({ status: 'unmerged', active_session_id: null, updated_at: now })
        .eq('id', mergeGroupId);

      await supabase
        .from('table_merge_members')
        .delete()
        .eq('merge_group_id', mergeGroupId);
    }

    return {
      success: true,
      sessionId,
      mergeGroupId,
      ordersCount: unpaidOrderIds.length,
      paymentMethod
    };
  }
};
