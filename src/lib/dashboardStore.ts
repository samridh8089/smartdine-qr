import { db, Order, Table, MenuItem, Category, PricingPlan, RestaurantZone } from '@/lib/db';
import { supabase } from '@/lib/supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 60000; // 60 seconds

class DashboardStore {
  private ordersCache = new Map<string, CacheEntry<Order[]>>();
  private tablesCache = new Map<string, CacheEntry<{ tables: Table[]; stats: any; mergeGroups: any[]; assignments: any[]; zones?: RestaurantZone[] }>>();
  private menuCache = new Map<string, CacheEntry<{ categories: Category[]; menuItems: MenuItem[] }>>();
  private billingCache = new Map<string, CacheEntry<{ tablesCount: number; itemsCount: number; staffCount: number; invCount: number; plans: PricingPlan[] }>>();
  private overviewCache = new Map<string, CacheEntry<any>>();
  private inFlightTables = new Map<string, Promise<{ tables: Table[]; stats: any; mergeGroups: any[]; assignments: any[]; zones?: RestaurantZone[] }>>();
  private inFlightBilling = new Map<string, Promise<{ tablesCount: number; itemsCount: number; staffCount: number; invCount: number; plans: PricingPlan[] }>>();
  private qrCache = new Map<string, string>();

  // QR Code Cache
  getCachedQR(key: string): string | undefined {
    return this.qrCache.get(key);
  }

  setCachedQR(key: string, dataUrl: string) {
    this.qrCache.set(key, dataUrl);
  }

  getCachedTableQRs(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const [k, v] of this.qrCache.entries()) {
      if (k.startsWith('table:')) {
        map[k.substring(6)] = v;
      }
    }
    return map;
  }

  // Deduplicated tables fetching
  fetchTablesDeduplicated(restId: string, force: boolean = false): Promise<{ tables: Table[]; stats: any; mergeGroups: any[]; assignments: any[]; zones?: RestaurantZone[] }> {
    if (!force && this.inFlightTables.has(restId)) {
      return this.inFlightTables.get(restId)!;
    }

    const promise = (async () => {
      try {
        const cachedOrders = force ? undefined : (this.getCachedOrders(restId) || undefined);
        const [live, groups] = await Promise.all([
          db.getTablesWithLiveStatus(restId, cachedOrders),
          db.getMergeGroups(restId, 'active')
        ]);
        const assignments = live?.assignments || [];
        const result = {
          tables: live?.tables || [],
          stats: live?.stats || { total: 0, available: 0, occupied: 0, inactive: 0, occupancyRate: 0 },
          mergeGroups: groups || [],
          assignments,
          zones: live?.zones || []
        };
        this.setCachedTables(restId, result);
        return result;
      } finally {
        this.inFlightTables.delete(restId);
      }
    })();

    this.inFlightTables.set(restId, promise);
    return promise;
  }

  // Deduplicated billing metrics fetching
  fetchBillingDeduplicated(restId: string, force: boolean = false): Promise<{ tablesCount: number; itemsCount: number; staffCount: number; invCount: number; plans: PricingPlan[] }> {
    if (!force && this.inFlightBilling.has(restId)) {
      return this.inFlightBilling.get(restId)!;
    }

    const promise = (async () => {
      try {
        const getHeadCount = async (tableName: string, fallback: number = 0): Promise<number> => {
          try {
            const { count } = await supabase.from(tableName).select('id', { count: 'exact', head: true }).eq('restaurant_id', restId);
            return count ?? fallback;
          } catch {
            return fallback;
          }
        };

        // 1. Fast count for tables (from cache if present, else lightweight head count)
        const cachedTables = this.getCachedTables(restId);
        const tablesPromise = cachedTables
          ? Promise.resolve(cachedTables.tables.length)
          : getHeadCount('tables', 0);

        // 2. Fast count for menu items (from cache if present, else lightweight head count)
        const cachedMenu = this.getCachedMenu(restId);
        const itemsPromise = cachedMenu
          ? Promise.resolve(cachedMenu.menuItems.length)
          : getHeadCount('menu_items', 0);

        // 3. Fast count for staff profiles
        const staffPromise = getHeadCount('profiles', 1);

        // 4. Fast count for inventory items
        const invPromise = getHeadCount('inventory_items', 0);

        // 5. Pricing plans
        const plansPromise = db.getPricingPlans().catch(() => []);

        const [tablesCount, itemsCount, staffCount, invCount, plans] = await Promise.all([
          tablesPromise,
          itemsPromise,
          staffPromise,
          invPromise,
          plansPromise
        ]);

        const result = {
          tablesCount,
          itemsCount,
          staffCount,
          invCount,
          plans: plans || []
        };

        this.setCachedBilling(restId, result);
        return result;
      } finally {
        this.inFlightBilling.delete(restId);
      }
    })();

    this.inFlightBilling.set(restId, promise);
    return promise;
  }

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
      if (routePath === '/dashboard' || routePath.endsWith('/dashboard')) {
        if (!this.getCachedOverview(restId)) {
          Promise.all([
            db.getOrders(restId),
            db.getTablesWithLiveStatus(restId)
          ]).then(([allOrders, liveTableData]) => {
            if (allOrders) {
              const now = new Date();
              const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
              const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
              const todayOrders = allOrders.filter(o => {
                const t = new Date(o.created_at).getTime();
                return t >= startOfDay && t <= endOfDay && o.status !== 'cancelled';
              });
              const revenue = todayOrders.reduce((sum, o) => sum + Number((o as any).total_amount || (o as any).total || 0), 0);
              const activeOrders = allOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
              const activeTableMap = new Map<string, string>();
              activeOrders.forEach(o => {
                if (o.table_name && o.order_type !== 'takeaway' && o.order_type !== 'reservation') {
                  activeTableMap.set(o.table_id || o.table_name, o.table_name);
                }
              });
              this.setCachedOverview(restId, {
                orders: allOrders,
                stats: {
                  totalOrders: todayOrders.length,
                  revenue,
                  activeTablesCount: activeTableMap.size,
                  activeTableNames: Array.from(activeTableMap.values()),
                  topItems: []
                },
                tableOccupancy: liveTableData?.stats || { total: 0, available: 0, occupied: 0, inactive: 0, occupancyRate: 0 }
              });
            }
          }).catch(() => {});
        }
      } else if (routePath.includes('/orders') || routePath.includes('/kds')) {
        if (!this.getCachedOrders(restId)) {
          db.getOrders(restId).then(orders => {
            if (orders) this.setCachedOrders(restId, orders);
          }).catch(() => {});
        }
      } else if (routePath.includes('/tables')) {
        if (!this.getCachedTables(restId)) {
          this.fetchTablesDeduplicated(restId).catch(() => {});
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
      } else if (routePath.includes('/billing')) {
        if (!this.getCachedBilling(restId)) {
          this.fetchBillingDeduplicated(restId).catch(() => {});
        }
      }
    } catch (e) {}
  }
}

export const dashboardStore = new DashboardStore();
