'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { db, Order, MenuItem } from '@/lib/db';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice, formatDate, getFormattedOrderId, parseCustomerDetailsFromOrder } from '@/lib/utils';
import { formatExactTimestamp } from '@/lib/timestamp';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import Link from 'next/link';
import { 
  DollarSign, ClipboardList, Users, TrendingUp, 
  ArrowRight, Clock, CheckCircle2, Check, AlertCircle, ShoppingBag,
  ChefHat, MenuSquare, Boxes, QrCode, BarChart3, CreditCard, Settings,
  Megaphone, X, Bell, BellOff, Sparkles, Receipt
} from 'lucide-react';

import { calculateBillingTotals, isRevenueOrder, getOrderRevenueAmount, calculateOrdersRevenue } from '@/lib/billingEngine';
import { useRestaurant } from '../layout';
import { dashboardStore } from '@/lib/dashboardStore';
import { setGlobalMute, stopLoudBell } from '@/lib/soundAlert';

interface OverviewStats {
  totalOrders: number;
  revenue: number;
  activeTablesCount: number;
  activeTableNames: string[];
  topItems: { name: string; count: number; revenue: number }[];
}

const STATUS_SETTLE_RANK: Record<string, number> = {
  served: 1,
  ready: 2,
  preparing: 3,
  accepted: 4,
  new: 5
};

