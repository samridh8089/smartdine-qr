// Database Service Layer communicating directly with Supabase
import { supabase } from './supabase';

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
  };
  subscription_plan: 'starter' | 'pro' | 'premium';
  subscription_status: 'active' | 'trial' | 'past_due' | 'cancelled';
  trial_ends_at: string;
  created_at: string;
  billing_interval: 'monthly' | 'yearly';
}

export interface Profile {
  id: string;
  restaurant_id: string | null;
  email: string;
  full_name: string;
  role: 'owner' | 'manager' | 'waiter' | 'kitchen' | 'cashier' | 'super_admin';
}

export interface PricingPlan {
  id: 'starter' | 'pro' | 'premium';
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  created_at?: string;
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
}

export interface Table {
  id: string;
  restaurant_id: string;
  name: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_name?: string;
  status: 'new' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  special_instructions?: string;
  subtotal: number;
  gst: number;
  service_charge: number;
  total: number;
  created_at: string;
  items: OrderItem[];
}

export const PLAN_LIMITS = {
  starter: { maxTables: 5, maxItems: 15 },
  pro: { maxTables: 20, maxItems: 50 },
  premium: { maxTables: 9999, maxItems: 9999 }
};

export const db = {
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
    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Restaurant not found');
    }
    return updated[0] as Restaurant;
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
    const cats = await this.getCategories(restaurantId);
    const sortOrder = cats.length + 1;
    const { data, error } = await supabase
      .from('categories')
      .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder })
      .select();
    if (error || !data || data.length === 0) {
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
    return data as MenuItem[];
  },

  async createMenuItem(restaurantId: string, data: Omit<MenuItem, 'id' | 'restaurant_id'>): Promise<MenuItem> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const currentItems = await this.getMenuItems(restaurantId);
    const plan = rest.subscription_plan;
    const limit = PLAN_LIMITS[plan].maxItems;
    if (currentItems.length >= limit) {
      throw new Error(`Your ${plan.toUpperCase()} plan limits you to ${limit} menu items. Please upgrade to add more.`);
    }

    const { data: inserted, error } = await supabase
      .from('menu_items')
      .insert({ ...data, restaurant_id: restaurantId })
      .select();
    if (error || !inserted || inserted.length === 0) {
      throw new Error(error?.message || 'Failed to create menu item');
    }
    return inserted[0] as MenuItem;
  },

  async updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem> {
    const { data: updated, error } = await supabase
      .from('menu_items')
      .update(data)
      .eq('id', id)
      .select();
    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Menu item not found');
    }
    return updated[0] as MenuItem;
  },

  async deleteMenuItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // --- Tables CRUD ---
  async getTables(restaurantId: string): Promise<Table[]> {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId);
    if (error || !data) return [];
    return data as Table[];
  },

  async createTable(restaurantId: string, name: string): Promise<Table> {
    const rest = await this.getRestaurantById(restaurantId);
    if (!rest) throw new Error('Restaurant not found');

    const currentTables = await this.getTables(restaurantId);
    const plan = rest.subscription_plan;
    const limit = PLAN_LIMITS[plan].maxTables;
    if (currentTables.length >= limit) {
      throw new Error(`Your ${plan.toUpperCase()} plan limits you to ${limit} tables. Please upgrade to add more.`);
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

  // --- Orders ---
  async getOrders(restaurantId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    return data.map((o: any) => ({
      id: o.id,
      restaurant_id: o.restaurant_id,
      table_id: o.table_id,
      table_name: o.table_name || 'Table',
      status: o.status,
      special_instructions: o.special_instructions,
      subtotal: Number(o.subtotal),
      gst: Number(o.gst),
      service_charge: Number(o.service_charge),
      total: Number(o.total),
      created_at: o.created_at,
      items: (o.order_items || []).map((oi: any) => ({
        id: oi.id,
        order_id: oi.order_id,
        menu_item_id: oi.menu_item_id,
        menu_item_name: oi.menu_item_name || 'Unknown Item',
        quantity: oi.quantity,
        price: Number(oi.price),
        notes: oi.notes
      }))
    })) as Order[];
  },

  async getOrderById(id: string): Promise<Order | null> {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id);
    if (error || !data || data.length === 0) return null;

    const o = data[0];
    return {
      id: o.id,
      restaurant_id: o.restaurant_id,
      table_id: o.table_id,
      table_name: o.table_name || 'Table',
      status: o.status,
      special_instructions: o.special_instructions,
      subtotal: Number(o.subtotal),
      gst: Number(o.gst),
      service_charge: Number(o.service_charge),
      total: Number(o.total),
      created_at: o.created_at,
      items: (o.order_items || []).map((oi: any) => ({
        id: oi.id,
        order_id: oi.order_id,
        menu_item_id: oi.menu_item_id,
        menu_item_name: oi.menu_item_name || 'Unknown Item',
        quantity: oi.quantity,
        price: Number(oi.price),
        notes: oi.notes
      }))
    } as Order;
  },

  async createOrder(
    restaurantId: string,
    tableId: string,
    items: { menuItemId: string; quantity: number; notes?: string }[],
    specialInstructions?: string
  ): Promise<Order> {
    const restaurant = await this.getRestaurantById(restaurantId);
    if (!restaurant) throw new Error('Restaurant not found');

    const tables = await this.getTables(restaurantId);
    const table = tables.find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

    const allItems = await this.getMenuItems(restaurantId);

    let subtotal = 0;
    const itemsPayload: any[] = [];

    // Calculate subtotal and build items list
    for (const entry of items) {
      const menuItem = allItems.find(i => i.id === entry.menuItemId);
      if (!menuItem) throw new Error(`Item ${entry.menuItemId} not found`);

      subtotal += menuItem.price * entry.quantity;
      itemsPayload.push({
        menu_item_id: menuItem.id,
        menu_item_name: menuItem.name,
        quantity: entry.quantity,
        price: menuItem.price,
        notes: entry.notes
      });
    }

    const gst = parseFloat(((subtotal * (restaurant.settings.gst_percentage || 0)) / 100).toFixed(2));
    const serviceCharge = parseFloat(((subtotal * (restaurant.settings.service_charge_percentage || 0)) / 100).toFixed(2));
    const total = parseFloat((subtotal + gst + serviceCharge).toFixed(2));

    // 1. Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_name: table.name,
        status: 'new',
        special_instructions: specialInstructions,
        subtotal,
        gst,
        service_charge: serviceCharge,
        total
      })
      .select();

    if (orderError || !orderData || orderData.length === 0) {
      throw new Error(orderError?.message || 'Failed to submit order');
    }

    const newOrder = orderData[0];

    // 2. Insert order items
    const finalItemsPayload = itemsPayload.map(item => ({
      order_id: newOrder.id,
      ...item
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .insert(finalItemsPayload)
      .select();

    if (itemsError) {
      // Clean up orphaned order if items fail
      await supabase.from('orders').delete().eq('id', newOrder.id);
      throw new Error(itemsError.message || 'Failed to submit order items');
    }

    return {
      id: newOrder.id,
      restaurant_id: newOrder.restaurant_id,
      table_id: newOrder.table_id,
      table_name: newOrder.table_name,
      status: newOrder.status,
      special_instructions: newOrder.special_instructions,
      subtotal: Number(newOrder.subtotal),
      gst: Number(newOrder.gst),
      service_charge: Number(newOrder.service_charge),
      total: Number(newOrder.total),
      created_at: newOrder.created_at,
      items: itemsData.map((oi: any) => ({
        id: oi.id,
        order_id: oi.order_id,
        menu_item_id: oi.menu_item_id,
        menu_item_name: oi.menu_item_name,
        quantity: oi.quantity,
        price: Number(oi.price),
        notes: oi.notes
      }))
    };
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select();

    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Order not found');
    }

    const fullOrder = await this.getOrderById(id);
    if (!fullOrder) throw new Error('Order not found');
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
      const status = r.subscription_status || 'trial';
      const interval = (r.billing_interval || 'monthly') as 'monthly' | 'yearly';
      const trialEnds = new Date(r.trial_ends_at);
      const isTrialExpired = status === 'trial' && trialEnds < now;
      const isCancelled = status === 'cancelled' || status === 'past_due';

      if (status === 'active') {
        totalPaidCustomers += 1;
        activeLicenses += 1;
        const price = getPlanPrice(plan, interval);
        if (interval === 'yearly') {
          mrr += price / 12;
        } else {
          mrr += price;
        }
      } else if (status === 'trial' && !isTrialExpired) {
        trialUsers += 1;
        activeLicenses += 1;
      } else if (isTrialExpired || isCancelled) {
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

  async updateRestaurantPlan(id: string, plan: 'starter' | 'pro' | 'premium', status: Restaurant['subscription_status']): Promise<Restaurant> {
    const trialEndsAt = status === 'active' 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() 
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update({
        subscription_plan: plan,
        subscription_status: status,
        trial_ends_at: trialEndsAt
      })
      .eq('id', id)
      .select();

    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Restaurant not found');
    }

    return updated[0] as Restaurant;
  },

  // --- Pricing Plans CRUD ---
  async getPricingPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
      .from('pricing_plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    if (error || !data || data.length === 0) {
      return [
        { id: 'starter', name: 'Starter', price_monthly: 299, price_yearly: 2990, features: ['Up to 5 tables', 'Up to 15 menu items', 'Standard KDS', 'QR Code Generation'] },
        { id: 'pro', name: 'Pro', price_monthly: 799, price_yearly: 7990, features: ['Up to 20 tables', 'Up to 50 menu items', 'Premium KDS', 'Analytics Dashboard', 'Waiter Panel', 'Real-time Alerts'] },
        { id: 'premium', name: 'Premium', price_monthly: 1499, price_yearly: 14990, features: ['Unlimited tables', 'Unlimited menu items', 'Priority Support', 'Branding settings', 'Real-time Analytics', 'Waiter & Kitchen Panels'] }
      ];
    }
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      price_monthly: Number(d.price_monthly),
      price_yearly: Number(d.price_yearly),
      features: Array.isArray(d.features) ? d.features : JSON.parse(d.features || '[]')
    })) as PricingPlan[];
  },

  async updatePricingPlan(id: string, data: Partial<PricingPlan>): Promise<PricingPlan> {
    const { data: updated, error } = await supabase
      .from('pricing_plans')
      .update(data)
      .eq('id', id)
      .select();
    if (error || !updated || updated.length === 0) {
      throw new Error(error?.message || 'Pricing plan not found');
    }
    return updated[0] as PricingPlan;
  },

  // --- Deletion ---
  async deleteRestaurant(restaurantId: string): Promise<void> {
    // Delete profiles first
    await supabase.from('profiles').delete().eq('restaurant_id', restaurantId);
    // Delete restaurant (which cascades to tables, categories, menu items, orders, order items)
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
    const tables = await this.getTables(restaurantId);
    const table = tables.find(t => t.id === tableId);
    if (!table) throw new Error('Table not found');

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
    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to submit call request');
    }
    return data[0] as CustomerRequest;
  },

  async acceptCustomerRequest(requestId: string): Promise<CustomerRequest> {
    const { data, error } = await supabase
      .from('customer_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select();
    if (error || !data || data.length === 0) {
      throw new Error(error?.message || 'Failed to accept request');
    }
    return data[0] as CustomerRequest;
  },

  async resolveCustomerRequest(requestId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_requests')
      .update({ status: 'completed' })
      .eq('id', requestId);
    if (error) throw new Error(error.message);
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('role', 'super_admin');
    if (error || !data) return [];
    return data as Profile[];
  },

  async createStaffProfile(email: string, password: string, fullName: string, role: Profile['role'], restaurantId: string): Promise<Profile> {
    const { createClient } = await import('@supabase/supabase-js');
    const tempSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Sign up via the temporary client so it doesn't affect active session
    const { data, error } = await tempSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName,
          role,
          restaurant_id: restaurantId
        }
      }
    });
    
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Failed to create staff auth user');
    
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
       
    if (profileErr || !profileData) {
      throw new Error(profileErr?.message || 'Staff profile sync failed');
    }
    return profileData as Profile;
  }
};
