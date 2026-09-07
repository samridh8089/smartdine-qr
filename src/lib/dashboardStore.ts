import { db, Order, Table, MenuItem, Category, PricingPlan } from '@/lib/db';
import { supabase } from '@/lib/supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 60000; // 60 seconds

class DashboardStore {
  private ordersCache = new Map<string, CacheEntry<Order[]>>();
  private tablesCache = new Map<string, CacheEntry<{ tables: Table[]; stats: any; mergeGroups: any[]; assignments: any[] }>>();
  private menuCache = new Map<string, CacheEntry<{ categories: Category[]; menuItems: MenuItem[] }>>();
  private billingCache = new Map<string, CacheEntry<{ tablesCount: number; itemsCount: number; staffCount: number; invCount: number; plans: PricingPlan[] }>>();
  private overviewCache = new Map<string, CacheEntry<any>>();

  // Orders
  getCachedOrders(restId: string): Order[] | null {
    const entry = this.ordersCache.get(restId);
    if (!entry) return null;
    return entry.data;
  }

  setCachedOrders(restId: string, orders: Order[]) {
    this.ordersCache.set(restId, { data: orders, timestamp: Date.now() });
  }

  // Tables
  getCachedTables(restId: string) {
    const entry = this.tablesCache.get(restId);
    if (!entry) return null;
    return entry.data;
  }

  setCachedTables(restId: string, data: { tables: Table[]; stats: any; mergeGroups: any[]; assignments: any[] }) {
    this.tablesCache.set(restId, { data, timestamp: Date.now() });
  }

  // Menu
  getCachedMenu(restId: string) {
    const entry = this.menuCache.get(restId);
    if (!entry) return null;
    return entry.data;
  }

  setCachedMenu(restId: string, data: { categories: Category[]; menuItems: MenuItem[] }) {
    this.menuCache.set(restId, { data, timestamp: Date.now() });
  }

  // Billing
  getCachedBilling(restId: string) {
    const entry = this.billingCache.get(restId);
    if (!entry) return null;
    return entry.data;
  }

  setCachedBilling(restId: string, data: { tablesCount: number; itemsCount: number; staffCount: number; invCount: number; plans: PricingPlan[] }) {
    this.billingCache.set(restId, { data, timestamp: Date.now() });
  }

  // Overview
  getCachedOverview(restId: string) {
    const entry = this.overviewCache.get(restId);
    if (!entry) return null;
    return entry.data;
  }

  setCachedOverview(restId: string, data: any) {
    this.overviewCache.set(restId, { data, timestamp: Date.now() });
  }

  // Prewarm route data on hover/touch
  prewarmRoute(routePath: string, restId?: string) {
    if (!restId) return;
    try {
      if (routePath.includes('/orders') || routePath.includes('/kds')) {
        if (!this.getCachedOrders(restId)) {
          db.getOrders(restId).then(orders => {
            if (orders) this.setCachedOrders(restId, orders);
          }).catch(() => {});
        }
      } else if (routePath.includes('/tables')) {
        if (!this.getCachedTables(restId)) {
          Promise.all([
            db.getTablesWithLiveStatus(restId),
            db.getMergeGroups(restId, 'active'),
            db.getTableAssignments(restId)
          ]).then(([live, groups, assigns]) => {
            if (live) {
              this.setCachedTables(restId, {
                tables: live.tables,
                stats: live.stats,
                mergeGroups: groups || [],
                assignments: assigns || []
              });
            }
          }).catch(() => {});
        }
      } else if (routePath.includes('/menu')) {
        if (!this.getCachedMenu(restId)) {
          Promise.all([
            db.getCategories(restId),
            db.getMenuItems(restId)
          ]).then(([categories, menuItems]) => {
            if (categories && menuItems) {
              this.setCachedMenu(restId, { categories, menuItems });
            }
          }).catch(() => {});
        }
      }
    } catch (e) {}
  }
}

export const dashboardStore = new DashboardStore();