export default function DashboardPage() {
  const { restaurant: contextRestaurant, profile: contextProfile, alarmMuted, setAlarmMuted } = useRestaurant();
  const restId = contextRestaurant?.id || contextProfile?.restaurant_id;
  const initialCachedOverview = restId ? dashboardStore.getCachedOverview(restId) : null;
  const cachedOrders = restId ? dashboardStore.getCachedOrders(restId) : null;
  const hasCachedData = Boolean(initialCachedOverview || (cachedOrders && cachedOrders.length >= 0));
  const [orders, setOrders] = useState<Order[]>(() => initialCachedOverview?.orders || cachedOrders || []);
  const [restaurant, setRestaurant] = useState<any>(contextRestaurant);
  const [stats, setStats] = useState<OverviewStats>(() => {
    if (initialCachedOverview?.stats) return initialCachedOverview.stats;
    if (cachedOrders && cachedOrders.length > 0) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      const todayOrders = cachedOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfDay && t <= endOfDay && o.status !== 'cancelled' && Number(o.total || 0) > 0;
      });
      const revenue = calculateOrdersRevenue(todayOrders);
      const activeOrders = cachedOrders.filter(o => !['completed', 'cancelled'].includes(o.status));
      const activeTableMap = new Map<string, string>();
      activeOrders.forEach(o => {
        const isDining = o.table_name && o.order_type !== 'takeaway' && !(o.order_type === 'reservation' && !o.table_id && ['new', 'accepted'].includes(o.status));
        if (isDining && o.table_name) {
          activeTableMap.set(o.table_id || o.table_name, o.table_name);
        }
      });
      return {
        totalOrders: todayOrders.length,
        revenue,
        activeTablesCount: activeTableMap.size,
        activeTableNames: Array.from(activeTableMap.values()),
        topItems: []
      };
    }
    return {
      totalOrders: 0,
      revenue: 0,
      activeTablesCount: 0,
      activeTableNames: [],
      topItems: []
    };
  });
  const [tableOccupancy, setTableOccupancy] = useState(() => initialCachedOverview?.tableOccupancy || {
    total: 0,
    available: 0,
    occupied: 0,
    inactive: 0,
    occupancyRate: 0
  });
  const [loading, setLoading] = useState(() => !hasCachedData);
  const [dismissedAnnouncementKey, setDismissedAnnouncementKey] = useState<string | null>(null);
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
  const [topSellingFilter, setTopSellingFilter] = useState<'today' | 'week' | 'all'>('today');
  const [quickSettleOrder, setQuickSettleOrder] = useState<Order | null>(null);
  const [isQuickSettleOpen, setIsQuickSettleOpen] = useState(false);
  const [quickSettlePaymentMethod, setQuickSettlePaymentMethod] = useState<'cash' | 'upi' | 'card' | 'split'>('cash');
  const [isSubmittingSettle, setIsSubmittingSettle] = useState(false);
  const [completingOrderIds, setCompletingOrderIds] = useState<string[]>([]);
  const [floorTables, setFloorTables] = useState<any[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isReloadingRef = useRef(false);
  const pendingReloadRef = useRef(false);
  const submittingSettleRef = useRef(false);
  const completingOrderIdsRef = useRef<Set<string>>(new Set());

  // Strictly Today's Orders for Recent Orders list (excluding ₹0 non-billable / empty bookings)
  const todayRecentOrders = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return orders.filter(o => {
      const t = new Date(o.created_at).getTime();
      const isToday = t >= startOfDay && t <= endOfDay;
      if (!isToday) return false;
      // Filter out all ₹0 payment orders completely (e.g. empty table bookings, non-billable reservations)
      if (Number(o.total || 0) <= 0) return false;
      return true;
    });
  }, [orders]);

  // Top Selling Items filtered dynamically by time period
  const filteredTopItems = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0).getTime();

    let targetOrders = orders.filter(isRevenueOrder);
    if (topSellingFilter === 'today') {
      targetOrders = targetOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfDay && t <= endOfDay;
      });
    } else if (topSellingFilter === 'week') {
      targetOrders = targetOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfWeek && t <= endOfDay;
      });
    }

    const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
    targetOrders.forEach(o => {
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

    return Object.values(itemCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders, topSellingFilter]);

  // Active dining tables (including unpaid awaiting billing and paid awaiting table release)
  // Sorted by status priority: Bill Requested -> Unpaid (served -> ready -> preparing -> accepted -> new) -> Paid (ready to free)
  const activeDiningOrders = useMemo(() => {
    return orders
      .filter(o => {
        const isNotTerminal = !['completed', 'cancelled'].includes(o.status);
        const isDining = o.table_name && o.order_type !== 'takeaway' && !(o.order_type === 'reservation' && !o.table_id && ['new', 'accepted'].includes(o.status));
        return isNotTerminal && isDining;
      })
      .sort((a, b) => {
        const aReq = a.special_instructions?.includes('[BILL_REQUESTED]') || (a as any).notes?.includes('[BILL_REQUESTED]') || (a as any).customer_request?.type === 'bill';
        const bReq = b.special_instructions?.includes('[BILL_REQUESTED]') || (b as any).notes?.includes('[BILL_REQUESTED]') || (b as any).customer_request?.type === 'bill';
        if (aReq && !bReq) return -1;
        if (!aReq && bReq) return 1;

        // Priority 1: Unpaid orders come first so bill collection is immediately accessible
        const aUnpaid = a.payment_status !== 'paid';
        const bUnpaid = b.payment_status !== 'paid';
        if (aUnpaid && !bUnpaid) return -1;
        if (!aUnpaid && bUnpaid) return 1;

        // User explicit status priority: served (1) -> ready (2) -> preparing (3) -> accepted (4) -> new (5)
        const rankA = STATUS_SETTLE_RANK[a.status] ?? 99;
        const rankB = STATUS_SETTLE_RANK[b.status] ?? 99;
        if (rankA !== rankB) return rankA - rankB;

        const tableA = (a.table_name || '').replace(/^Table\s*/i, '');
        const tableB = (b.table_name || '').replace(/^Table\s*/i, '');
        const numA = parseInt(tableA, 10);
        const numB = parseInt(tableB, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        if (a.table_name && b.table_name) return a.table_name.localeCompare(b.table_name);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [orders]);

  // Unified active dining cards: merges active order tables + any physically occupied/seated tables from floor layout
  const activeDiningCards = useMemo(() => {
    const cards: Array<{
      key: string;
      order?: Order;
      tableId?: string;
      tableName: string;
      status: string;
      isManualHold?: boolean;
      paymentStatus?: string;
      total: number;
      created_at: string;
      dishSummary: string;
      itemCount: number;
      isBillReq?: boolean;
      isReservation?: boolean;
      guestName?: string;
    }> = [];

    const tablesWithOrders = new Set<string>();

    activeDiningOrders.forEach(order => {
      if (order.table_id) tablesWithOrders.add(order.table_id);
      if (order.table_name) {
        tablesWithOrders.add(order.table_name.toLowerCase());
        tablesWithOrders.add(order.table_name.toLowerCase().replace(/^table\s*/i, ''));
      }

      const calc = calculateBillingTotals({
        items: order.items || [],
        batches: order.batches || [],
        discountAmount: Number(order.discount_amount || 0),
        offerCode: order.offer_code,
        specialInstructions: order.special_instructions,
        offers: restaurant?.settings?.offers || [],
        settings: restaurant?.settings || {},
        gstNumber: restaurant?.gst_number,
        gstEnabled: restaurant?.settings?.gst_enabled,
        gstPercentage: restaurant?.settings?.gst_percentage || 0,
        serviceChargeEnabled: restaurant?.settings?.service_charge_enabled !== false,
        serviceChargePercentage: restaurant?.settings?.service_charge_percentage || 0,
        customCharges: restaurant?.settings?.custom_charges || []
      });

      const isBillReq = order.special_instructions?.includes('[BILL_REQUESTED]') || (order as any).notes?.includes('[BILL_REQUESTED]') || (order as any).customer_request?.type === 'bill';
      const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;
      const dishSummary = (order.items || [])
        .filter(i => !i.is_cancelled && i.status !== 'cancelled')
        .slice(0, 2)
        .map(i => `${i.menu_item_name} x${i.quantity}`)
        .join(', ');

      const cust = parseCustomerDetailsFromOrder(order);
      const isReservation = order.order_type === 'reservation' || 
        order.table_name?.toLowerCase().includes('reservation') || 
        order.special_instructions?.includes('TABLE RESERVATION');

      cards.push({
        key: order.id,
        order,
        tableId: order.table_id,
        tableName: order.table_name || 'Table',
        status: order.status,
        isManualHold: false,
        paymentStatus: order.payment_status,
        total: calc.grandTotal,
        created_at: order.created_at,
        dishSummary: dishSummary ? `${dishSummary}${order.items && order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}` : `${itemCount} items`,
        itemCount,
        isBillReq,
        isReservation,
        guestName: cust.name || undefined
      });
    });

    // Also include any tables that are marked occupied in tableOccupancy / floor layout but have no active order
    (floorTables || []).forEach(t => {
      if (t.occupancy_status === 'occupied' && !t.is_archived) {
        const idMatches = tablesWithOrders.has(t.id);
        const nameMatches = tablesWithOrders.has(t.name.toLowerCase()) || tablesWithOrders.has(t.name.toLowerCase().replace(/^table\s*/i, ''));
        const dispMatches = t.display_number ? (tablesWithOrders.has(t.display_number.toLowerCase()) || tablesWithOrders.has(t.display_number.toLowerCase().replace(/^table\s*/i, ''))) : false;
        if (!idMatches && !nameMatches && !dispMatches) {
          cards.push({
            key: `table_hold_${t.id}`,
            tableId: t.id,
            tableName: t.display_number || t.name,
            status: 'occupied',
            isManualHold: true,
            paymentStatus: 'paid', // Can be freed directly in 1-tap
            total: 0,
            created_at: t.occupied_at || new Date().toISOString(),
            dishSummary: 'Seated / Walk-in (No active order placed)',
            itemCount: 0,
            isBillReq: false
          });
        }
      }
    });

    return cards;
  }, [activeDiningOrders, floorTables, restaurant]);

  const debouncedReload = (restId: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (restId) loadDataForRest(restId);
    }, 150);
  };

  const loadDataForRest = async (restId: string) => {
    if (isReloadingRef.current) {
      pendingReloadRef.current = true;
      return;
    }
    isReloadingRef.current = true;
    try {
      const freshRest = await db.getRestaurantById(restId);
      const activeRest = freshRest || restaurant || contextRestaurant;
      if (activeRest) setRestaurant(activeRest);

      // Phase 1: Fast Parallel Fetch of Core Orders & Table Live Status
      const [allOrders, liveTableData] = await Promise.all([
        db.getOrders(restId),
        db.getTablesWithLiveStatus(restId)
      ]);

      setOrders(allOrders);
      if (liveTableData?.stats) {
        setTableOccupancy(liveTableData.stats);
      }
      if (liveTableData?.tables) {
        setFloorTables(liveTableData.tables);
      }

      const getValidOrderTotal = (o: Order) => {
        return getOrderRevenueAmount(o);
      };

      // Compute statistics for "today"
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

      const todayOrders = allOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startOfDay && t <= endOfDay && o.status !== 'cancelled' && Number(o.total || 0) > 0;
      });
      
      const revenue = calculateOrdersRevenue(todayOrders);

      // Compute Active Tables (orders with status !== 'completed' && status !== 'cancelled' PLUS floor occupied tables)
      const activeOrders = allOrders.filter(o => !['completed', 'cancelled'].includes(o.status));

      const activeTableMap = new Map<string, string>();
      activeOrders.forEach(o => {
        const isDining = o.table_name && o.order_type !== 'takeaway' && !(o.order_type === 'reservation' && !o.table_id && ['new', 'accepted'].includes(o.status));
        if (isDining && o.table_name) {
          activeTableMap.set(o.table_id || o.table_name, o.table_name);
        }
      });

      // Synchronize with physically occupied tables on floor layout (e.g. manual hold or seated guests)
      (liveTableData?.tables || []).forEach((t: any) => {
        if (t.occupancy_status === 'occupied' && !t.is_archived) {
          activeTableMap.set(t.id, t.display_number || t.name);
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
        .filter(isRevenueOrder)
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

      const computedStats = {
        totalOrders: todayOrders.length,
        revenue,
        activeTablesCount: activeTableMap.size,
        activeTableNames: activeTableNamesList,
        topItems
      };
      setStats(computedStats);

      dashboardStore.setCachedOverview(restId, {
        orders: allOrders,
        stats: computedStats,
        tableOccupancy: liveTableData?.stats || tableOccupancy
      });

      // INSTANT RENDER: Unblock loading immediately for sub-second UI paint
      setLoading(false);

      // Phase 2: Deferred Background Load for Dispositions & Stock Alerts
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
      backgroundTimerRef.current = setTimeout(async () => {
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
      }, 1000);

    } catch (err) {
      console.error('Error in loadDataForRest:', err);
      setLoading(false);
    } finally {
      isReloadingRef.current = false;
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        debouncedReload(restId);
      }
    }
  };



  useEffect(() => {
    let activeRestId = '';
    let channel: any = null;

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
                  new Notification('New Order Received', {
                    body: `New order received on your dashboard!`,
                    icon: '/icon-192.png'
                  });
                } catch (e) {}
              }
              debouncedReload(restId);
            }
          )
          .on(
            'broadcast',
            { event: 'order-status-updated' },
            () => debouncedReload(restId)
          )
          .on(
            'broadcast',
            { event: 'payment-updated' },
            () => debouncedReload(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'orders',
              filter: `restaurant_id=eq.${restId}`
            },
            () => debouncedReload(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'order_batches'
            },
            () => debouncedReload(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'inventory_items',
              filter: `restaurant_id=eq.${restId}`
            },
            () => debouncedReload(restId)
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tables',
              filter: `restaurant_id=eq.${restId}`
            },
            () => debouncedReload(restId)
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

    // BUG-ORD-004: Fast recovery when tab regains focus or wakes up from background
    const handleForceResync = () => {
      console.log('[Dashboard] Force resync event received. Reloading dashboard data...');
      if (activeRestId) debouncedReload(activeRestId);
    };
    window.addEventListener('force-resync', handleForceResync);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('force-resync', handleForceResync);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (backgroundTimerRef.current) clearTimeout(backgroundTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleQuickSettleConfirm = async () => {
    if (!quickSettleOrder || !restaurant) return;
    if (submittingSettleRef.current || isSubmittingSettle) return;
    if (quickSettleOrder.payment_status === 'paid') {
      setIsQuickSettleOpen(false);
      return;
    }

    submittingSettleRef.current = true;
    setIsSubmittingSettle(true);

    const targetOrderId = quickSettleOrder.id;
    const calcResult = calculateBillingTotals({
      items: quickSettleOrder.items || [],
      batches: quickSettleOrder.batches || [],
      discountAmount: Number(quickSettleOrder.discount_amount || 0),
      offerCode: quickSettleOrder.offer_code,
      specialInstructions: quickSettleOrder.special_instructions,
      offers: restaurant.settings?.offers || [],
      settings: restaurant.settings || {},
      gstNumber: restaurant.gst_number,
      gstEnabled: restaurant.settings?.gst_enabled,
      gstPercentage: restaurant.settings?.gst_percentage || 0,
      serviceChargeEnabled: restaurant.settings?.service_charge_enabled !== false,
      serviceChargePercentage: restaurant.settings?.service_charge_percentage || 0,
      customCharges: restaurant.settings?.custom_charges || []
    });

    const chosenMethod = quickSettlePaymentMethod;

    // 1. Instant Optimistic UI Update (<10ms)
    setIsQuickSettleOpen(false);
    setOrders(prev => prev.map(o => o.id === targetOrderId ? {
      ...o,
      payment_status: 'paid',
      payment_method: chosenMethod,
      paid_at: new Date().toISOString(),
      status: 'completed'
    } : o));

    const targetTableId = quickSettleOrder.table_id;
    if (targetTableId) {
      setFloorTables((prev: any[]) => prev.map(t => (t.id === targetTableId || t.name === quickSettleOrder.table_name) ? {
        ...t,
        occupancy_status: 'available',
        is_occupied: false,
        manual_occupied: false
      } : t));
    }

    setTableOccupancy((prev: any) => ({
      ...prev,
      occupied: Math.max(0, (prev?.occupied || 0) - 1),
      available: (prev?.available || 0) + 1,
      occupancyRate: (prev?.total || 0) > 0 ? Math.round((Math.max(0, (prev?.occupied || 0) - 1) / (prev?.total || 1)) * 100) : 0
    }));

    setStats(prev => ({
      ...prev,
      revenue: prev.revenue + calcResult.grandTotal,
      totalOrders: prev.totalOrders + 1,
      activeTablesCount: Math.max(0, prev.activeTablesCount - 1),
      activeTableNames: (prev.activeTableNames || []).filter(name => {
        const cleanT = (quickSettleOrder.table_name || '').replace(/^Table\s*/i, '');
        return name !== cleanT && name !== quickSettleOrder.table_name;
      })
    }));

    window.dispatchEvent(new Event('storage'));

    try {
      // 2. Fast retrieval of staff token
      let token = '';
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('smartdine_auth_token_v2');
          if (raw) {
            const parsed = JSON.parse(raw);
            const t = Array.isArray(parsed) ? parsed[0]?.access_token : (parsed?.access_token || parsed);
            if (t && typeof t === 'string') token = t;
          }
        } catch (_) {}
      }

      // 3. Parallel non-blocking execution: API update + Table release
      await Promise.allSettled([
        fetch('/api/staff/update-order-status', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}`, 'x-staff-token': token } : {}),
            ...(restaurant?.id ? { 'x-restaurant-id': restaurant.id } : {}),
            'x-staff-role': contextProfile?.role || 'owner',
            ...(contextProfile ? { 'x-impersonated-profile': JSON.stringify(contextProfile) } : {})
          },
          body: JSON.stringify({
            orderId: targetOrderId,
            restaurantId: restaurant.id,
            newStatus: 'completed',
            staffName: contextProfile?.full_name || 'Owner',
            paymentStatus: 'paid',
            paymentMethod: chosenMethod,
            subtotal: calcResult.validSubtotal,
            gst: calcResult.gstAmount,
            serviceCharge: calcResult.serviceChargeAmount,
            customCharges: calcResult.customChargesSnapshot,
            total: calcResult.grandTotal
          })
        }),
        targetTableId ? db.checkAndReleaseTableOccupancy(restaurant.id, targetTableId) : Promise.resolve()
      ]);

      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      console.error('[QuickSettle] Background execution error:', err);
    } finally {
      submittingSettleRef.current = false;
      setIsSubmittingSettle(false);
      setQuickSettleOrder(null);
    }
  };

  const handleCompleteAndFreeTable = async (order: Order) => {
    if (!order || !restaurant) return;
    const targetOrderId = order.id;
    const targetTableId = order.table_id;
    if (completingOrderIdsRef.current.has(targetOrderId)) return;
    completingOrderIdsRef.current.add(targetOrderId);
    setCompletingOrderIds(prev => [...prev, targetOrderId]);

    // 1. Instant Optimistic UI Update (<10ms)
    setOrders(prev => prev.map(o => o.id === targetOrderId ? {
      ...o,
      status: 'completed',
      completed_at: new Date().toISOString()
    } : o));

    if (targetTableId) {
      setFloorTables((prev: any[]) => prev.map(t => (t.id === targetTableId || t.name === order.table_name) ? {
        ...t,
        occupancy_status: 'available',
        is_occupied: false,
        manual_occupied: false
      } : t));
    }

    setTableOccupancy((prev: any) => ({
      ...prev,
      occupied: Math.max(0, (prev?.occupied || 0) - 1),
      available: (prev?.available || 0) + 1,
      occupancyRate: (prev?.total || 0) > 0 ? Math.round((Math.max(0, (prev?.occupied || 0) - 1) / (prev?.total || 1)) * 100) : 0
    }));

    setStats(prev => {
      const remainingActive = orders
        .filter(o => o.id !== targetOrderId && !['completed', 'cancelled'].includes(o.status) && o.table_name && o.order_type !== 'takeaway' && !(o.order_type === 'reservation' && !o.table_id && ['new', 'accepted'].includes(o.status)));
      const tableMap = new Map<string, string>();
      remainingActive.forEach(o => tableMap.set(o.table_id || o.table_name || '', o.table_name || ''));
      return {
        ...prev,
        activeTablesCount: tableMap.size
      };
    });

    window.dispatchEvent(new Event('storage'));

    try {
      let token = '';
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('smartdine_auth_token_v2');
          if (raw) {
            const parsed = JSON.parse(raw);
            const t = Array.isArray(parsed) ? parsed[0]?.access_token : (parsed?.access_token || parsed);
            if (t && typeof t === 'string') token = t;
          }
        } catch (_) {}
      }

      await Promise.allSettled([
        fetch('/api/staff/update-order-status', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}`, 'x-staff-token': token } : {}),
            ...(restaurant?.id ? { 'x-restaurant-id': restaurant.id } : {}),
            'x-staff-role': contextProfile?.role || 'owner',
            ...(contextProfile ? { 'x-impersonated-profile': JSON.stringify(contextProfile) } : {})
          },
          body: JSON.stringify({
            orderId: targetOrderId,
            restaurantId: restaurant.id,
            newStatus: 'completed',
            staffName: contextProfile?.full_name || 'Owner',
            paymentStatus: 'paid'
          })
        }),
        targetTableId ? db.checkAndReleaseTableOccupancy(restaurant.id, targetTableId) : Promise.resolve()
      ]);

      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      console.error('[Dashboard] Error completing and freeing table:', err);
    } finally {
      completingOrderIdsRef.current.delete(targetOrderId);
      setCompletingOrderIds(prev => prev.filter(id => id !== targetOrderId));
    }
  };

  const handleFreeManualTable = async (tableId: string) => {
    if (!tableId || !restaurant) return;
    if (completingOrderIdsRef.current.has(tableId)) return;
    completingOrderIdsRef.current.add(tableId);
    setCompletingOrderIds(prev => [...prev, tableId]);

    // 1. Optimistic update
    setTableOccupancy((prev: any) => ({
      ...prev,
      occupied: Math.max(0, (prev?.occupied || 0) - 1),
      available: (prev?.available || 0) + 1,
      occupancyRate: (prev?.total || 0) > 0 ? Math.round((Math.max(0, (prev?.occupied || 0) - 1) / (prev?.total || 1)) * 100) : 0
    }));

    setStats((prev: any) => ({
      ...prev,
      activeTablesCount: Math.max(0, (prev?.activeTablesCount || 0) - 1),
      activeTableNames: (prev?.activeTableNames || []).filter((name: string) => {
        const t = floorTables.find(ft => ft.id === tableId);
        return t ? name !== (t.display_number || t.name).replace(/^Table\s*/i, '') : true;
      })
    }));

    setFloorTables((prev: any[]) => prev.map(t => t.id === tableId ? { ...t, occupancy_status: 'available', manual_occupied: false } : t));
    window.dispatchEvent(new Event('storage'));

    try {
      await db.toggleTableOccupancy(restaurant.id, tableId, false);
      await db.checkAndReleaseTableOccupancy(restaurant.id, tableId);
      if (restaurant?.id) {
        debouncedReload(restaurant.id);
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('force-resync'));
    } catch (e) {
      console.error('[Dashboard] Error freeing manual table:', e);
    } finally {
      completingOrderIdsRef.current.delete(tableId);
      setCompletingOrderIds(prev => prev.filter(id => id !== tableId));
    }
  };

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
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Overview Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Here is a snapshot of your restaurant today.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-2xl text-xs md:text-sm font-bold text-slate-600 dark:text-slate-300 shadow-sm shrink-0">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Super Admin Global Announcement Banner */}
      {(() => {
        const announcement = restaurant?.settings?.broadcast_announcement;
        const rawMsg = announcement?.message ? String(announcement.message).trim() : '';
        const cleanMsg = rawMsg.replace(/^[📢ℹ️⚠️🚨\s]+/, '').trim();
        const announcementKey = announcement?.id || announcement?.created_at || cleanMsg;
        const isDismissed = Boolean(dismissedAnnouncementKey && dismissedAnnouncementKey === announcementKey);
        const isActive = Boolean(
          announcement &&
          announcement.active === true &&
          cleanMsg &&
          !isDismissed
        );

        if (!isActive) return null;

        return (
          <div className="relative rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50/70 to-blue-50/50 dark:from-sky-950/70 dark:via-indigo-950/60 dark:to-slate-900/80 border border-sky-200/90 dark:border-sky-800/80 p-4 sm:p-5 shadow-sm dark:shadow-xl flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-300 shrink-0 mt-0.5 border border-sky-500/20">
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white dark:bg-sky-500/20 dark:text-sky-300 text-[10px] font-black uppercase tracking-wider">
                    Announcement
                  </span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                  {cleanMsg}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissedAnnouncementKey(announcementKey)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Dismiss announcement"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}


      {/* Top Row: Revenue & Core Stats (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue Today</p>
              <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Today</span>
            </div>
            <h3 className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white mt-1 leading-tight whitespace-nowrap">{formatPrice(stats.revenue)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.totalOrders} valid orders</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
              <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Today</span>
            </div>
            <h3 className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white mt-1 leading-tight whitespace-nowrap">{stats.totalOrders}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stats.totalOrders} non-cancelled</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Tables</p>
              <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Live</span>
            </div>
            <h3 className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white mt-1 leading-tight whitespace-nowrap">{stats.activeTablesCount}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.activeTableNames.length > 0 ? `Tables: ${stats.activeTableNames.join(', ')}` : '0 dining now'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Avg Order Value</p>
              <span className="text-gray-500 dark:text-gray-400 text-xs font-semibold">Per Order</span>
            </div>
            <h3 className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white mt-1 leading-tight whitespace-nowrap">
              {stats.totalOrders > 0 ? formatPrice(stats.revenue / stats.totalOrders) : '₹0'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per closed ticket</p>
          </CardContent>
        </Card>
      </div>

      {/* Dedicated Live Table Occupancy Card */}
      <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-900 dark:text-gray-100 font-bold text-base">
                <Boxes className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="font-bold text-gray-950 dark:text-white text-base">Live Table Occupancy</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-time dining room seating and QR status</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-white border border-gray-300 dark:border-gray-700">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-900 dark:bg-gray-100"></span>
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
          <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-5 overflow-hidden flex">
            <div
              className="bg-gray-900 dark:bg-gray-100 h-2 transition-all duration-500 ease-out"
              style={{ width: `${tableOccupancy.total > 0 ? (tableOccupancy.occupied / tableOccupancy.total) * 100 : 0}%` }}
              title={`Occupied: ${tableOccupancy.occupied}`}
            />
            <div
              className="bg-gray-400 dark:bg-gray-600 h-2 transition-all duration-500 ease-out"
              style={{ width: `${tableOccupancy.total > 0 ? (tableOccupancy.available / tableOccupancy.total) * 100 : 0}%` }}
              title={`Available: ${tableOccupancy.available}`}
            />
            <div
              className="bg-gray-200 dark:bg-gray-700 h-2 transition-all duration-500 ease-out"
              style={{ width: `${tableOccupancy.total > 0 ? (tableOccupancy.inactive / tableOccupancy.total) * 100 : 0}%` }}
              title={`Disabled: ${tableOccupancy.inactive}`}
            />
          </div>

          {/* 4-Stat KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
              <p className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white leading-tight whitespace-nowrap">{tableOccupancy.total}</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Total Tables</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
              <p className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white leading-tight whitespace-nowrap">{tableOccupancy.available}</p>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-1">Available</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
              <p className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white leading-tight whitespace-nowrap">{tableOccupancy.occupied}</p>
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mt-1">Occupied</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3">
              <p className="text-base sm:text-lg xl:text-xl 2xl:text-xl font-bold text-gray-950 dark:text-white leading-tight whitespace-nowrap">{tableOccupancy.inactive}</p>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">QR Disabled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Tables & Quick Bill Settle / Release */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 flex items-center justify-center font-bold text-xs shadow-xs">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Active Tables & Quick Action
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
                  {activeDiningCards.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any table card to review & settle bill, or free occupied tables in 1-tap.
              </p>
            </div>
          </div>

          {activeDiningCards.length > 0 && (
            <Link href="/dashboard/orders">
              <Button variant="outline" size="sm" className="text-xs font-bold gap-1 rounded-xl border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                View in Orders <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>

        {activeDiningCards.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-slate-400 dark:text-slate-500 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <span>All tables are free. No active dining tables currently occupied.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {activeDiningCards.map((card) => {
              const isPaid = card.paymentStatus === 'paid' || card.isManualHold;
              const isCompleting = completingOrderIds.includes(card.key) || completingOrderIds.includes(card.tableId || '');

              return (
                <div
                  key={card.key}
                  onClick={() => {
                    if (card.isManualHold && card.tableId) {
                      handleFreeManualTable(card.tableId);
                    } else if (card.order) {
                      if (isPaid) {
                        handleCompleteAndFreeTable(card.order);
                      } else {
                        setQuickSettleOrder(card.order);
                        setQuickSettlePaymentMethod('cash');
                        setIsQuickSettleOpen(true);
                      }
                    }
                  }}
                  className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 transition-all duration-150 flex flex-col justify-between group cursor-pointer shadow-xs hover:shadow-md ${
                    isPaid 
                      ? 'border-emerald-200/80 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-600 hover:bg-slate-50/80 dark:hover:bg-slate-850/80'
                  }`}
                >
                  <div>
                    {/* Top Row: Table Name + Payment & Status Badges */}
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300/80 dark:border-slate-700 font-bold text-xs uppercase tracking-wider">
                          {card.tableName}
                        </span>
                        {card.isReservation && (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold uppercase tracking-wider">
                            Reservation
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {card.isManualHold ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800 text-[10px] font-bold uppercase tracking-wider">
                            Occupied (Seated)
                          </span>
                        ) : isPaid ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Check className="h-3 w-3" /> Paid
                          </span>
                        ) : card.isBillReq ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 text-[10px] font-bold uppercase tracking-wider animate-pulse border border-slate-600">
                            Bill Requested
                          </span>
                        ) : null}

                        {!card.isManualHold && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold uppercase tracking-wider">
                            {card.status === 'served' ? 'Served' : card.status === 'ready' ? 'Ready' : card.status === 'preparing' ? 'Preparing' : card.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order ID & Time */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2.5">
                      {card.order ? `Order ${getFormattedOrderId(card.order, restaurant?.name || '', orders)} • ` : ''}{formatExactTimestamp(card.created_at)}
                    </p>

                    {/* Dish Summary */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate mt-1">
                      {card.dishSummary}
                    </p>
                  </div>

                  {/* Bottom: Total & Action Button */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                        Net Total
                      </span>
                      <span className="text-base font-black text-slate-950 dark:text-white">
                        {formatPrice(card.total, restaurant?.settings?.currency)}
                      </span>
                    </div>

                    {card.isManualHold && card.tableId ? (
                      <button
                        type="button"
                        disabled={isCompleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFreeManualTable(card.tableId!);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isCompleting ? 'Freeing...' : 'Free Table'}</span>
                      </button>
                    ) : isPaid && card.order ? (
                      <button
                        type="button"
                        disabled={isCompleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompleteAndFreeTable(card.order!);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isCompleting ? 'Freeing...' : 'Free Table'}</span>
                      </button>
                    ) : card.order ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickSettleOrder(card.order!);
                          setQuickSettlePaymentMethod('cash');
                          setIsQuickSettleOpen(true);
                        }}
                        className="bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-700 dark:hover:bg-slate-600 text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 transition-all"
                      >
                        <span>Settle</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Second Section: Recent Orders (7 cols) + Top Selling Items (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Recent Orders List */}
        <Card className="lg:col-span-7 min-w-0 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <CardContent className="!p-0 !px-0 !py-0 flex flex-col justify-between h-full">
            <div>
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
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
                {todayRecentOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-2">
                    <ShoppingBag className="h-8 w-8" />
                    No orders placed today yet. Scan a QR code to place an order!
                  </div>
                ) : (
                  todayRecentOrders.slice(0, 4).map((order) => (
                    <div key={order.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">Order {getFormattedOrderId(order, restaurant?.name || '', orders)}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase">
                          {order.table_name || 'N/A'} • {order.items.reduce((s, i) => s + i.quantity, 0)} items • {formatExactTimestamp(order.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {formatPrice(getOrderRevenueAmount(order))}
                        </span>
                        <Link href={`/dashboard/orders?id=${order.id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs font-bold px-3">Manage</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 text-center">
              <Link href="/dashboard/orders" className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1.5 transition-colors">
                <span>Manage all {todayRecentOrders.length} live orders</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Top Selling Items */}
        <Card className="lg:col-span-5 min-w-0 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Top Selling Items</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Most popular dishes ordered today.</p>
                </div>
                <select
                  value={topSellingFilter}
                  onChange={(e) => setTopSellingFilter(e.target.value as any)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                  title="Filter Top Selling Items by Time"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              {filteredTopItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  Complete orders to see top selling items.
                </div>
              ) : (
                <div className="space-y-3.5 pt-3.5">
                  {filteredTopItems.slice(0, 4).map((item, index) => (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {index + 1}
                          </span>
                          <span className="truncate max-w-[170px]">{item.name}</span>
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white shrink-0">{item.count} sold</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${(item.count / (filteredTopItems[0]?.count || 1)) * 100}%` 
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
            </div>

            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <Link href="/dashboard/reports" className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1.5 transition-colors">
                <span>View full item sales reports</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
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
          <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <span className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider">
                  Out of Stock ({stockAlerts.outOfStock.length})
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-white border border-gray-300 dark:border-gray-700">
                  CRITICAL
                </span>
              </div>

              {stockAlerts.outOfStock.length === 0 ? (
                <div className="py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                  No out of stock items. All recipe ingredients are available.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stockAlerts.outOfStock.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <span className="font-bold text-gray-950 dark:text-white block">{item.name}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block mt-0.5">
                          {item.reasons.join(' • ')}
                        </span>
                      </div>
                      <Link href="/dashboard/inventory">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-gray-900 hover:text-black dark:text-gray-200 px-2 font-bold">
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
          <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <span className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider">
                  Low Stock ({stockAlerts.lowStock.length})
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-white border border-gray-300 dark:border-gray-700">
                  WARNING
                </span>
              </div>

              {stockAlerts.lowStock.length === 0 ? (
                <div className="py-4 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                  No low stock items. All inventory levels are healthy.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {stockAlerts.lowStock.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-950 dark:text-white">{item.name}</span>
                          <span className="text-[10px] font-bold bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-200 px-1.5 py-0.5 rounded">
                            {item.maxServings} left
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium block mt-0.5">
                          {item.reasons.join(' • ')}
                        </span>
                      </div>
                      <Link href="/dashboard/inventory">
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-gray-900 hover:text-black dark:text-gray-200 px-2 font-bold">
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
        <div>
          <h3 className="text-sm font-bold text-gray-950 dark:text-white uppercase tracking-wider">
            Order Cancellation & Prepared Food Waste Impact
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Breakdown of today's cancellations by stage, food disposition channels, and net financial loss.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cancellation by Stage */}
          <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <span className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider">
                  Cancellations By Stage
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {cancellationStats.totalCancelledToday} Total Today
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="space-y-0.5">
                    <span className="font-bold text-gray-900 dark:text-gray-100 block">Before Cooking</span>
                    <span className="text-[10px] text-gray-500">Placed / Accepted</span>
                  </div>
                  <span className="font-bold text-gray-950 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.beforePrepCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="space-y-0.5">
                    <span className="font-bold text-gray-900 dark:text-gray-100 block">During Cooking</span>
                    <span className="text-[10px] text-gray-500">In Preparation</span>
                  </div>
                  <span className="font-bold text-gray-950 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.duringPrepCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="space-y-0.5">
                    <span className="font-bold text-gray-900 dark:text-gray-100 block">After Cooking / Served</span>
                    <span className="text-[10px] text-gray-500">Ready / Served</span>
                  </div>
                  <span className="font-bold text-gray-950 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.afterPrepCount}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prepared Food Dispositions */}
          <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <span className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider">
                  Cooked Food Dispositions
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {cancellationStats.totalDispositionsCount} Logged
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100 block">Reallocated / Resold</span>
                    <span className="text-[10px] text-gray-500">Given to other tables</span>
                  </div>
                  <span className="font-bold text-gray-950 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.reallocatedDishesCount} dishes
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100 block">Staff / Complimentary</span>
                    <span className="text-[10px] text-gray-500">Internal consumption</span>
                  </div>
                  <span className="font-bold text-gray-950 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.staffAndOtherDishesCount} dishes
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="font-bold text-gray-900 dark:text-gray-100 block">Discarded / Wasted</span>
                    <span className="text-[10px] text-gray-500">Total food dumped</span>
                  </div>
                  <span className="font-bold text-gray-950 dark:text-white bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-lg text-xs">
                    {cancellationStats.wasteDishesCount} dishes
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Loss Breakdown */}
          <Card className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2.5">
                <span className="text-xs font-bold text-gray-950 dark:text-white uppercase tracking-wider">
                  Unpaid Cancellation Loss
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-white border border-gray-300 dark:border-gray-700">
                  ESTIMATED IMPACT
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Gross Cancelled Bill Value:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    {formatPrice(cancellationStats.totalCancelledGrossValue, restaurant?.settings?.currency)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Payments Retained / Paid:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    +{formatPrice(cancellationStats.paidBeforeCancelValue, restaurant?.settings?.currency)}
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500">Wasted Raw Ingredient Cost:</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100">
                    -{formatPrice(cancellationStats.estimatedWasteFoodCost, restaurant?.settings?.currency)}
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="font-bold text-gray-950 dark:text-white block text-xs">Net Financial Loss:</span>
                    <span className="text-[10px] text-gray-500 font-medium">Uncollected bill + wasted stock</span>
                  </div>
                  <span className="font-bold text-gray-950 dark:text-white text-sm">
                    {formatPrice(cancellationStats.estimatedLoss, restaurant?.settings?.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Settle Bill Modal - Strictly Monochrome Black & Gray Theme */}
      {isQuickSettleOpen && quickSettleOrder && restaurant && (
        <Dialog 
          isOpen={isQuickSettleOpen} 
          onClose={() => {
            if (!isSubmittingSettle) {
              setIsQuickSettleOpen(false);
              setQuickSettleOrder(null);
            }
          }} 
          title="SETTLE TABLE BILL"
          size="md"
        >
          <div className="space-y-4 p-1">
            {(() => {
              const calcResult = calculateBillingTotals({
                items: quickSettleOrder.items || [],
                batches: quickSettleOrder.batches || [],
                discountAmount: Number(quickSettleOrder.discount_amount || 0),
                offerCode: quickSettleOrder.offer_code,
                specialInstructions: quickSettleOrder.special_instructions,
                offers: restaurant.settings?.offers || [],
                settings: restaurant.settings || {},
                gstNumber: restaurant.gst_number,
                gstEnabled: restaurant.settings?.gst_enabled,
                gstPercentage: restaurant.settings?.gst_percentage || 0,
                serviceChargeEnabled: restaurant.settings?.service_charge_enabled !== false,
                serviceChargePercentage: restaurant.settings?.service_charge_percentage || 0,
                customCharges: restaurant.settings?.custom_charges || []
              });

              const currency = restaurant.settings?.currency || 'INR';

              return (
                <>
                  {/* Top Bill Banner - Refined Soft Slate */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Net Payable Amount ({quickSettleOrder.table_name || 'Takeaway'})
                    </p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatPrice(calcResult.grandTotal, currency)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Order {getFormattedOrderId(quickSettleOrder, restaurant.name || '', orders)} • {quickSettleOrder.items?.reduce((s, i) => s + i.quantity, 0) || 0} items
                    </p>
                    {(() => {
                      const cust = parseCustomerDetailsFromOrder(quickSettleOrder);
                      if (!cust.name) return null;
                      return (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Billed To:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{cust.name}</span>
                          {cust.phone && <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">({cust.phone})</span>}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Itemized Order Preview (Scrollable) */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>Ordered Dishes</span>
                      <span>Amount</span>
                    </div>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1 text-xs">
                      {(quickSettleOrder.items || []).filter(item => !item.is_cancelled && item.status !== 'cancelled').map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1 px-1">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[240px]">
                            {item.quantity}x {item.menu_item_name}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                            {formatPrice(item.price * item.quantity, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Breakdown Table - Clean Monochrome */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                      <span>Subtotal</span>
                      <span>{formatPrice(calcResult.validSubtotal, currency)}</span>
                    </div>
                    {calcResult.discountAmount > 0 && (
                      <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                        <span>Discount {quickSettleOrder.offer_code ? `(${quickSettleOrder.offer_code})` : ''}</span>
                        <span>- {formatPrice(calcResult.discountAmount, currency)}</span>
                      </div>
                    )}
                    {calcResult.gstAmount > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                        <span>GST ({restaurant.settings?.gst_percentage || 5}%)</span>
                        <span>{formatPrice(calcResult.gstAmount, currency)}</span>
                      </div>
                    )}
                    {calcResult.serviceChargeAmount > 0 && (
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                        <span>Service Charge</span>
                        <span>{formatPrice(calcResult.serviceChargeAmount, currency)}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                      <span>Grand Total</span>
                      <span>{formatPrice(calcResult.grandTotal, currency)}</span>
                    </div>
                  </div>

                  {/* Payment Mode Selector - Refined Slate Theme */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Select Payment Mode
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['cash', 'upi', 'card', 'split'] as const).map((method) => {
                        const isSelected = quickSettlePaymentMethod === method;
                        const labels = {
                          cash: 'Cash',
                          upi: 'UPI / QR',
                          card: 'Card',
                          split: 'Split Bill'
                        };
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setQuickSettlePaymentMethod(method)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 border border-slate-700 dark:border-slate-200 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {labels[method]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setIsQuickSettleOpen(false);
                        setQuickSettleOrder(null);
                      }}
                      disabled={isSubmittingSettle}
                      className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      isLoading={isSubmittingSettle}
                      disabled={isSubmittingSettle}
                      onClick={handleQuickSettleConfirm}
                      className="bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all"
                    >
                      Confirm Payment ({formatPrice(calcResult.grandTotal, currency)})
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </Dialog>
      )}
    </div>
  );
}
