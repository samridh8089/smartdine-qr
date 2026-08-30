'use client';

import { useState, useEffect, useRef } from 'react';
import { db, Order, MenuItem } from '@/lib/db';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice, formatDate, getFormattedOrderId } from '@/lib/utils';
import { formatExactTimestamp } from '@/lib/timestamp';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { 
  DollarSign, ClipboardList, Users, TrendingUp, 
  ArrowRight, Clock, CheckCircle2, AlertCircle, ShoppingBag
} from 'lucide-react';

import { calculateBillingTotals } from '@/lib/billingEngine';
import { useRestaurant } from '../layout';

export default function DashboardPage() {
  const { restaurant: contextRestaurant, profile: contextProfile } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurant, setRestaurant] = useState<any>(contextRestaurant);
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    activeTablesCount: 0,
    activeTableNames: [] as string[],
    topItems: [] as { name: string; count: number; revenue: number }[]
  });
  const [tableOccupancy, setTableOccupancy] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    inactive: 0,
    occupancyRate: 0
  });
  const [loading, setLoading] = useState(true);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const loadDataForRest = async (restId: string) => {
    try {
      const activeRest = restaurant || contextRestaurant || (await db.getRestaurantById(restId));
      if (!restaurant && activeRest) setRestaurant(activeRest);

      // Phase 1: Fast Parallel Fetch of Core Orders & Table Live Status
      const [allOrders, liveTableData] = await Promise.all([
        db.getOrders(restId),
        db.getTablesWithLiveStatus(restId)
      ]);

      setOrders(allOrders);
      if (liveTableData?.stats) {
        setTableOccupancy(liveTableData.stats);
      }

      const getValidOrderTotal = (o: Order) => {
        const calcResult = calculateBillingTotals({
          items: o.items || [],
          batches: o.batches || [],
          discountAmount: Number(o.discount_amount || 0),
          offerCode: o.offer_code,
          specialInstructions: o.special_instructions,
          offers: activeRest?.settings?.offers || [],
          gstEnabled: activeRest?.settings?.gst_enabled !== false,
          gstPercentage: activeRest?.settings?.gst_percentage || 0,
          serviceChargeEnabled: activeRest?.settings?.service_charge_enabled !== false,
          serviceChargePercentage: activeRest?.settings?.service_charge_percentage || 0,
          customCharges: activeRest?.settings?.custom_charges || []
        });
        return calcResult.grandTotal;
      };

      // Compute statistics for "today"
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      const todayOrders = allOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfDay && t <= endOfDay && o.status !== 'cancelled';
      });
      
      const revenue = todayOrders
        .filter(o => o.status === 'completed' || (o.status === 'served' && o.payment_status === 'paid'))
        .reduce((sum, o) => sum + getValidOrderTotal(o), 0);

      // Compute Active Tables (orders with status !== 'completed' && status !== 'cancelled')
      const activeOrders = allOrders.filter(o => !['completed', 'cancelled'].includes(o.status));

      const activeTableMap = new Map<string, string>();
      activeOrders.forEach(o => {
        if (o.table_name && o.order_type !== 'takeaway' && o.order_type !== 'reservation') {
          activeTableMap.set(o.table_id || o.table_name, o.table_name);
        }
      });

      const activeTableNamesList = Array.from(activeTableMap.values())
        .map(name => name.replace(/^Table\s*/i, ''))
        .sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.localeCompare(b);
        });

      // Calculate Top Selling Items
      const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      allOrders
        .filter(o => o.status === 'completed' || (o.status === 'served' && o.payment_status === 'paid'))
        .forEach(o => {
          (o.items || []).forEach(item => {
            if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return;
            if (item.batch_id && (o.batches || []).length > 0) {
              const b = (o.batches || []).find(batch => batch.id === item.batch_id);
              if (b && (b.status === 'cancelled' || b.special_instructions?.includes('[CANCELLED]'))) return;
            }
            if (!itemCounts[item.menu_item_id]) {
              itemCounts[item.menu_item_id] = { name: item.menu_item_name, count: 0, revenue: 0 };
            }
            itemCounts[item.menu_item_id].count += item.quantity;
            itemCounts[item.menu_item_id].revenue += item.price * item.quantity;
          });
        });

      const topItems = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalOrders: todayOrders.length,
        revenue,
        activeTablesCount: activeTableMap.size,
        activeTableNames: activeTableNamesList,
        topItems
      });

      // INSTANT RENDER: Unblock loading immediately for sub-second UI paint
      setLoading(false);

      // Phase 2: Deferred Background Load for Dispositions & Stock Alerts
      setTimeout(async () => {
        try {
          const { data: dispData } = await supabase
            .from('prepared_food_dispositions')
            .select('*')
            .eq('restaurant_id', restId)
            .gte('created_at', new Date(startOfDay).toISOString());

          const dispositionsList = dispData || [];

          const todayCancelledOrders = allOrders.filter(o => {
            const t = new Date(o.created_at).getTime();
            return t >= startOfDay && t <= endOfDay && o.status === 'cancelled';
          });

          let beforePrep = 0;
          let duringPrep = 0;
          let afterPrep = 0;
          let grossCancelledVal = 0;
          let paidBeforeCancelVal = 0;

          todayCancelledOrders.forEach(o => {
            const oVal = getValidOrderTotal(o);
            grossCancelledVal += oVal;
            if (o.payment_status === 'paid' && o.refund_status !== 'processed') {
              paidBeforeCancelVal += oVal;
            }

            const batches = o.batches || [];
            const hasPostReady = batches.some(b => b.status === 'ready' || b.status === 'served');
            const hasPrep = batches.some(b => b.status === 'preparing');

            if (hasPostReady) {
              afterPrep++;
            } else if (hasPrep || o.inventory_consumed) {
              duringPrep++;
            } else {
              beforePrep++;
            }
          });

          const wasteDishes = dispositionsList.filter(d => d.disposition_type === 'waste');
          const reallocatedDishes = dispositionsList.filter(d => d.disposition_type === 'reallocated');
          const staffAndOtherDishes = dispositionsList.filter(d => ['staff_meal', 'complimentary', 'owner_internal', 'other'].includes(d.disposition_type));
          const estimatedWasteCost = wasteDishes.reduce((sum, d) => sum + Number(d.cost_impact || 0), 0);
          const netLoss = (grossCancelledVal - paidBeforeCancelVal) + estimatedWasteCost;

          setCancellationStats({
            totalCancelledToday: todayCancelledOrders.length,
            beforePrepCount: beforePrep,
            duringPrepCount: duringPrep,
            afterPrepCount: afterPrep,
            totalDispositionsCount: dispositionsList.length,
            wasteDishesCount: wasteDishes.length,
            reallocatedDishesCount: reallocatedDishes.length,
            staffAndOtherDishesCount: staffAndOtherDishes.length,
            totalCancelledGrossValue: grossCancelledVal,
            paidBeforeCancelValue: paidBeforeCancelVal,
            estimatedWasteFoodCost: estimatedWasteCost,
            estimatedLoss: Math.max(0, netLoss)
          });
        } catch (e) {}

        // Stock alerts deferred
        try {
          const { getRestaurantMenuStockMap } = await import('@/lib/inventoryEngine');
          const sMap = await getRestaurantMenuStockMap(restId);
          if (sMap) {
            setStockAlerts({
              outOfStock: sMap.outOfStockItems || [],
              lowStock: sMap.lowStockItems || []
            });
          }
        } catch (e) {}
      }, 50);

    } catch (err) {
      console.error('Error in loadDataForRest:', err);
      setLoading(false);
    }
  };

  const [cancellationStats, setCancellationStats] = useState({
    totalCancelledToday: 0,
    beforePrepCount: 0,
    duringPrepCount: 0,
    afterPrepCount: 0,
    totalDispositionsCount: 0,
    wasteDishesCount: 0,
    reallocatedDishesCount: 0,
    staffAndOtherDishesCount: 0,
    totalCancelledGrossValue: 0,
    paidBeforeCancelValue: 0,
    estimatedWasteFoodCost: 0,
    estimatedLoss: 0
  });

  const [stockAlerts, setStockAlerts] = useState<{
    outOfStock: Array<{ menuItemId: string; name: string; reasons: string[] }>;
    lowStock: Array<{ menuItemId: string; name: string; reasons: string[]; maxServings: number }>;
  }>({ outOfStock: [], lowStock: [] });

  useEffect(() => {
    let activeRestId = '';
    let channel: any = null;

    const debouncedReload = (restId: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        if (restId) loadDataForRest(restId);
      }, 200);
    };

    async function initDashboard() {
      try {
        let restId = contextRestaurant?.id || contextProfile?.restaurant_id;
        if (!restId) {
          const user = await getActiveUser();
          restId = user?.restaurant_id;
        }

        if (!restId) {
          setLoading(false);
          return;
        }
        
        activeRestId = restId;
        await loadDataForRest(restId);

        // Request browser push notification permission
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }

        channel = supabase
          .channel(`overview_dashboard_${restId}`, {
            config: {
              broadcast: { self: true }
            }
          })
          .on(
            'broadcast',
            { event: 'new-order' },
            (payload) => {
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification('🚨 New Order Received!', {
                    body: `New order received on your dashboard!`,
                    icon: '/icon-192.png'
                  });
                } catch (e) {}
              }
              loadDataForRest(restId);
            }
          )
          .on(
            'broadcast',
            { event: 'order-status-updated' },
            () => loadDataForRest(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `restaurant_id=eq.${restId}`
            },
            () => loadDataForRest(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'order_batches'
            },
            () => loadDataForRest(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'inventory_items',
              filter: `restaurant_id=eq.${restId}`
            },
            () => loadDataForRest(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tables',
              filter: `restaurant_id=eq.${restId}`
            },
            () => loadDataForRest(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'restaurants',
              filter: `id=eq.${restId}`
            },
            () => debouncedReload(restId)
          )
          .subscribe();
      } catch (err) {
        console.error('[Dashboard] initDashboard error:', err);
      } finally {
        setLoading(false);
      }
    }

    initDashboard();

    const handleStorage = () => {
      if (activeRestId) debouncedReload(activeRestId);
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'new': return <Badge variant="info">New</Badge>;
      case 'accepted': return <Badge variant="neutral">Accepted</Badge>;
      case 'preparing': return <Badge variant="warning">Preparing</Badge>;
      case 'ready': return <Badge variant="purple">Ready</Badge>;
      case 'served': return <Badge variant="success">Served</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'cancelled': return <Badge variant="error">Cancelled</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 lg:col-span-2 bg-slate-200 rounded-xl" />
          <div className="h-96 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Here is a snapshot of your restaurant today.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm shrink-0">
          {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Top Row: Revenue & Core Stats (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Revenue Today</p>
              <span className="text-emerald-500 text-xs font-bold">Today</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1">{formatPrice(stats.revenue)}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{stats.totalOrders} valid orders</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Orders</p>
              <span className="text-blue-500 text-xs font-bold">Today</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.totalOrders}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{stats.totalOrders} non-cancelled</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Tables</p>
              <span className="text-purple-500 text-xs font-bold">Live</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.activeTablesCount}</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {stats.activeTableNames.length > 0 ? `Tables: ${stats.activeTableNames.join(', ')}` : '0 dining now'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Order Value</p>
              <span className="text-amber-500 text-xs font-bold">Per Order</span>
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1">
              {stats.totalOrders > 0 ? formatPrice(stats.revenue / stats.totalOrders) : '₹0'}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Per closed ticket</p>
          </CardContent>
        </Card>
      </div>

      {/* Dedicated Live Table Occupancy Card */}
      <Card className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                🪑
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Live Table Occupancy</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Real-time dining room seating and QR status</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                {tableOccupancy.occupancyRate}% Occupied
              </span>
              <Link href="/dashboard/tables">
                <Button variant="outline" size="sm" className="text-xs font-bold gap-1 rounded-xl">
                  Manage Tables <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Occupancy Progress Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 mb-5 overflow-hidden flex">
            <div
              className="bg-rose-500 h-2.5 transition-all duration-500 ease-out"
              style={{ width: `${tableOccupancy.total > 0 ? (tableOccupancy.occupied / tableOccupancy.total) * 100 : 0}%` }}
              title={`Occupied: ${tableOccupancy.occupied}`}
            />
            <div
              className="bg-emerald-500 h-2.5 transition-all duration-500 ease-out"
              style={{ width: `${tableOccupancy.total > 0 ? (tableOccupancy.available / tableOccupancy.total) * 100 : 0}%` }}
              title={`Available: ${tableOccupancy.available}`}
            />
            <div
              className="bg-slate-400 h-2.5 transition-all duration-500 ease-out"
              style={{ width: `${tableOccupancy.total > 0 ? (tableOccupancy.inactive / tableOccupancy.total) * 100 : 0}%` }}
              title={`Disabled: ${tableOccupancy.inactive}`}
            />
          </div>

          {/* 4-Stat KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
              <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{tableOccupancy.total}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Total Tables</p>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">{tableOccupancy.available}</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mt-1">🟢 Available</p>
            </div>
            <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl p-3">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-tight">{tableOccupancy.occupied}</p>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300 mt-1">🔴 Occupied</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3">
              <p className="text-2xl font-black text-slate-600 dark:text-slate-400 leading-tight">{tableOccupancy.inactive}</p>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">⚪ QR Disabled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Second Section: Recent Orders (7 cols) + Top Selling Items (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Orders List */}
        <Card className="lg:col-span-7 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Recent Orders</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Latest incoming orders across all tables.</p>
              </div>
              <Link href="/dashboard/orders">
                <Button variant="ghost" className="text-xs font-bold gap-1 text-emerald-600 dark:text-emerald-400">
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-2">
                  <ShoppingBag className="h-8 w-8" />
                  No orders placed yet. Scan a QR code to place an order!
                </div>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm md:text-base">Order {getFormattedOrderId(order, restaurant?.name || '', orders)}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">
                        {order.table_name || 'N/A'} • {order.items.reduce((s, i) => s + i.quantity, 0)} items • {formatExactTimestamp(order.created_at)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md truncate">
                        {order.items.map(i => `${i.menu_item_name || (i as any).name || (i as any).item_name || 'Item'} x${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                      {(() => {
                        const validOrderTotal = () => {
                          return calculateBillingTotals({
                            items: order.items || [],
                            batches: order.batches || [],
                            discountAmount: Number(order.discount_amount || 0),
                            offerCode: order.offer_code,
                            specialInstructions: order.special_instructions,
                            offers: restaurant?.settings?.offers || [],
                            gstEnabled: restaurant?.settings?.gst_enabled !== false,
                            gstPercentage: restaurant?.settings?.gst_percentage || 0,
                            serviceChargeEnabled: restaurant?.settings?.service_charge_enabled !== false,
                            serviceChargePercentage: restaurant?.settings?.service_charge_percentage || 0,
                            customCharges: restaurant?.settings?.custom_charges || []
                          }).grandTotal;
                        };
                        return <span className="font-extrabold text-slate-900 dark:text-white">{formatPrice(validOrderTotal())}</span>;
                      })()}
                      <Link href={`/dashboard/orders?id=${order.id}`}>
                        <Button variant="outline" size="sm">Manage</Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className="lg:col-span-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800">Top Selling Items</h3>
            {stats.topItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                Complete orders to see top selling items.
              </div>
            ) : (
              <div className="space-y-5 pt-4">
                {stats.topItems.map((item, index) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                          {index + 1}
                        </span>
                        {item.name}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{item.count} sold</span>
                    </div>
                    {/* Bar Visualization */}
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${(item.count / stats.topItems[0].count) * 100}%` 
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                      <span>Revenue Generated</span>
                      <span>{formatPrice(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Third Section: Inventory & Menu Stock Alerts */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Inventory & Menu Stock Alerts
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Live stock availability & shortage detection across your recipes & menu items.
            </p>
          </div>
          <Link href="/dashboard/inventory">
            <Button variant="outline" size="sm" className="text-xs font-bold gap-1 self-start sm:self-auto">
              Manage Inventory <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Out of Stock Card */}
          <Card className="border border-rose-200 dark:border-rose-900/50 rounded-2xl bg-rose-50/30 dark:bg-rose-950/20 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-2.5">
                <span className="text-xs font-extrabold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                  Out of Stock ({stockAlerts.outOfStock.length})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-200">
                  CRITICAL
                </span>
              </div>

              {stockAlerts.outOfStock.length === 0 ? (
                <div className="py-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                  🎉 No out of stock items. All recipe ingredients are available!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stockAlerts.outOfStock.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/30 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white block">{item.name}</span>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold block mt-0.5">
                          {item.reasons.join(' • ')}
                        </span>
                      </div>
                      <Link href="/dashboard/inventory">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2 font-bold">
                          Restock
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Card */}
          <Card className="border border-amber-200 dark:border-amber-900/50 rounded-2xl bg-amber-50/30 dark:bg-amber-950/20 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-2.5">
                <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Low Stock ({stockAlerts.lowStock.length})
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                  WARNING
                </span>
              </div>

              {stockAlerts.lowStock.length === 0 ? (
                <div className="py-4 text-center text-xs font-bold text-slate-400 dark:text-slate-500">
                  👍 No low stock items. All inventory levels are healthy!
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stockAlerts.lowStock.map((item, idx) => (
                    <div key={idx} className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-white">{item.name}</span>
                          <span className="text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.5 rounded">
                            {item.maxServings} left
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold block mt-0.5">
                          {item.reasons.join(' • ')}
                        </span>
                      </div>
                      <Link href="/dashboard/inventory">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/50 px-2 font-bold">
                          Add Stock
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fourth Section: Order Cancellation & Prepared Food Waste Impact */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Order Cancellation & Prepared Food Waste Impact
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Breakdown of today's cancellations by stage, food disposition channels, and net financial loss.
            </p>
          </div>
          <Link href="/dashboard/inventory">
            <Button variant="outline" size="sm" className="text-xs font-bold gap-1 self-start sm:self-auto">
              View Dispositions <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cancellation by Stage */}
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Cancellations By Stage
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {cancellationStats.totalCancelledToday} Total Today
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Before Cooking</span>
                    <span className="text-[10px] text-slate-400">Placed / Accepted</span>
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.beforePrepCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">During Cooking</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">In Preparation</span>
                  </div>
                  <span className="font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.duringPrepCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/30">
                  <div className="space-y-0.5">
                    <span className="font-bold text-rose-900 dark:text-rose-200 block">After Cooking / Served</span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400">Ready / Served</span>
                  </div>
                  <span className="font-extrabold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.afterPrepCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prepared Food Dispositions */}
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Cooked Food Dispositions
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
                  {cancellationStats.totalDispositionsCount} Logged
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/30">
                  <div>
                    <span className="font-bold text-blue-900 dark:text-blue-200 block">Reallocated / Resold</span>
                    <span className="text-[10px] text-blue-700 dark:text-blue-400">Given to other tables</span>
                  </div>
                  <span className="font-extrabold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.reallocatedDishesCount} dishes
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/60 dark:border-amber-900/30">
                  <div>
                    <span className="font-bold text-amber-900 dark:text-amber-200 block">Staff / Complimentary</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">Internal consumption</span>
                  </div>
                  <span className="font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.staffAndOtherDishesCount} dishes
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200/60 dark:border-rose-900/30">
                  <div>
                    <span className="font-bold text-rose-900 dark:text-rose-200 block">Discarded / Wasted</span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400">Total food dumped</span>
                  </div>
                  <span className="font-extrabold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.wasteDishesCount} dishes
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Loss Breakdown */}
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                  Unpaid Cancellation Loss
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                  ESTIMATED IMPACT
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Gross Cancelled Bill Value:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatPrice(cancellationStats.totalCancelledGrossValue, restaurant?.settings?.currency)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Payments Retained / Paid:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{formatPrice(cancellationStats.paidBeforeCancelValue, restaurant?.settings?.currency)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Wasted Raw Ingredient Cost:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    -{formatPrice(cancellationStats.estimatedWasteFoodCost, restaurant?.settings?.currency)}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50">
                  <div>
                    <span className="font-black text-rose-900 dark:text-rose-200 block text-xs">Net Financial Loss:</span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold">Uncollected bill + wasted stock</span>
                  </div>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    {formatPrice(cancellationStats.estimatedLoss, restaurant?.settings?.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
