'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, Order, Restaurant, CustomerRequest, OrderBatch, VALID_ORDER_TRANSITIONS } from '@/lib/db';
import { calculateBillingTotals } from '@/lib/billingEngine';
import { getActiveUser, supabase } from '@/lib/supabase';
import { useRestaurant } from '../../layout';
import { formatPrice, formatDate, getFormattedOrderId, matchesOrderSearchQuery, parseCustomerDetailsFromOrder } from '@/lib/utils';
import { formatExactTimestamp } from '@/lib/timestamp';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Search, Printer, Check, X, AlertCircle, ShoppingBag, Bell, ClipboardList, CheckCircle, ChefHat, Plus, XCircle, Banknote, CreditCard, Copy, ArrowLeft, Calendar, Clock, UserCheck, Users, UtensilsCrossed, Phone, UserPlus } from 'lucide-react';
import PunchOrderModal from '@/components/dashboard/PunchOrderModal';
import { playLoudBell, unlockAudio } from '@/lib/soundAlert';
import { registerServiceWorkerAndPush } from '@/lib/registerWebPush';
import { broadcastOrderRealtimeEvent } from '@/lib/realtime';
import { dashboardStore } from '@/lib/dashboardStore';
import { usePreviewMode } from '@/context/PreviewModeContext';
import { DEMO_ORDERS } from '@/lib/demoPreviewData';

export interface ParsedReservation {
  date: string;
  time: string;
  guests: string;
  name: string;
  phone: string;
  notes: string;
  targetDateTime: Date | null;
}

export function parseReservationDetails(order: Order): ParsedReservation {
  const text = order.special_instructions || (order.batches && order.batches[0]?.special_instructions) || '';
  const result: ParsedReservation = {
    date: '',
    time: '',
    guests: '1',
    name: '',
    phone: '',
    notes: '',
    targetDateTime: null
  };

  const dateMatch = text.match(/Date:\s*([^|]+)/i);
  if (dateMatch) result.date = dateMatch[1].trim();

  const timeMatch = text.match(/Time:\s*([^|]+)/i);
  if (timeMatch) result.time = timeMatch[1].trim();

  const guestsMatch = text.match(/Guests:\s*([^|]+)/i);
  if (guestsMatch) result.guests = guestsMatch[1].trim();

  const nameMatch = text.match(/Name:\s*([^|]+)/i);
  if (nameMatch) result.name = nameMatch[1].trim();

  const phoneMatch = text.match(/Contact:\s*([^|]+)/i);
  if (phoneMatch) result.phone = phoneMatch[1].trim();

  const notesMatch = text.match(/Notes:\s*(.+)$/i);
  if (notesMatch) result.notes = notesMatch[1].trim();

  if (result.date && result.time) {
    try {
      const d = new Date(`${result.date} ${result.time}`);
      if (!isNaN(d.getTime())) {
        result.targetDateTime = d;
      }
    } catch (_) {}
  }

  if (!result.targetDateTime && order.created_at) {
    const created = new Date(order.created_at);
    result.targetDateTime = new Date(created.getTime() + 60 * 60 * 1000);
  }

  return result;
}

/**
 * BUG-OWNER-002 & BUG-OWNER-003: Table Number and Sequence Formatting
 * Cleanly separates table identifier (Primary) from 4-digit sequence (Secondary).
 */
export function getOrderDisplayInfo(order: Order, restaurantName = '', allOrders: Order[] = []) {
  // 1. Table Display (Primary Visual Element)
  let tableDisplay = 'TABLE 1';
  if (order.order_type === 'takeaway') {
    tableDisplay = 'TAKEAWAY';
  } else if (order.order_type === 'reservation') {
    tableDisplay = 'RESERVATION';
  } else if (order.table_name) {
    const cleanName = order.table_name.trim();
    const numMatch = cleanName.match(/\d+/);
    tableDisplay = numMatch ? `TABLE ${numMatch[0]}` : cleanName.toUpperCase();
  } else if ((order as any).table_number) {
    tableDisplay = `TABLE ${(order as any).table_number}`;
  }

  // 2. Staff Display Order ID (e.g. A7K-26T0001, A7K-26D0038)
  const shortOrderId = getFormattedOrderId(order, restaurantName, allOrders, false);

  return { tableDisplay, shortOrderId };
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('id');

  const { restaurant, profile, activeRole } = useRestaurant();
  const { isPreviewMode } = usePreviewMode();
  const restId = restaurant?.id || profile?.restaurant_id;
  const initialCachedOrders = restId ? dashboardStore.getCachedOrders(restId) : null;
  const [orders, setOrders] = useState<Order[]>(() => initialCachedOrders || []);
  const [optimisticStatusMap, setOptimisticStatusMap] = useState<Record<string, Order['status']>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderIdParam || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(() => !initialCachedOrders);
  const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders');
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);
  const [orderQueue, setOrderQueue] = useState<'dine_in' | 'takeaway' | 'reservations'>('dine_in');
  const [seatGuestModalOpen, setSeatGuestModalOpen] = useState(false);

  const orderListContainerRef = useRef<HTMLDivElement>(null);
  const optimisticStatusMapRef = useRef<Record<string, Order['status']>>({});

  const effectiveOrders = useMemo<Order[]>(() => {
    if (orders && orders.length > 0) return orders;
    if (isPreviewMode) {
      return DEMO_ORDERS.map((d, i) => ({
        id: d.id,
        restaurant_id: restId || 'demo-rest',
        table_id: `tbl-${i}`,
        table_name: d.tableDisplay,
        order_type: d.orderType as any,
        status: d.status as any,
        special_instructions: d.customerNote,
        subtotal: d.subtotal,
        gst: d.gst,
        service_charge: 0,
        total: d.total,
        grand_total: d.total,
        created_at: new Date(Date.now() - d.elapsedMinutes * 60000).toISOString(),
        daily_sequence: 30 + i,
        customer_arrival_minutes: 20,
        items: [
          {
            id: `item-${d.id}-1`,
            order_id: d.id,
            menu_item_id: `mi-${i}`,
            menu_item_name: d.itemsSummary,
            quantity: d.itemsCount || 1,
            price: d.subtotal,
            status: d.status
          }
        ],
        batches: [
          {
            id: `batch-${d.id}-1`,
            order_id: d.id,
            batch_number: 1,
            status: d.status as any,
            created_at: new Date(Date.now() - d.elapsedMinutes * 60000).toISOString(),
            updated_at: new Date(Date.now() - d.elapsedMinutes * 60000).toISOString(),
            special_instructions: d.customerNote,
            items: [
              {
                id: `item-${d.id}-1`,
                order_id: d.id,
                menu_item_id: `mi-${i}`,
                menu_item_name: d.itemsSummary,
                quantity: d.itemsCount || 1,
                price: d.subtotal,
                status: d.status
              }
            ]
          }
        ]
      }));
    }
    return [];
  }, [orders, isPreviewMode, restId]);

  const rawSelectedOrder = (selectedOrderId ? effectiveOrders.find(o => o.id === selectedOrderId || getFormattedOrderId(o, restaurant?.name || '', effectiveOrders) === selectedOrderId) : null) || (effectiveOrders.length > 0 ? effectiveOrders[0] : null);
  const selectedOrder = useMemo(() => {
    if (!rawSelectedOrder) return null;
    const optStatus = optimisticStatusMap[rawSelectedOrder.id];
    const canonicalStatus = optStatus || db.calculateAggregateOrderStatus(rawSelectedOrder.status, rawSelectedOrder.batches);
    const updatedBatches = optStatus
      ? (rawSelectedOrder.batches || []).map((b: any) => ({ ...b, status: optStatus }))
      : rawSelectedOrder.batches;
    return {
      ...rawSelectedOrder,
      status: canonicalStatus,
      batches: updatedBatches
    };
  }, [rawSelectedOrder, optimisticStatusMap]);

  const effectiveStatus = (selectedOrder ? optimisticStatusMap[selectedOrder.id] : null) || selectedOrder?.status;

  useEffect(() => {
    optimisticStatusMapRef.current = optimisticStatusMap;
  }, [optimisticStatusMap]);
  const [reservationToSeat, setReservationToSeat] = useState<Order | null>(null);
  const [selectedTableForSeat, setSelectedTableForSeat] = useState<string>('');
  const [isSeatingGuest, setIsSeatingGuest] = useState(false);
  const [allTables, setAllTables] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const notifiedReservationStagesRef = useRef<Map<string, Set<string>>>(new Map());

  // Real-time toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean; title?: string; variant?: 'success' | 'info' | 'warning' | 'error' } | null>(null);
  const showToast = (message: string, title?: string, variant?: 'success' | 'info' | 'warning' | 'error') => {
    setToast({ message, title: title || (variant === 'info' ? 'Order Notice' : variant === 'error' ? 'Error' : 'New Order'), visible: true, variant: variant || 'success' });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? { ...prev, visible: false } : prev);
    }, 5000);
  };

  const [processingRequestIds, setProcessingRequestIds] = useState<string[]>([]);
  const [processingOrderIds, setProcessingOrderIds] = useState<string[]>([]);
  const processingOrderIdsRef = useRef<Set<string>>(new Set());
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [customerLookupOpen, setCustomerLookupOpen] = useState(false);
  const [customerLookupQuery, setCustomerLookupQuery] = useState('');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printOrderData, setPrintOrderData] = useState<any | null>(null);

  const mergeGroupIdParam = searchParams.get('merge_group_id');
  const [mergedGroupDetails, setMergedGroupDetails] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'merged' | 'single'>('merged');
  const [selectedOwnerTableId, setSelectedOwnerTableId] = useState<string | null>(null);
  const [showOwnerTimeline, setShowOwnerTimeline] = useState<boolean>(false);

  useEffect(() => {
    async function loadMergedGroup() {
      if (!restaurant?.id) return;

      let targetGroupId = mergeGroupIdParam;
      let targetSessionId: string | undefined = undefined;

      if (selectedOrder?.merge_group_id) {
        targetGroupId = selectedOrder.merge_group_id;
        targetSessionId = (selectedOrder as any).merge_session_id;
      }

      if (!targetGroupId && selectedOrder?.table_id) {
        const activeMerge = await db.getActiveMergeGroupForTable(restaurant.id, selectedOrder.table_id);
        if (activeMerge) {
          targetGroupId = activeMerge.group.id;
          targetSessionId = activeMerge.session?.id;
        }
      }

      if (targetGroupId) {
        const details = await db.getMergedGroupDetails(restaurant.id, targetGroupId, targetSessionId);
        if (details) {
          setMergedGroupDetails(details);
          setViewMode('merged');
          return;
        }
      }
      setMergedGroupDetails(null);
    }
    loadMergedGroup();
  }, [selectedOrder?.id, selectedOrder?.table_id, selectedOrder?.merge_group_id, mergeGroupIdParam, restaurant?.id]);

  const [payMergedModalOpen, setPayMergedModalOpen] = useState(false);
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<'cash' | 'online_upi'>('cash');
  const [submittingPayMerged, setSubmittingPayMerged] = useState(false);
  const submittingPayMergedRef = useRef(false);

  const handlePayMergedGroup = () => {
    if (!mergedGroupDetails) return;
    setPayMergedModalOpen(true);
  };

  const executePayMergedGroup = async () => {
    if (!mergedGroupDetails || !restaurant) return;
    if (submittingPayMergedRef.current || submittingPayMerged) return;
    submittingPayMergedRef.current = true;
    setSubmittingPayMerged(true);

    try {
      const sessionId = mergedGroupDetails.sessionId || mergedGroupDetails.group?.active_session_id;
      if (sessionId) {
        await db.completeMergedSession(restaurant.id, sessionId, paymentMethodChoice);
      } else {
        const { data: groupOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('restaurant_id', restaurant.id)
          .eq('merge_group_id', mergedGroupDetails.group.id)
          .neq('status', 'cancelled')
          .neq('payment_status', 'paid');

        for (const o of (groupOrders || [])) {
          await db.updateOrderStatus(o.id, 'completed', profile?.full_name || 'Cashier');
        }
      }

      setPayMergedModalOpen(false);
      await safeReloadOrders(restaurant.id);
      alert(`Merged Session "${mergedGroupDetails.group.name}" completely settled & paid via ${paymentMethodChoice.toUpperCase()}.`);
    } catch (err: any) {
      alert('Failed to complete merged session: ' + err.message);
    } finally {
      submittingPayMergedRef.current = false;
      setSubmittingPayMerged(false);
    }
  };

  const handleUnmergeCurrentGroup = async () => {
    if (!mergedGroupDetails || !restaurant) return;
    if (!confirm(`Unmerge group "${mergedGroupDetails.group.name}"?\n\nThis group has active orders. Unmerging will affect future orders only. Existing orders will remain under ${mergedGroupDetails.group.name}.`)) return;

    try {
      await db.unmergeTableGroup(restaurant.id, mergedGroupDetails.group.id);
      await safeReloadOrders(restaurant.id);
    } catch (err: any) {
      alert('Failed to unmerge group: ' + err.message);
    }
  };

  const alertedOrderIds = useRef<Set<string>>(new Set());
  const alertedBatchIds = useRef<Set<string>>(new Set());
  const ordersRef = useRef<Order[]>(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  const selectedOrderIdRef = useRef<string | null>(selectedOrderId);
  useEffect(() => {
    selectedOrderIdRef.current = selectedOrderId;
  }, [selectedOrderId]);
  const isReloadingRef = useRef(false);
  const pendingReloadRef = useRef(false);



  const alertedReqIds = useRef<Set<string>>(new Set());

  // Unlock audio on user click/tap & Register Web Push for Waiter
  useEffect(() => {
    const handleUnlock = () => {
      unlockAudio();
    };
    window.addEventListener('click', handleUnlock, { once: true });
    window.addEventListener('touchstart', handleUnlock, { once: true });

    if (profile?.id && restaurant?.id) {
      registerServiceWorkerAndPush(profile.id, restaurant.id, 'waiter');
    }

    return () => {
      window.removeEventListener('click', handleUnlock);
      window.removeEventListener('touchstart', handleUnlock);
    };
  }, [profile?.id, restaurant?.id]);

  const showDesktopNotification = (order: Order) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        const title = `NEW ORDER - ${order.table_name || 'Table X'}`;
        const body = `Order #${order.id.slice(-4).toUpperCase()} received. Total: ₹${order.total || order.grand_total || 0}`;
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/icon-192.png',
              badge: '/favicon-32x32.png',
              tag: `waiter-order-${order.id}`,
              data: { url: '/dashboard/orders' }
            });
          }).catch(() => {
            new Notification(title, { body, icon: '/icon-192.png' });
          });
        } else {
          new Notification(title, { body, icon: '/icon-192.png' });
        }
      } catch (e) {
        new Notification(order.table_name || 'New Order', { body: `New order received`, icon: '/icon-192.png' });
      }
    }
  };

  const loadInitialData = async (restId: string) => {
    const [allOrders, reqs, tbls] = await Promise.all([
      db.getOrders(restId),
      db.getCustomerRequests(restId),
      db.getTables(restId)
    ]);
    setAllTables(tbls || []);

    const waiterTableIds = new Set(
      (tbls || [])
        .filter(t => t.assigned_waiter_id === profile?.id)
        .map(t => t.id)
    );

    const filteredForRole = activeRole === 'waiter'
      ? allOrders.filter(o => {
          if (!['ready', 'served', 'completed', 'accepted', 'preparing'].includes(o.status)) return false;
          return o.table_id ? waiterTableIds.has(o.table_id) : true;
        })
      : allOrders;
    setOrders(filteredForRole);
    dashboardStore.setCachedOrders(restId, allOrders);

    // Cache existing order IDs on initial load so we don't chime for them
    allOrders.forEach(o => alertedOrderIds.current.add(o.id));

    // Load pending & active requests - filtered for waiter
    const activeReqs = (reqs || []).filter(r => {
      if (r.status !== 'pending') return false;
      if (activeRole === 'waiter' && r.table_id) {
        return waiterTableIds.has(r.table_id);
      }
      return true;
    });
    setCustomerRequests(activeReqs);

    if (orderIdParam) {
      setSelectedOrderId(orderIdParam);
    } else if (filteredForRole.length > 0 && !selectedOrderIdRef.current) {
      setSelectedOrderId(filteredForRole[0].id);
    }

    setLoading(false);
  };

  // Clock interval for ETA and reservation countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Reservation reminders & notification engine (BUG-RES-004)
  useEffect(() => {
    const activeReservations = orders.filter(o => o.order_type === 'reservation' && o.status !== 'cancelled' && o.status !== 'completed');
    activeReservations.forEach(resOrder => {
      const parsed = parseReservationDetails(resOrder);
      if (!parsed.targetDateTime) return;
      const diffMins = Math.round((parsed.targetDateTime.getTime() - currentTime) / (60 * 1000));

      let stages = notifiedReservationStagesRef.current.get(resOrder.id);
      if (!stages) {
        stages = new Set<string>();
        notifiedReservationStagesRef.current.set(resOrder.id, stages);
      }

      // 30 min reminder
      if (diffMins <= 30 && diffMins > 15 && !stages.has('30m')) {
        stages.add('30m');
        playLoudBell('waiter');
        showToast(
          `Reservation Reminder: ${parsed.name || 'Guest'} party of ${parsed.guests} arrives in ~${diffMins} mins (${parsed.time})`,
          '30m Reminder',
          'warning'
        );
      }

      // 15 min reserve table alert
      if (diffMins <= 15 && diffMins >= -15 && !stages.has('15m')) {
        stages.add('15m');
        playLoudBell('waiter');
        showToast(
          `Table Reserved: ${parsed.name || 'Guest'} due in 15 mins (${parsed.time}). Table ready for seating.`,
          '15m Reserve Table Alert',
          'info'
        );
      }

      // 15 min past booking time no-show alert
      if (diffMins < -15 && !stages.has('no_show')) {
        stages.add('no_show');
        showToast(
          `No-Show Alert: Reservation for ${parsed.name || 'Guest'} is ${Math.abs(diffMins)} minutes overdue.`,
          'Reservation No-Show',
          'error'
        );
      }
    });
  }, [orders, currentTime]);

  const hasHandledDeepLinkRef = useRef(false);
  // Priority 9 (Phase-20E): Open Order deep-linking with auto-scroll, statusFilter unblocking, and focus
  useEffect(() => {
    if (hasHandledDeepLinkRef.current || loading || !orderIdParam || orders.length === 0) return;
    
    const targetOrder = orders.find(o => o.id === orderIdParam || getFormattedOrderId(o, restaurant?.name || '', orders) === orderIdParam);
    if (targetOrder) {
      setSelectedOrderId(targetOrder.id);
      if (statusFilter !== 'all' && targetOrder.status !== statusFilter) {
        setStatusFilter('all');
      }
    } else {
      setSelectedOrderId(orderIdParam);
    }
    hasHandledDeepLinkRef.current = true;

    const timer = setTimeout(() => {
      const targetId = targetOrder ? targetOrder.id : orderIdParam;
      const el = document.getElementById(`order-item-${targetId}`);
      if (el) {
        el.focus();
      }

      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        const detailEl = document.getElementById('order-details-panel');
        if (detailEl) {
          detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [orderIdParam, orders, statusFilter, loading]);

  useEffect(() => {
    if (restaurant?.id) {
      loadInitialData(restaurant.id);
    }
  }, [restaurant?.id]);

  const safeReloadOrders = async (restId: string) => {
    if (isReloadingRef.current) {
      pendingReloadRef.current = true;
      return;
    }
    isReloadingRef.current = true;
    try {
      const [allOrders, tbls] = await Promise.all([
        db.getOrders(restId),
        db.getTables(restId)
      ]);
      setAllTables(tbls || []);
      dashboardStore.setCachedOrders(restId, allOrders);

      const waiterTableIds = new Set(
        (tbls || [])
          .filter(t => t.assigned_waiter_id === profile?.id)
          .map(t => t.id)
      );

      const filteredOrders = activeRole === 'waiter'
        ? allOrders.filter(o => {
            if (!['ready', 'served', 'completed', 'accepted', 'preparing'].includes(o.status)) return false;
            return o.table_id ? waiterTableIds.has(o.table_id) : true;
          })
        : allOrders;
      setOrders(filteredOrders.map(o => {
        const inFlight = Array.from(processingOrderIdsRef.current).find(k => k.startsWith(`${o.id}:`));
        const inFlightStatus = inFlight ? (inFlight.split(':')[1] as Order['status']) : undefined;
        const optStatus = inFlightStatus || optimisticStatusMapRef.current[o.id] || optimisticStatusMap[o.id];
        if (optStatus) {
          return {
            ...o,
            status: optStatus,
            batches: (o.batches || []).map((b: any) => ({ ...b, status: optStatus }))
          };
        }
        return o;
      }));

      let reqs = await db.getCustomerRequests(restId);
      let activeReqs = (reqs || []).filter(r => {
        if (r.status !== 'pending') return false;
        if (activeRole === 'waiter' && r.table_id) {
          return waiterTableIds.has(r.table_id);
        }
        return true;
      });
      setCustomerRequests(activeReqs);
    } catch (e) {
      console.error('Failed to reload orders:', e);
    } finally {
      isReloadingRef.current = false;
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        await safeReloadOrders(restId);
      }
    }
  };


  const reloadFnRef = useRef(safeReloadOrders);
  useEffect(() => {
    reloadFnRef.current = safeReloadOrders;
  });

  // Realtime Supabase Subscription for Orders, Requests & Batches
  useEffect(() => {
    if (!restaurant) return;
    const restId = restaurant.id;

    const handleResync = () => {
      console.log('Force resync event received. Reloading Orders data...');
      reloadFnRef.current(restId);
    };
    window.addEventListener('force-resync', handleResync);

    console.log(`Subscribing to live orders, requests & batches updates for restaurant: ${restId}`);
    const channel = supabase
      .channel(`live_orders_${restId}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'broadcast',
        { event: 'new-order' },
        async (payload) => {
          console.log('Realtime broadcast live orders new-order received:', payload);
          const newOrderPayload = payload.payload?.new || payload.payload?.updatedOrder;
          if (newOrderPayload && !alertedOrderIds.current.has(newOrderPayload.id)) {
            alertedOrderIds.current.add(newOrderPayload.id);
            playLoudBell('waiter');
            setToast({ message: `New Order Received - ${newOrderPayload.table_name || 'Table'}`, visible: true });
            setTimeout(() => {
              setToast(prev => prev && prev.message.includes(newOrderPayload.table_name || 'Table') ? { ...prev, visible: false } : prev);
            }, 5000);
          }
          await reloadFnRef.current(restId);
        }
      )
      .on(
        'broadcast',
        { event: 'order-status-updated' },
        async (payload) => {
          console.log('Realtime broadcast live orders order-status-updated received:', payload);
          const updated = payload.payload?.updatedOrder;
          if (updated) {
            setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
          }
          await reloadFnRef.current(restId);
        }
      )
      .on(
        'broadcast',
        { event: 'payment-updated' },
        async (payload) => {
          console.log('Realtime broadcast live orders payment-updated received:', payload);
          const pOrderId = payload.payload?.orderId;
          const pStatus = payload.payload?.paymentStatus || 'paid';
          if (pOrderId) {
            setOrders(prev => prev.map(o => o.id === pOrderId ? { ...o, payment_status: pStatus, status: 'completed' } : o));
          }
          await reloadFnRef.current(restId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restId}`
        },
        async (payload) => {
          console.log('Realtime Live Orders order change payload received:', payload);
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order;
            setOrders(prev => prev.map(o => {
              if (o.id === updated.id) {
                const inFlight = Array.from(processingOrderIdsRef.current).some(k => k.startsWith(`${o.id}:`));
                const optStatus = optimisticStatusMapRef.current[o.id] || optimisticStatusMap[o.id];
                if (inFlight || optStatus) {
                  return { ...o, ...updated, status: optStatus || o.status, batches: (o.batches || []).map((b: any) => ({ ...b, status: optStatus || b.status })) };
                }
                return { ...o, ...updated };
              }
              return o;
            }));
          }
          await reloadFnRef.current(restId);

          if (payload.eventType === 'INSERT') {
            const newOrderPayload = payload.new as Order;
            // BUG-OWNER-005: Auto-scroll only for a brand-new order when user is already near the top (<100px)
            const listEl = orderListContainerRef.current;
            const isNearTop = listEl ? listEl.scrollTop < 100 : (typeof window !== 'undefined' && window.scrollY < 100);
            if (isNearTop) {
              if (listEl) {
                listEl.scrollTo({ top: 0, behavior: 'smooth' });
              } else if (typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }

            if (!alertedOrderIds.current.has(newOrderPayload.id)) {
              alertedOrderIds.current.add(newOrderPayload.id);
              console.log(`New order detected! Playing chimes for order ID: ${newOrderPayload.id}`);
              
              // Fetch full order with items and display toast banner
              const fullOrder = await db.getOrderById(newOrderPayload.id);
              if (fullOrder) {
                playLoudBell('waiter');
                showDesktopNotification(fullOrder);
                setToast({ message: `New Order Received - ${fullOrder.table_name || 'Table X'}`, visible: true });
                
                setTimeout(() => {
                  setToast(prev => prev && prev.message.includes(fullOrder.table_name || 'Table X') ? { ...prev, visible: false } : prev);
                }, 5000);
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_requests',
          filter: `restaurant_id=eq.${restId}`
        },
        async (payload) => {
          console.log('Realtime Live Orders request change payload received:', payload);
          await reloadFnRef.current(restId);

          if (payload.eventType === 'INSERT') {
            const req = payload.new as CustomerRequest;
            if (req && !alertedReqIds.current.has(req.id)) {
              alertedReqIds.current.add(req.id);
              playLoudBell('waiter');
              setToast({
                message: `${req.table_name || 'Table'} requested ${req.type === 'call_waiter' ? 'Waiter Assistance' : 'The Bill'}`,
                visible: true
              });
              setTimeout(() => {
                setToast(prev => prev && prev.message.includes(req.table_name || 'Table') ? { ...prev, visible: false } : prev);
              }, 6000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_batches'
        },
        async (payload) => {
          console.log('Realtime Live Orders batch change payload received:', payload);
          const batch = payload.new as OrderBatch;
          if (!batch) return;
          
          setOrders(prev => prev.map(o => {
            if (o.id === batch.order_id) {
              const existingBatches = o.batches || [];
              const batchIndex = existingBatches.findIndex(b => b.id === batch.id);
              let updatedBatches: OrderBatch[];
              if (batchIndex >= 0) {
                updatedBatches = [...existingBatches];
                updatedBatches[batchIndex] = { ...updatedBatches[batchIndex], ...batch };
              } else {
                updatedBatches = [...existingBatches, batch];
              }
              const newStatus = db.calculateAggregateOrderStatus(o.status, updatedBatches);
              return {
                ...o,
                batches: updatedBatches,
                status: newStatus
              };
            }
            return o;
          }));

          // Fast tenant check before executing DB queries for cross-tenant events
          const isLocalOrder = ordersRef.current.some(o => o.id === batch.order_id);
          if (isLocalOrder) {
            await reloadFnRef.current(restId);
          } else {
            const { data: parentOrder } = await supabase
              .from('orders')
              .select('restaurant_id')
              .eq('id', batch.order_id)
              .eq('restaurant_id', restId)
              .single();

            if (parentOrder) {
              await reloadFnRef.current(restId);
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`Supabase Realtime Live Orders subscription status: ${status}`);
        if (err) {
          console.error(`Supabase Realtime Live Orders subscription error:`, err);
        }
      });

    return () => {
      console.log('Cleaning up Live Orders realtime channel subscription...');
      supabase.removeChannel(channel);
      window.removeEventListener('force-resync', handleResync);
    };
  }, [restaurant?.id]);

  // BUG-OWNER-005 & BUG-OWNER-006: Keep selection in local state with ZERO scroll jump and NO URL mutation
  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
  };

  // Cancellation & Food Disposition State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellationReasonOption, setCancellationReasonOption] = useState('Customer refused / did not pay');
  const [customCancellationNotes, setCustomCancellationNotes] = useState('');
  const [dispositionType, setDispositionType] = useState<'reallocated' | 'staff_meal' | 'complimentary' | 'owner_internal' | 'waste' | 'other'>('waste');
  const [destinationOrderId, setDestinationOrderId] = useState('');
  const [destinationOrderDisplayId, setDestinationOrderDisplayId] = useState('');
  const [wasteReason, setWasteReason] = useState('Customer Refused Order');
  const [dispositionNotes, setDispositionNotes] = useState('');
  const [restoreInventoryStock, setRestoreInventoryStock] = useState(false);
  const [refundStatusSelection, setRefundStatusSelection] = useState<'none' | 'pending' | 'processed' | 'declined'>('none');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

  const updateOrderStatus = async (status: Order['status'], cancellationReason?: string) => {
    if (!selectedOrder || !restaurant) return;

    if (status === 'cancelled') {
      const isEarlyStage = ['new', 'accepted'].includes(selectedOrder.status);
      setCancellationReasonOption('Customer refused / did not pay');
      setCustomCancellationNotes('');
      setDispositionType('waste');
      setDestinationOrderId('');
      setDestinationOrderDisplayId('');
      setWasteReason('Customer Refused Order');
      setDispositionNotes('');
      setRestoreInventoryStock(isEarlyStage ? true : false);
      setRefundStatusSelection(selectedOrder.payment_status === 'paid' ? 'pending' : 'none');
      setCancelModalOpen(true);
      return;
    }

    // Client-side state machine guard
    const allowedTransitions = VALID_ORDER_TRANSITIONS[selectedOrder.status] || [];
    if (!allowedTransitions.includes(status)) {
      showToast(`Cannot change status from "${selectedOrder.status}" to "${status}".`, "Invalid Action", "warning");
      return;
    }

    const orderIdToUpdate = selectedOrder.id;
    const actionKey = `${orderIdToUpdate}:${status}`;
    if (processingOrderIdsRef.current.has(actionKey)) return;
    processingOrderIdsRef.current.add(actionKey);

    // Snapshot original status & batches for robust error rollback
    const origOrder = orders.find(o => o.id === orderIdToUpdate);
    const origStatus = origOrder?.status || selectedOrder.status;
    const origBatches = origOrder?.batches || selectedOrder.batches;
    
    // Immediate safe optimistic update (< 10ms visible DOM response)
    optimisticStatusMapRef.current[orderIdToUpdate] = status;
    setOptimisticStatusMap(prev => ({ ...prev, [orderIdToUpdate]: status }));
    setProcessingOrderIds(prev => [...prev, actionKey]);

    try {
      if (status === 'served') {
        window.dispatchEvent(new Event('stop-waiter-sound'));
      }
      const res = await fetch('/api/staff/update-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderIdToUpdate,
          newStatus: status,
          staffName: profile?.full_name || activeRole || 'Staff Member',
          cancellationReason
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        if (res.status === 409) {
          const conflictErr: any = new Error(errJson.error || 'Status conflict');
          conflictErr.code = errJson.code || 'STALE_STATUS_CONFLICT';
          throw conflictErr;
        }
        throw new Error(errJson.error || `Failed to update order status: HTTP ${res.status}`);
      }

      const resData = await res.json();
      const updated = resData.order;
      if (updated) {
        optimisticStatusMapRef.current[orderIdToUpdate] = updated.status;
        setOptimisticStatusMap(prev => ({ ...prev, [orderIdToUpdate]: updated.status }));
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
      }
      
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      // Functional rollback on failure
      delete optimisticStatusMapRef.current[orderIdToUpdate];
      setOptimisticStatusMap(prev => {
        const next = { ...prev };
        delete next[orderIdToUpdate];
        return next;
      });
      setOrders(prev => prev.map(o => {
        if (o.id === orderIdToUpdate) {
          return {
            ...o,
            status: origStatus,
            batches: origBatches
          };
        }
        return o;
      }));

      if (err.code === 'ORDER_ALREADY_SERVED' || err.message?.includes('already served')) {
        window.dispatchEvent(new Event('stop-waiter-sound'));
        showToast("Order already served by another team member.", "Waiter Notice", "info");
        return;
      }
      if (err.code === 'STALE_STATUS_CONFLICT' || err.code === 'INVALID_STATUS_TRANSITION') {
        showToast(err.message || "Order status was updated concurrently.", "Sync Notice", "info");
        return;
      }
      showToast(`Failed to update order status: ${err.message}`, "Error", "error");
    } finally {
      processingOrderIdsRef.current.delete(actionKey);
      setProcessingOrderIds(prev => prev.filter(id => id !== actionKey));
    }
  };

  const handleConfirmCancellationWithDisposition = async () => {
    if (!selectedOrder || !restaurant) return;

    if (cancellationReasonOption === 'Other' && !customCancellationNotes.trim()) {
      alert('Please specify the cancellation reason in the additional notes.');
      return;
    }

    const fullReason = customCancellationNotes.trim() 
      ? (cancellationReasonOption === 'Other' ? customCancellationNotes.trim() : `${cancellationReasonOption}: ${customCancellationNotes.trim()}`)
      : cancellationReasonOption;

    if (!fullReason.trim()) {
      alert('A valid cancellation reason is required.');
      return;
    }

    // Validation: served food cannot be reallocated
    const wasServed = selectedOrder.status === 'served' || selectedOrder.items?.some(i => i.is_served || i.status === 'served');
    if (wasServed && dispositionType === 'reallocated') {
      alert('Food Safety Policy: Food that was already served cannot be reallocated to another customer.');
      return;
    }

    if (dispositionType === 'other' && !dispositionNotes.trim()) {
      alert('Please provide a specific explanation in the notes for "Other" disposition.');
      return;
    }

    const orderIdToCancel = selectedOrder.id;
    if (processingOrderIdsRef.current.has(orderIdToCancel)) return;

    const allowedTransitions = VALID_ORDER_TRANSITIONS[selectedOrder.status] || [];
    if (!allowedTransitions.includes('cancelled')) {
      showToast(`Cannot cancel an order with status "${selectedOrder.status}". Only new or accepted orders can be cancelled.`, "Invalid Action", "warning");
      return;
    }

    const origOrder = orders.find(o => o.id === orderIdToCancel);
    processingOrderIdsRef.current.add(orderIdToCancel);
    setIsSubmittingCancellation(true);

    // Immediate optimistic UI response: close modal instantly and update status in DOM (< 20ms)
    setCancelModalOpen(false);
    optimisticStatusMapRef.current[orderIdToCancel] = 'cancelled';
    setOptimisticStatusMap(prev => ({ ...prev, [orderIdToCancel]: 'cancelled' }));
    setOrders(prev => prev.map(o => o.id === orderIdToCancel ? {
      ...o,
      status: 'cancelled',
      cancellation_reason: fullReason,
      cancelled_by: profile?.full_name || activeRole || 'Staff Member',
      cancelled_at: new Date().toISOString()
    } : o));
    showToast("Order cancelled and disposition logged.", "Order Cancelled", "info");
    window.dispatchEvent(new Event('storage'));

    try {
      // 1. Cancel the order in database
      const updated = await db.updateOrderStatus(
        orderIdToCancel,
        'cancelled',
        profile?.full_name || activeRole || 'Staff Member',
        fullReason
      );

      // 2. Update refund status if specified
      if (refundStatusSelection !== 'none') {
        await supabase
          .from('orders')
          .update({ refund_status: refundStatusSelection })
          .eq('id', orderIdToCancel);
      }

      // 3. Record Prepared Food Disposition for all active items in parallel
      const { recordPreparedFoodDisposition } = await import('@/lib/inventoryEngine');
      const activeItems = (selectedOrder.items || []).filter(i => !i.is_cancelled && i.status !== 'cancelled');
      if (activeItems.length > 0) {
        await Promise.all(activeItems.map(item =>
          recordPreparedFoodDisposition({
            restaurantId: restaurant.id,
            orderId: orderIdToCancel,
            batchId: item.batch_id,
            orderItemId: item.id,
            menuItemId: item.menu_item_id,
            menuItemName: item.menu_item_name,
            variantName: item.variant_name,
            quantity: item.quantity,
            wasServed: Boolean(wasServed || item.is_served),
            dispositionType,
            destinationOrderId: destinationOrderId || undefined,
            destinationOrderDisplayId: destinationOrderDisplayId || undefined,
            wasteReason: dispositionType === 'waste' ? wasteReason : undefined,
            notes: dispositionNotes || customCancellationNotes || undefined,
            handledBy: profile?.full_name || activeRole || 'Staff Member',
            restoreInventory: restoreInventoryStock
          })
        ));
      }

      if (restoreInventoryStock) {
        const { restoreInventoryForOrderBatch } = await import('@/lib/inventoryEngine');
        await restoreInventoryForOrderBatch(
          restaurant.id,
          orderIdToCancel,
          undefined,
          profile?.id,
          profile?.full_name || activeRole || 'Staff Member',
          fullReason
        );
      }

      if (updated) {
        setOptimisticStatusMap(prev => {
          const next = { ...prev };
          delete next[orderIdToCancel];
          return next;
        });
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
      }
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setOptimisticStatusMap(prev => {
        const next = { ...prev };
        delete next[orderIdToCancel];
        return next;
      });
      if (origOrder) {
        setOrders(prev => prev.map(o => o.id === orderIdToCancel ? origOrder : o));
      }
      showToast(`Error during cancellation: ${err.message}`, "Error", "error");
    } finally {
      processingOrderIdsRef.current.delete(orderIdToCancel);
      setIsSubmittingCancellation(false);
    }
  };

  const handleManualInventoryRestore = async () => {
    if (!selectedOrder || !restaurant) return;
    const confirmRestore = window.confirm(
      'Are you sure you want to restore raw inventory for this cancelled order? Only do this if the ingredients were NOT prepared or wasted.'
    );
    if (!confirmRestore) return;

    try {
      const { restoreInventoryForOrderBatch } = await import('@/lib/inventoryEngine');
      const res = await restoreInventoryForOrderBatch(
        restaurant.id,
        selectedOrder.id,
        undefined,
        undefined,
        profile?.full_name || 'Owner Restoration',
        'Manual restore confirmed by staff'
      );

      if (res.success) {
        alert(`Successfully restored raw inventory for ${res.restoredCount} items!`);
        const allOrders = await db.getOrders(restaurant.id);
        setOrders(allOrders);
        window.dispatchEvent(new Event('storage'));
      } else {
        alert(res.error || 'Failed to restore inventory.');
      }
    } catch (e: any) {
      alert(`Restoration failed: ${e.message}`);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (processingRequestIds.includes(requestId)) return;

    const originalRequests = [...customerRequests];
    setCustomerRequests(prev => prev.filter(r => r.id !== requestId));
    setProcessingRequestIds(prev => [...prev, requestId]);

    try {
      window.dispatchEvent(new Event('stop-waiter-sound'));
      await db.acceptCustomerRequest(requestId, profile?.full_name || 'Waiter');
      const updatedReqs = originalRequests.filter(r => r.id !== requestId);
    } catch (err: any) {
      setCustomerRequests(originalRequests);
      alert(`Failed to accept request: ${err.message}`);
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    if (processingRequestIds.includes(requestId)) return;

    const originalRequests = [...customerRequests];
    setCustomerRequests(prev => prev.filter(r => r.id !== requestId));
    setProcessingRequestIds(prev => [...prev, requestId]);

    try {
      window.dispatchEvent(new Event('stop-waiter-sound'));
      await db.resolveCustomerRequest(requestId);
      const updatedReqs = originalRequests.filter(r => r.id !== requestId);
      alert('Request marked resolved.');
    } catch (err: any) {
      setCustomerRequests(originalRequests);
      alert(`Failed to resolve request: ${err.message}`);
    } finally {
      setProcessingRequestIds(prev => prev.filter(id => id !== requestId));
    }
  };

  const handleSeedTestRequest = async () => {
    if (!restaurant?.id) return;
    try {
      const tables = await db.getTables(restaurant.id);
      const tableId = tables.length > 0 ? tables[0].id : 'takeaway';
      await db.createCustomerRequest(restaurant.id, tableId, 'call_waiter');
      if (restaurant.id) await safeReloadOrders(restaurant.id);
      showToast('Seeded test customer call request successfully!');
    } catch (err: any) {
      alert('Failed to seed request: ' + (err.message || err));
    }
  };

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const submittingPaymentRef = useRef(false);

  const handlePrintInvoice = () => {
    if (!selectedOrder || !restaurant) return;

    const calcResult = calculateBillingTotals({
      items: selectedOrder.items || [],
      batches: selectedOrder.batches || [],
      discountAmount: Number(selectedOrder.discount_amount || 0),
      offerCode: selectedOrder.offer_code,
      specialInstructions: selectedOrder.special_instructions,
      offers: restaurant.settings.offers || [],
      settings: restaurant.settings,
      gstNumber: restaurant.gst_number,
      gstEnabled: restaurant.settings.gst_enabled,
      gstPercentage: restaurant.settings.gst_percentage || 0,
      serviceChargeEnabled: restaurant.settings.service_charge_enabled !== false,
      serviceChargePercentage: restaurant.settings.service_charge_percentage || 0,
      customCharges: restaurant.settings.custom_charges || []
    });

    const validItems = (selectedOrder.items || []).filter(item => {
      if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return false;
      if (item.batch_id && (selectedOrder.batches || []).length > 0) {
        const b = (selectedOrder.batches || []).find(batch => batch.id === item.batch_id);
        if (b && (b.status === 'cancelled' || b.special_instructions?.includes('[CANCELLED]'))) return false;
      }
      return true;
    });

    setPrintOrderData({
      order: selectedOrder,
      calcResult,
      validItems,
      restaurant
    });
    setPrintModalOpen(true);

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Receipt - ${getFormattedOrderId(selectedOrder, restaurant.name, orders)}</title>
              <style>
                body { font-family: monospace; width: 80mm; margin: 0 auto; padding: 10px; color: #000; font-size: 12px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .divider { border-top: 1px dashed #000; margin: 8px 0; }
                table { width: 100%; border-collapse: collapse; }
                td, th { padding: 3px 0; }
              </style>
            </head>
            <body>
              <div class="text-center">
                <h2>${restaurant.name}</h2>
                <p>${restaurant.address || 'Dining QR Order System'}</p>
              </div>
              <div class="divider"></div>
              <p><span class="bold">Order ID:</span> ${getFormattedOrderId(selectedOrder, restaurant.name, orders)}</p>
              <p><span class="bold">Date:</span> ${formatExactTimestamp(selectedOrder.created_at)}</p>
              <div class="divider"></div>
              <table>
                ${validItems.map(i => `<tr><td>${i.quantity}x ${i.menu_item_name}</td><td class="text-right">${formatPrice(i.price * i.quantity, restaurant.settings.currency)}</td></tr>`).join('')}
              </table>
              <div class="divider"></div>
              <p class="text-right">Subtotal: ${formatPrice(calcResult.validSubtotal, restaurant.settings.currency)}</p>
              ${calcResult.discountAmount > 0 ? `<p class="text-right">Discount: -${formatPrice(calcResult.discountAmount, restaurant.settings.currency)}</p>` : ''}
              ${calcResult.taxType === 'cgst_sgst' && calcResult.cgstAmount > 0 ? `
                <p class="text-right">CGST (${calcResult.cgstPercentage}%): ${formatPrice(calcResult.cgstAmount, restaurant.settings.currency)}</p>
                <p class="text-right">SGST (${calcResult.sgstPercentage}%): ${formatPrice(calcResult.sgstAmount, restaurant.settings.currency)}</p>
              ` : (calcResult.gstAmount > 0 ? `<p class="text-right">GST: ${formatPrice(calcResult.gstAmount, restaurant.settings.currency)}</p>` : '')}
              ${calcResult.serviceChargeAmount > 0 ? `<p class="text-right">Service Charge: ${formatPrice(calcResult.serviceChargeAmount, restaurant.settings.currency)}</p>` : ''}
              <div class="divider"></div>
              <p class="bold text-right">Total: ${formatPrice(calcResult.grandTotal, restaurant.settings.currency)}</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (e) {}
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder || !restaurant) return;
    if (submittingPaymentRef.current || submittingPayment) return;
    if (selectedOrder.payment_status === 'paid') {
      showToast('This order has already been marked as paid.', 'Payment Notice', 'info');
      setPaymentModalOpen(false);
      return;
    }

    submittingPaymentRef.current = true;

    const targetOrderId = selectedOrder.id;
    const origOrder = orders.find(o => o.id === targetOrderId);
    const chosenMethod = paymentMethod;

    // Immediate Optimistic UI update: Close modal & reflect Paid/Completed in DOM immediately (< 20ms)
    setPaymentModalOpen(false);
    optimisticStatusMapRef.current[targetOrderId] = 'completed';
    setOptimisticStatusMap(prev => ({ ...prev, [targetOrderId]: 'completed' }));
    setOrders(prev => prev.map(o => o.id === targetOrderId ? {
      ...o,
      payment_status: 'paid',
      payment_method: chosenMethod,
      paid_at: new Date().toISOString(),
      status: 'completed'
    } : o));

    const calcResult = calculateBillingTotals({
      items: selectedOrder.items || [],
      batches: selectedOrder.batches || [],
      discountAmount: Number(selectedOrder.discount_amount || 0),
      offerCode: selectedOrder.offer_code,
      specialInstructions: selectedOrder.special_instructions,
      offers: restaurant.settings.offers || [],
      settings: restaurant.settings,
      gstNumber: restaurant.gst_number,
      gstEnabled: restaurant.settings.gst_enabled,
      gstPercentage: restaurant.settings.gst_percentage || 0,
      serviceChargeEnabled: restaurant.settings.service_charge_enabled !== false,
      serviceChargePercentage: restaurant.settings.service_charge_percentage || 0,
      customCharges: restaurant.settings.custom_charges || []
    });
    showToast(`Payment of ${formatPrice(calcResult.grandTotal, restaurant.settings.currency)} recorded successfully!`, "Bill Settled", "success");
    window.dispatchEvent(new Event('storage'));

    try {
      // BUG-ORD-002: Atomic conditional database update - only set paid if not already paid
      const { data: updatedRows, error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: chosenMethod,
          paid_at: new Date().toISOString(),
          marked_paid_by: profile?.full_name || activeRole || 'Staff Member',
          subtotal: calcResult.validSubtotal,
          gst: calcResult.gstAmount,
          service_charge: calcResult.serviceChargeAmount,
          custom_charges: calcResult.customChargesSnapshot,
          total: calcResult.grandTotal
        })
        .eq('id', targetOrderId)
        .neq('payment_status', 'paid')
        .select();

      if (error) throw error;

      // Idempotency check: If 0 rows were updated, this order was already paid concurrently (multi-tab or double click)
      if (!updatedRows || updatedRows.length === 0) {
        showToast('This order has already been marked as paid.', 'Payment Notice', 'info');
        return;
      }

      // Authoritative lifecycle completion: consumes any unconsumed inventory, syncs batches & items
      const updated = await db.updateOrderStatus(
        targetOrderId, 
        'completed', 
        profile?.full_name || activeRole || 'Staff Member'
      );

      // BUG-ORD-004: Instantly broadcast payment-updated across all tenant channels (Live Orders, KDS, Dashboard, Customer)
      await broadcastOrderRealtimeEvent({
        restaurantId: restaurant.id,
        orderId: targetOrderId,
        eventType: 'payment-updated',
        payload: {
          orderId: targetOrderId,
          paymentStatus: 'paid',
          status: 'completed',
          updatedOrder: updated
        }
      });

      if (updated) {
        setOptimisticStatusMap(prev => {
          const next = { ...prev };
          delete next[targetOrderId];
          return next;
        });
        setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
      }
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      setOptimisticStatusMap(prev => {
        const next = { ...prev };
        delete next[targetOrderId];
        return next;
      });
      // Roll back on failure
      if (origOrder) {
        setOrders(prev => prev.map(o => o.id === targetOrderId ? origOrder : o));
      }
      showToast(`Failed to complete payment: ${err.message}`, "Payment Error", "error");
    } finally {
      submittingPaymentRef.current = false;
      setSubmittingPayment(false);
    }
  };

  const getStatusBadge = (status: Order['status'], orderType?: Order['order_type']) => {
    switch (status) {
      case 'new': return <Badge variant="info">New</Badge>;
      case 'accepted': return <Badge variant="neutral">Accepted</Badge>;
      case 'preparing': return <Badge variant="warning">Preparing</Badge>;
      case 'ready': return <Badge variant="purple">{orderType === 'takeaway' ? 'Ready for Pickup' : 'Ready'}</Badge>;
      case 'served': return <Badge variant="success">{orderType === 'takeaway' ? 'Handed Over' : 'Served'}</Badge>;
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'cancelled': return <Badge variant="error">Cancelled</Badge>;
    }
  };

  const activeDineInCount = useMemo(() => {
    return effectiveOrders.filter(o => o.order_type !== 'takeaway' && o.order_type !== 'reservation' && o.status !== 'cancelled' && o.status !== 'completed').length;
  }, [effectiveOrders]);

  const activeTakeawayCount = useMemo(() => {
    return effectiveOrders.filter(o => o.order_type === 'takeaway' && o.status !== 'cancelled' && o.status !== 'completed').length;
  }, [effectiveOrders]);

  const activeReservationsCount = useMemo(() => {
    return effectiveOrders.filter(o => o.order_type === 'reservation' && o.status !== 'cancelled' && o.status !== 'completed').length;
  }, [effectiveOrders]);

  const handleSeatReservation = async () => {
    if (!reservationToSeat || !selectedTableForSeat || !restaurant) return;
    setIsSeatingGuest(true);
    try {
      const targetTable = allTables.find(t => t.id === selectedTableForSeat);
      const targetTableName = targetTable ? (targetTable.table_number ? `Table ${targetTable.table_number}` : targetTable.name) : 'Table';

      // 1. Mark physical table as occupied
      await db.toggleTableOccupancy(restaurant.id, selectedTableForSeat, true);

      // 2. Update order: assign physical table and transition to active dine_in dining session
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reservationToSeat.id);
      if (isUuid) {
        const { error } = await supabase
          .from('orders')
          .update({
            table_id: selectedTableForSeat,
            table_name: targetTableName,
            order_type: 'dine_in'
          })
          .eq('id', reservationToSeat.id);

        if (error) {
          console.warn('Seat guest Supabase update error:', error);
        }

        // 3. Broadcast realtime event so KDS and dashboard pick up the seated dining session & pre-ordered items
        await broadcastOrderRealtimeEvent({
          restaurantId: restaurant.id,
          orderId: reservationToSeat.id,
          eventType: 'new-order',
          payload: {
            updatedOrder: {
              ...reservationToSeat,
              table_id: selectedTableForSeat,
              table_name: targetTableName,
              order_type: 'dine_in'
            }
          }
        }).catch(() => {});
      }

      // Optimistic local state updates
      setOrders(prev => prev.map(o => o.id === reservationToSeat.id ? {
        ...o,
        table_id: selectedTableForSeat,
        table_name: targetTableName,
        order_type: 'dine_in'
      } : o));

      setAllTables(prev => prev.map(t => t.id === selectedTableForSeat ? {
        ...t,
        is_occupied: true,
        occupancy_status: 'occupied'
      } : t));

      showToast(`Guest seated at ${targetTableName}! Pre-ordered ticket sent to kitchen.`, "Guest Seated", "success");
      setSeatGuestModalOpen(false);
      setReservationToSeat(null);
      setSelectedTableForSeat('');
      await safeReloadOrders(restaurant.id);
    } catch (err: any) {
      showToast('Failed to seat guest: ' + err.message, "Error", "error");
    } finally {
      setIsSeatingGuest(false);
    }
  };

  const handleExtendReservation = async (order: Order, mins = 15) => {
    const currentArrival = order.customer_arrival_minutes || 20;
    const newArrival = currentArrival + mins;
    
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, customer_arrival_minutes: newArrival } : o));
    showToast(`Reservation arrival extended by +${mins}m.`, "Timer Extended", "info");

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
    if (isUuid) {
      await supabase.from('orders').update({ customer_arrival_minutes: newArrival }).eq('id', order.id);
    }
  };

  const handleReservationNoShow = async (order: Order) => {
    if (!window.confirm(`Mark reservation for ${order.table_name || 'Guest'} as No-Show?`)) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
    setOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      status: 'cancelled',
      cancellation_reason: 'No-Show: Guest did not arrive within grace period'
    } : o));
    showToast("Reservation marked as No-Show.", "No-Show", "info");
    if (isUuid) {
      await supabase.from('orders').update({
        status: 'cancelled',
        cancellation_reason: 'No-Show: Guest did not arrive within grace period',
        cancelled_at: new Date().toISOString()
      }).eq('id', order.id);
    }
  };

  const handleCancelReservationDirect = async (order: Order) => {
    if (!window.confirm(`Cancel reservation for ${order.table_name || 'Guest'}?`)) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order.id);
    setOrders(prev => prev.map(o => o.id === order.id ? {
      ...o,
      status: 'cancelled',
      cancellation_reason: 'Cancelled by restaurant staff / guest request'
    } : o));
    showToast("Reservation cancelled.", "Cancelled", "info");
    if (isUuid) {
      await supabase.from('orders').update({
        status: 'cancelled',
        cancellation_reason: 'Cancelled by restaurant staff / guest request',
        cancelled_at: new Date().toISOString()
      }).eq('id', order.id);
    }
  };

  // Recent Customers Lookup (Toast POS / Square Style Re-order)
  const recentCustomers = useMemo(() => {
    const map = new Map<string, {
      phone: string;
      name: string;
      orderCount: number;
      lastOrderDate: string;
      lastItems: string[];
      lastOrder: Order;
    }>();

    effectiveOrders.forEach(ord => {
      const details = parseCustomerDetailsFromOrder(ord);
      const phone = details.phone || (ord as any).customer_phone;
      const name = details.name || (ord as any).customer_name;
      if (!phone && !name) return;
      const key = (phone || name).toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          phone: phone || '',
          name: name || 'Valued Guest',
          orderCount: 1,
          lastOrderDate: ord.created_at,
          lastItems: (ord.items || []).map(i => i.menu_item_name),
          lastOrder: ord
        });
      } else {
        const entry = map.get(key)!;
        entry.orderCount += 1;
        if (new Date(ord.created_at) > new Date(entry.lastOrderDate)) {
          entry.lastOrderDate = ord.created_at;
          entry.lastItems = (ord.items || []).map(i => i.menu_item_name);
          entry.lastOrder = ord;
          if (name && entry.name === 'Valued Guest') entry.name = name;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime());
  }, [effectiveOrders]);

  const filteredRecentCustomers = useMemo(() => {
    const q = customerLookupQuery.toLowerCase().trim();
    if (!q) return recentCustomers;
    return recentCustomers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')) ||
      c.lastItems.some(it => it.toLowerCase().includes(q))
    );
  }, [recentCustomers, customerLookupQuery]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return effectiveOrders.filter(order => {
      // Isolate by active order queue (BUG-RES-002 & BUG-TAKE-002)
      if (orderQueue === 'dine_in') {
        if (order.order_type === 'takeaway' || order.order_type === 'reservation') return false;
      } else if (orderQueue === 'takeaway') {
        if (order.order_type !== 'takeaway') return false;
      } else if (orderQueue === 'reservations') {
        if (order.order_type !== 'reservation') return false;
      }

      const matchesSearch = matchesOrderSearchQuery(order, q, restaurant?.name || '', effectiveOrders);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [effectiveOrders, restaurant?.name, searchQuery, statusFilter, orderQueue]);

  if (loading || !restaurant) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-3 gap-6 h-[80vh]">
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="col-span-2 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-full pb-12">
      {/* Header section: title + actions + tabs all in one row */}
      <div className="shrink-0 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Live Orders &amp; Requests</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">Manage statuses, print bills, and resolve customer requests in real time.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <ClipboardList className="h-3.5 w-3.5" /> Live Orders
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 relative ${
                activeTab === 'requests'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Bell className="h-3.5 w-3.5" /> Customer Calls ({customerRequests.length})
              {customerRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                  {customerRequests.length}
                </span>
              )}
            </button>
          </div>

          <Button
            onClick={() => setCustomerLookupOpen(true)}
            variant="outline"
            className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs shadow-xs gap-1.5 cursor-pointer rounded-lg px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Search className="h-3.5 w-3.5" /> Customer Lookup
          </Button>

          <Button
            onClick={() => setPunchModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm gap-1.5 cursor-pointer rounded-lg px-3 py-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Punch New Order
          </Button>
        </div>
      </div>

      {/* Orders Tab View */}
      {activeTab === 'orders' && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 items-start">
          {/* Left Side: Order List (Independent Scroll) */}
          <div
            ref={orderListContainerRef}
            className="w-full md:w-5/12 lg:w-4/12 flex flex-col space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs md:max-h-[calc(100vh-140px)] md:overflow-y-auto"
          >
            {/* 3 Dedicated Queues Tabs (BUG-RES-002 & BUG-TAKE-002) */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => {
                  setOrderQueue('dine_in');
                  const nextOrders = orders.filter(o => o.order_type !== 'takeaway' && o.order_type !== 'reservation');
                  if (nextOrders.length > 0 && (!selectedOrderId || !nextOrders.some(o => o.id === selectedOrderId))) {
                    setSelectedOrderId(nextOrders[0].id);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  orderQueue === 'dine_in'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ChefHat className="h-3.5 w-3.5 text-gray-900 dark:text-gray-100" />
                  <span>Dine-In</span>
                </div>
                {activeDineInCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                    {activeDineInCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderQueue('takeaway');
                  const nextOrders = effectiveOrders.filter(o => o.order_type === 'takeaway');
                  if (nextOrders.length > 0 && (!selectedOrderId || !nextOrders.some(o => o.id === selectedOrderId))) {
                    setSelectedOrderId(nextOrders[0].id);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  orderQueue === 'takeaway'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-gray-900 dark:text-gray-100" />
                  <span>Takeaway</span>
                </div>
                {activeTakeawayCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                    {activeTakeawayCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderQueue('reservations');
                  const nextOrders = effectiveOrders.filter(o => o.order_type === 'reservation');
                  if (nextOrders.length > 0 && (!selectedOrderId || !nextOrders.some(o => o.id === selectedOrderId))) {
                    setSelectedOrderId(nextOrders[0].id);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  orderQueue === 'reservations'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-900 dark:text-gray-100" />
                  <span>Booking</span>
                </div>
                {activeReservationsCount > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700">
                    {activeReservationsCount}
                  </span>
                )}
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order ID, table..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="all">All States</option>
                <option value="new">New</option>
                <option value="accepted">Accepted</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready</option>
                <option value="served">{orderQueue === 'takeaway' ? 'Handed Over' : 'Served'}</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
              {filteredOrders.length === 0 ? (
                <div className="flex items-center justify-center text-center text-slate-400 text-sm py-12 flex-col gap-2">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                  <span>No {orderQueue === 'takeaway' ? 'takeaway orders' : orderQueue === 'reservations' ? 'reservations' : 'dine-in orders'} match this query.</span>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const { tableDisplay, shortOrderId } = getOrderDisplayInfo(order, restaurant?.name || '', orders);
                  const displayTotal = order.grand_total != null ? order.grand_total : (order.total != null ? order.total : null);
                  const itemCount = (order.items || []).reduce((s, i) => s + i.quantity, 0);

                  // Takeaway ETA calculations
                  const isTakeaway = order.order_type === 'takeaway';
                  const isReservation = order.order_type === 'reservation';
                  const createdMs = new Date(order.created_at).getTime();
                  const elapsedMins = Math.floor((currentTime - createdMs) / 60000);
                  const arrivalMins = order.customer_arrival_minutes || 20;
                  const remainingMins = arrivalMins - elapsedMins;

                  // Reservation calculations
                  const parsedRes = isReservation ? parseReservationDetails(order) : null;
                  const diffMins = parsedRes?.targetDateTime ? Math.round((parsedRes.targetDateTime.getTime() - currentTime) / 60000) : null;

                  return (
                    <button
                      key={order.id}
                      id={`order-item-${order.id}`}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/80 shadow-sm ring-2 ring-emerald-500/30 text-slate-900 dark:text-white' 
                          : 'border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="w-full space-y-2">
                        {/* Primary & Secondary: Identifier & Sequence ID */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-black tracking-tight text-slate-950 dark:text-white leading-tight">
                              {isTakeaway ? 'TAKEAWAY' : isReservation ? (parsedRes?.name ? `RESERVATION: ${parsedRes.name}` : 'RESERVATION') : tableDisplay}
                            </h4>
                            <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                              {shortOrderId}
                            </p>
                          </div>
                          <div className="text-right">
                            {displayTotal != null ? (
                              <p className="font-black text-sm text-slate-900 dark:text-white">
                                {formatPrice(displayTotal, restaurant?.settings?.currency)}
                              </p>
                            ) : null}
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              {itemCount} {itemCount === 1 ? 'item' : 'items'}
                            </p>
                          </div>
                        </div>

                        {/* Special ETA / Reservation Badges */}
                        {isTakeaway && (
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                              {order.takeaway_notes ? `Note: ${order.takeaway_notes}` : 'Counter Pickup'}
                            </span>
                            {order.status === 'ready' ? (
                              <Badge variant="purple">Ready for Pickup</Badge>
                            ) : order.status === 'served' ? (
                              <Badge variant="success">Handed Over</Badge>
                            ) : remainingMins > 0 ? (
                              <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-300 dark:border-gray-700">
                                Pickup in ~{remainingMins}m
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-gray-950 dark:text-white bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-400 dark:border-gray-600">
                                Overdue ({Math.abs(remainingMins)}m)
                              </span>
                            )}
                          </div>
                        )}

                        {isReservation && parsedRes && (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium flex-wrap">
                              <span>{parsedRes.date || 'Today'} {parsedRes.time}</span>
                              <span>• {parsedRes.guests} Guests</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {diffMins !== null && (
                                diffMins > 30 ? (
                                  <Badge variant="neutral">Starts in ~{diffMins}m</Badge>
                                ) : diffMins <= 30 && diffMins > 15 ? (
                                  <Badge variant="warning">Due in ~{diffMins}m (Reminder)</Badge>
                                ) : diffMins <= 15 && diffMins >= -15 ? (
                                  <Badge variant="purple">Table Reserved ({diffMins >= 0 ? `${diffMins}m` : `${Math.abs(diffMins)}m ago`})</Badge>
                                ) : (
                                  <Badge variant="error">No-Show ({Math.abs(diffMins)}m late)</Badge>
                                )
                              )}
                              {order.table_name && order.table_name !== 'Reservation' ? (
                                <Badge variant="neutral">Table: {order.table_name}</Badge>
                              ) : (
                                <span className="text-[10px] text-gray-500 font-medium">Table Unassigned</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tertiary: Status Badges */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getStatusBadge(optimisticStatusMap[order.id] || order.status, order.order_type)}
                            {order.payment_status === 'paid' ? (
                              <Badge variant="success">Paid</Badge>
                            ) : order.payment_status === 'customer_marked_paid' ? (
                              <Badge variant="warning">Marked Paid</Badge>
                            ) : null}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatExactTimestamp(order.created_at)}
                          </span>
                        </div>

                        {/* Dishes Snippet */}
                        <p className="text-xs truncate text-slate-500 dark:text-slate-400">
                          {(order.items || []).map(i => i.menu_item_name).join(', ')}
                        </p>

                        {(() => {
                          const rawInst = order.special_instructions || (order.batches && order.batches[0]?.special_instructions) || '';
                          const cleanInst = rawInst
                            .replace(/^\[Batch #\d+\]:\s*/, '')
                            .split('\n')[0]
                            .trim();
                          if (cleanInst && !cleanInst.startsWith('[CANCELLED]')) {
                            return (
                              <div className="text-[11px] font-medium text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border-l-2 border-gray-400 dark:border-gray-600 px-2 py-0.5 rounded-sm inline-block max-w-full truncate">
                                <span className="font-bold text-gray-950 dark:text-white">Note:</span> {cleanInst}
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Quick action buttons */}
                        <div className="pt-1 flex items-center justify-end gap-2">
                          {isReservation && order.status !== 'cancelled' && order.status !== 'completed' && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                className="bg-stone-900 hover:bg-black text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 font-bold px-2.5 py-1 text-xs rounded-lg cursor-pointer gap-1 shadow-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReservationToSeat(order);
                                  const avail = allTables.find(t => !t.is_occupied && t.occupancy_status !== 'occupied');
                                  setSelectedTableForSeat(avail?.id || '');
                                  setSeatGuestModalOpen(true);
                                }}
                              >
                                <UserCheck className="h-3.5 w-3.5" /> Seat Guest
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 text-xs px-2 py-1 rounded-lg cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExtendReservation(order, 15);
                                }}
                                title="Extend arrival by 15 mins"
                              >
                                +15m
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900 text-xs px-2 py-1 rounded-lg cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReservationNoShow(order);
                                }}
                              >
                                No Show
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900 text-xs px-2 py-1 rounded-lg cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelReservationDirect(order);
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}

                          {order.status === 'ready' && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 text-xs rounded-lg cursor-pointer"
                              isLoading={processingOrderIds.includes(`${order.id}:served`)}
                              disabled={processingOrderIds.includes(`${order.id}:served`)}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (order.status === 'served' || order.status === 'completed') {
                                  window.dispatchEvent(new Event('stop-waiter-sound'));
                                  showToast("Order already updated.", "Notice", "info");
                                  return;
                                }

                                const actionKey = `${order.id}:served`;
                                if (processingOrderIdsRef.current.has(actionKey)) return;
                                processingOrderIdsRef.current.add(actionKey);

                                const origOrder = orders.find(o => o.id === order.id);
                                setProcessingOrderIds(prev => [...prev, actionKey]);
                                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'served' } : o));
                                window.dispatchEvent(new Event('stop-waiter-sound'));
                                showToast(isTakeaway ? "Order handed over to customer." : `Order for ${order.table_name || 'Table'} marked as served.`, "Success", "success");

                                try {
                                  const updated = await db.updateOrderStatus(order.id, 'served', profile?.full_name || 'Staff');
                                  await broadcastOrderRealtimeEvent({
                                    restaurantId: restaurant.id,
                                    orderId: order.id,
                                    eventType: 'order-status-updated',
                                    payload: {
                                      orderId: order.id,
                                      newStatus: 'served',
                                      updatedOrder: updated
                                    }
                                  });
                                  if (updated) {
                                    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
                                  }
                                  window.dispatchEvent(new Event('storage'));
                                } catch (err: any) {
                                  if (origOrder) {
                                    setOrders(prev => prev.map(o => o.id === order.id ? origOrder : o));
                                  }
                                  showToast(`Failed to update order: ${err.message}`, "Error", "error");
                                } finally {
                                  processingOrderIdsRef.current.delete(actionKey);
                                  setProcessingOrderIds(prev => prev.filter(id => id !== actionKey));
                                }
                              }}
                            >
                              {isTakeaway ? 'Hand Over Order' : 'Serve'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side: Order Detail & Billing panel (Sticky Bonus) */}
          <div
            id="order-details-panel"
            className={`${selectedOrderId ? 'flex' : 'hidden md:flex'} w-full md:w-7/12 lg:w-8/12 flex-1 flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs relative md:sticky md:top-6 md:max-h-[calc(100vh-140px)] md:overflow-y-auto`}
          >
            {selectedOrder && mergedGroupDetails && viewMode === 'merged' ? (
              <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
                {/* Merged Group Header Bar */}
                <div className="p-6 border-b border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-indigo-950 dark:text-indigo-200 text-xl tracking-tight">
                        {mergedGroupDetails.group.name}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Active Merged Group
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
                      Tables: {(mergedGroupDetails.members || []).map((m: any) => m.table_name).join(' + ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => setViewMode('single')}>
                      Single Order View
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs font-bold text-rose-600 border-rose-200 hover:bg-rose-50" onClick={handleUnmergeCurrentGroup}>
                      Unmerge Group
                    </Button>
                  </div>
                </div>

                {/* Table-Wise Hierarchical Breakdown & Orders with Compact Selector */}
                <div className="p-6 space-y-6">
                  {/* Compact Table Selector Buttons */}
                  <div className="space-y-2 border-b border-indigo-100 dark:border-indigo-950/50 pb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Physical Tables in Group (Click to Filter)</p>
                    <div className="flex flex-wrap gap-2.5">
                      {(mergedGroupDetails.tableBreakdown || []).map((tbl: any) => {
                        const activeTblId = selectedOwnerTableId || selectedOrder?.table_id || mergedGroupDetails.tableBreakdown[0]?.table_id;
                        const isSelected = activeTblId === tbl.table_id;
                        return (
                          <button
                            key={tbl.table_id}
                            type="button"
                            onClick={() => setSelectedOwnerTableId(tbl.table_id)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                            <span>{tbl.table_name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                              {tbl.validOrderCount} Orders • {tbl.itemCount} Items
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Orders under Selected Table */}
                  <div className="space-y-4">
                    {(mergedGroupDetails.tableBreakdown || [])
                      .filter((tbl: any) => {
                        const activeTblId = selectedOwnerTableId || selectedOrder?.table_id || mergedGroupDetails.tableBreakdown[0]?.table_id;
                        return tbl.table_id === activeTblId;
                      })
                      .map((tbl: any) => (
                        <div key={tbl.table_id} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                          {/* Table Header Bar */}
                          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-emerald-500" />
                              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                {tbl.table_name} Orders
                              </h4>
                            </div>
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 text-right space-y-0.5">
                              <div>{tbl.validOrderCount} Orders • {tbl.itemCount} Items</div>
                              <div>Subtotal: <span className="font-bold text-slate-900 dark:text-white">{formatPrice(tbl.subtotal, restaurant?.settings?.currency)}</span></div>
                              {(tbl.discount || 0) > 0 && (
                                <div className="text-rose-600 dark:text-rose-400">Promo: <span className="font-bold">-{formatPrice(tbl.discount, restaurant?.settings?.currency)}</span></div>
                              )}
                              <div className="text-emerald-700 dark:text-emerald-400">Net: <span className="font-bold">{formatPrice(tbl.net ?? tbl.subtotal, restaurant?.settings?.currency)}</span></div>
                            </div>
                          </div>

                          {/* Orders under this Physical Table */}
                          {tbl.orders.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No active orders placed from {tbl.table_name} yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {tbl.orders.map((ord: any) => (
                                <div key={ord.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-xs">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        Order {getFormattedOrderId(ord, restaurant?.name || '', orders)}
                                      </span>
                                      {getStatusBadge(ord.status)}
                                      {ord.payment_status === 'paid' ? (
                                        <Badge variant="success">Paid</Badge>
                                      ) : (
                                        <Badge variant="error">Pending</Badge>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      {formatDate(ord.created_at)}
                                    </span>
                                  </div>

                                  {/* Itemized Dishes */}
                                  <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/30">
                                    {(ord.items || []).map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                                          {item.quantity}x {item.menu_item_name || item.name}
                                        </span>
                                        <span className="font-mono text-slate-500">
                                          {formatPrice(item.price * item.quantity, restaurant?.settings?.currency)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-bold">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-500">Subtotal</span>
                                      <span className="text-slate-900 dark:text-white">{formatPrice(ord.subtotal, restaurant?.settings?.currency)}</span>
                                    </div>
                                    {((ord.implied_discount || ord.discount_amount) || 0) > 0 && (
                                      <div className="flex justify-between items-center text-rose-600 dark:text-rose-400">
                                        <span>Promo {ord.offer_code ? `(${ord.offer_code})` : ''}</span>
                                        <span>-{formatPrice((ord.implied_discount || ord.discount_amount) || 0, restaurant?.settings?.currency)}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                                      <span>Net Payable</span>
                                      <span>{formatPrice(ord.net ?? Math.max(0, (ord.subtotal || 0) - ((ord.implied_discount || ord.discount_amount) || 0)), restaurant?.settings?.currency)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Consolidated Group Bill Summary */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-6 space-y-4 shadow-sm">
                    <h4 className="font-bold text-emerald-950 dark:text-emerald-300 text-sm uppercase tracking-wider border-b border-emerald-200 dark:border-emerald-800 pb-2">
                      Consolidated Merged Group Bill ({mergedGroupDetails.group.name})
                    </h4>

                    <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between">
                        <span>Combined Subtotal ({mergedGroupDetails.groupTotals.totalOrders} Orders)</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPrice(mergedGroupDetails.groupTotals.subtotal, restaurant?.settings?.currency)}</span>
                      </div>
                      {(mergedGroupDetails.groupTotals.discount || 0) > 0 && (
                        <div className="flex justify-between text-rose-600 dark:text-rose-400">
                          <span>Combined Promo Discount</span>
                          <span className="font-mono font-bold">-{formatPrice(mergedGroupDetails.groupTotals.discount, restaurant?.settings?.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>GST</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">{formatPrice(mergedGroupDetails.groupTotals.gst, restaurant?.settings?.currency)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-emerald-700 dark:text-emerald-400 pt-2 border-t border-emerald-200 dark:border-emerald-800">
                        <span>Merged Grand Total</span>
                        <span className="font-mono">{formatPrice(mergedGroupDetails.groupTotals.total, restaurant?.settings?.currency)}</span>
                      </div>
                      {mergedGroupDetails.groupTotals.unpaidTotal !== undefined && mergedGroupDetails.groupTotals.unpaidTotal !== mergedGroupDetails.groupTotals.total && (
                        <div className="flex justify-between text-xs font-bold text-indigo-700 dark:text-indigo-400 pt-1">
                          <span>Merged Outstanding</span>
                          <span className="font-mono">{formatPrice(mergedGroupDetails.groupTotals.unpaidTotal, restaurant?.settings?.currency)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-3">
                      {mergedGroupDetails.groupTotals.isFullyPaid || mergedGroupDetails.groupTotals.unpaidTotal === 0 ? (
                        <div className="flex-1 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-xs py-3 rounded-xl text-center uppercase tracking-wider">
                          PAID (Group Session Settled)
                        </div>
                      ) : (
                        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl shadow-md cursor-pointer uppercase tracking-wider" onClick={handlePayMergedGroup}>
                          COMPLETE BILL & PAY — {formatPrice(mergedGroupDetails.groupTotals.unpaidTotal ?? mergedGroupDetails.groupTotals.total, restaurant?.settings?.currency)}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : selectedOrder ? (
              <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="space-y-1">
                    {/* Mobile Back Button */}
                    <div className="md:hidden pb-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs text-slate-600 dark:text-slate-400 -ml-2 h-7 cursor-pointer"
                        onClick={() => setSelectedOrderId(null)}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Orders List
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-950 dark:text-white text-lg">
                        Order {getFormattedOrderId(selectedOrder, restaurant?.name || '', orders)}
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        onClick={() => {
                          const fullId = getFormattedOrderId(selectedOrder, restaurant?.name || '', orders);
                          navigator.clipboard.writeText(fullId);
                          showToast(`Copied Order ID: ${fullId}`, "Copied", "success");
                        }}
                        title="Copy Full Order ID"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {selectedOrder.merge_group_id && (
                        <Button size="sm" variant="outline" className="text-xs font-bold text-indigo-600 border-indigo-200" onClick={() => setViewMode('merged')}>
                          View Merged Session ({mergedGroupDetails?.group?.name || 'Group'})
                        </Button>
                      )}
                      {selectedOrder.order_type === 'takeaway' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 uppercase tracking-wide">
                          <ShoppingBag className="h-3 w-3" /> Takeaway
                        </span>
                      )}
                      {selectedOrder.order_type === 'reservation' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 uppercase tracking-wide">
                          <Calendar className="h-3 w-3" /> Reservation
                        </span>
                      )}
                      {getStatusBadge(effectiveStatus || selectedOrder.status, selectedOrder.order_type)}
                      {selectedOrder.payment_status === 'paid' ? (
                        <Badge variant="success">Paid Verified</Badge>
                      ) : selectedOrder.payment_status === 'customer_marked_paid' ? (
                        <Badge variant="warning">Customer Marked Paid</Badge>
                      ) : (effectiveStatus === 'cancelled' || selectedOrder.status === 'cancelled') ? null : (
                        <Badge variant="error">Payment Pending</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5 flex-wrap">
                      {selectedOrder.order_type === 'takeaway' ? (
                        <span className="text-gray-900 dark:text-gray-100 font-bold">Pickup Counter (ETA: {selectedOrder.customer_arrival_minutes || 20} mins)</span>
                      ) : selectedOrder.order_type === 'reservation' ? (
                        <span className="text-gray-900 dark:text-gray-100 font-bold">Table Booking ({selectedOrder.table_name || 'Unassigned'})</span>
                      ) : (
                        <span>{selectedOrder.table_name || 'N/A'}</span>
                      )}
                      <span>• {formatDate(selectedOrder.created_at)}</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 cursor-pointer" onClick={handlePrintInvoice}>
                      <Printer className="h-4 w-4" /> Print Bill
                    </Button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Reservation Details Banner */}
                  {selectedOrder.order_type === 'reservation' && (() => {
                    const parsed = parseReservationDetails(selectedOrder);
                    const diffMins = parsed.targetDateTime ? Math.round((parsed.targetDateTime.getTime() - currentTime) / 60000) : null;
                    return (
                      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-900 dark:text-gray-100" />
                            <h4 className="text-sm font-bold text-gray-950 dark:text-white">Table Reservation Details</h4>
                          </div>
                          {diffMins !== null && (
                            diffMins > 30 ? (
                              <Badge variant="neutral">Starts in ~{diffMins}m</Badge>
                            ) : diffMins <= 30 && diffMins > 15 ? (
                              <Badge variant="warning">Due in ~{diffMins}m (Reminder)</Badge>
                            ) : diffMins <= 15 && diffMins >= -15 ? (
                              <Badge variant="purple">Table Reserved ({diffMins >= 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`})</Badge>
                            ) : (
                              <Badge variant="error">No-Show ({Math.abs(diffMins)}m overdue)</Badge>
                            )
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Guest Name</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{parsed.name || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Booking Time</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{parsed.date} {parsed.time}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Party Size</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{parsed.guests} Guests</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Contact</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{parsed.phone || 'N/A'}</span>
                          </div>
                        </div>

                        {parsed.notes && (
                          <div className="text-xs bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                            <span className="font-bold text-slate-500">Special Notes: </span>
                            <span className="text-slate-800 dark:text-slate-200">{parsed.notes}</span>
                          </div>
                        )}

                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
                          <div className="pt-2 flex items-center gap-2 flex-wrap border-t border-stone-200 dark:border-stone-800">
                            <Button
                              size="sm"
                              className="bg-stone-900 hover:bg-black text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 font-bold gap-1.5 cursor-pointer shadow-sm"
                              onClick={() => {
                                setReservationToSeat(selectedOrder);
                                const avail = allTables.find(t => !t.is_occupied && t.occupancy_status !== 'occupied');
                                setSelectedTableForSeat(avail?.id || '');
                                setSeatGuestModalOpen(true);
                              }}
                            >
                              <UserCheck className="h-4 w-4" /> Customer Arrived — Seat Table &amp; Release to Kitchen
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800 font-semibold"
                              onClick={() => handleExtendReservation(selectedOrder, 15)}
                            >
                              +15m Extend
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900 font-semibold"
                              onClick={() => handleReservationNoShow(selectedOrder)}
                            >
                              No Show
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:border-rose-900 font-semibold"
                              onClick={() => handleCancelReservationDirect(selectedOrder)}
                            >
                              Cancel Reservation
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Takeaway Details Banner */}
                  {selectedOrder.order_type === 'takeaway' && (() => {
                    const createdMs = new Date(selectedOrder.created_at).getTime();
                    const elapsedMins = Math.floor((currentTime - createdMs) / 60000);
                    const arrivalMins = selectedOrder.customer_arrival_minutes || 20;
                    const remainingMins = arrivalMins - elapsedMins;
                    return (
                      <div className="bg-[#F8F8F6] dark:bg-stone-900 border border-[#E7E5E4] dark:border-stone-800 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-stone-900 dark:text-stone-100" />
                            <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">Takeaway Pickup Details</h4>
                          </div>
                          {effectiveStatus === 'ready' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                              Ready for Pickup at Counter
                            </span>
                          ) : effectiveStatus === 'served' ? (
                            <Badge variant="success">Handed Over to Customer</Badge>
                          ) : remainingMins > 0 ? (
                            <Badge variant="warning">Customer Arriving in ~{remainingMins}m</Badge>
                          ) : (
                            <Badge variant="error">ETA Overdue ({Math.abs(remainingMins)}m)</Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Pickup ETA Window</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{arrivalMins} minutes</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Time Elapsed</span>
                            <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{elapsedMins} mins ago</span>
                          </div>
                          {selectedOrder.takeaway_notes && (
                            <div>
                              <span className="text-slate-400 block text-[10px] font-bold uppercase">Pickup Notes</span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">{selectedOrder.takeaway_notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {(effectiveStatus === 'cancelled' || selectedOrder.status === 'cancelled') && (
                    <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-4 flex flex-col gap-1.5 text-rose-900 dark:text-rose-200 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
                        <XCircle className="h-5 w-5 shrink-0" />
                        <span>Order Has Been Cancelled</span>
                      </div>
                      <div className="text-xs space-y-1 font-semibold pl-7">
                        <p>• Cancelled By: <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.cancelled_by || 'Staff Member'}</span></p>
                        <p>• Cancellation Reason: <span className="font-bold text-rose-700 dark:text-rose-300">"{selectedOrder.cancellation_reason || 'No reason specified'}"</span></p>
                      </div>
                    </div>
                  )}

                  {/* Collapsible Order & Batch Lifecycle Timeline */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowOwnerTimeline(!showOwnerTimeline)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-left cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-slate-200">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">{showOwnerTimeline ? '▼' : '▶'}</span>
                        <span>{showOwnerTimeline ? 'Hide Order & Batch Lifecycle Timeline' : 'View Order & Batch Lifecycle Timeline'}</span>
                      </span>
                      <Badge variant="neutral" className="text-[10px] font-mono border-indigo-200 text-indigo-700 dark:text-indigo-300">
                        {selectedOrder.batches?.length || 1} Batch{(selectedOrder.batches?.length || 1) > 1 ? 'es' : ''}
                      </Badge>
                    </button>

                    {showOwnerTimeline && (
                      <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 animate-fade-in">
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block border-b border-slate-200 dark:border-slate-800 pb-1.5">
                          Order & Batch Lifecycle Timeline:
                        </span>
                        <div className="space-y-2 text-xs">
                      {selectedOrder.created_at && (
                        <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 flex-wrap gap-1 min-w-0">
                          <span className="font-semibold min-w-0 truncate">Order Sent:</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 whitespace-nowrap">{formatExactTimestamp(selectedOrder.created_at)}</span>
                        </div>
                      )}

                      {/* Batch-level timestamps & staff attribution */}
                      {selectedOrder.batches && selectedOrder.batches.length > 0 ? (
                        [...selectedOrder.batches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((batch, bIdx) => {
                          const isCancelled = batch.status === 'cancelled' || batch.special_instructions?.includes('[CANCELLED]');
                          const renderStepTime = (explicitTime?: string, wasCompleted?: boolean) => {
                            if (explicitTime) return formatExactTimestamp(explicitTime);
                            if (wasCompleted) return 'Timestamp unavailable';
                            return null;
                          };

                          const statusOrder = ['new', 'accepted', 'preparing', 'ready', 'served', 'completed'];
                          const bStatusIdx = statusOrder.indexOf(batch.status);

                          const isAccepted = !isCancelled && (!!batch.accepted_at || !!batch.accepted_by);
                          const isPreparing = !isCancelled && (!!batch.preparing_at || !!batch.preparing_by);
                          const isReady = !isCancelled && (!!batch.ready_at || !!batch.ready_by);
                          const isServed = !isCancelled && (!!batch.served_at || !!batch.served_by || bStatusIdx >= 4);

                          return (
                            <div key={batch.id || bIdx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-2 mt-2">
                              <div className="font-bold text-[11px] text-gray-900 dark:text-gray-100 uppercase tracking-wide flex justify-between items-center flex-wrap gap-1 min-w-0">
                                <span className="min-w-0 truncate">Batch #{bIdx + 1} ({isCancelled ? 'CANCELLED' : batch.status.toUpperCase()})</span>
                                <span className="font-mono text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{formatExactTimestamp(batch.created_at)}</span>
                              </div>

                              {/* Order Sent */}
                              <div className="flex justify-between items-center text-slate-600 dark:text-slate-300 text-[11px] flex-wrap gap-1 min-w-0">
                                <div className="min-w-0 truncate">
                                  <span className="font-bold">Order Sent</span>
                                  <span className="text-slate-400 text-[10px] block truncate">Sent to kitchen</span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 whitespace-nowrap">{formatExactTimestamp(batch.created_at)}</span>
                              </div>

                              {isCancelled ? (
                                <>
                                  {batch.accepted_at && (
                                    <div className="flex justify-between items-center text-gray-900 dark:text-gray-100 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Accepted</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Confirmed{batch.accepted_by ? ` by ${batch.accepted_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{formatExactTimestamp(batch.accepted_at)}</span>
                                    </div>
                                  )}
                                  {batch.preparing_at && (
                                    <div className="flex justify-between items-center text-gray-900 dark:text-gray-100 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Preparing</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Cooking{batch.preparing_by ? ` by ${batch.preparing_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{formatExactTimestamp(batch.preparing_at)}</span>
                                    </div>
                                  )}
                                  <div className="bg-gray-100 dark:bg-gray-800 border-l-2 border-gray-400 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 space-y-1 text-[11px] mt-1">
                                    <div className="flex justify-between items-center font-bold flex-wrap gap-1 min-w-0">
                                      <span>Cancelled</span>
                                      <span className="font-mono text-[10px] shrink-0 whitespace-nowrap">{formatExactTimestamp(batch.cancelled_at || batch.updated_at)}</span>
                                    </div>
                                    {(batch.special_instructions?.includes('[CANCELLED]') || selectedOrder.cancellation_reason) && (
                                      <p className="italic text-[10px] break-words">
                                        "{batch.special_instructions?.replace('[CANCELLED]', '').trim() || selectedOrder.cancellation_reason}"
                                      </p>
                                    )}
                                    {batch.cancelled_by && (
                                      <span className="text-[10px] text-slate-400 block truncate">Declined by: {batch.cancelled_by}</span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Accepted */}
                                  {isAccepted && (
                                    <div className="flex justify-between items-center text-gray-900 dark:text-gray-100 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Accepted</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Confirmed{batch.accepted_by ? ` by ${batch.accepted_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{renderStepTime(batch.accepted_at, isAccepted)}</span>
                                    </div>
                                  )}

                                  {/* Preparing */}
                                  {isPreparing && (
                                    <div className="flex justify-between items-center text-gray-900 dark:text-gray-100 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Preparing</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Cooking{batch.preparing_by ? ` by ${batch.preparing_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{renderStepTime(batch.preparing_at, isPreparing)}</span>
                                    </div>
                                  )}

                                  {/* Ready */}
                                  {isReady && (
                                    <div className="flex justify-between items-center text-gray-900 dark:text-gray-100 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Ready</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Food Ready{batch.ready_by ? ` by ${batch.ready_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{renderStepTime(batch.ready_at, isReady)}</span>
                                    </div>
                                  )}

                                  {/* Served */}
                                  {isServed && (
                                    <div className="flex justify-between items-center text-gray-900 dark:text-gray-100 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Served</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Brought to table{batch.served_by ? ` by ${batch.served_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{renderStepTime(batch.served_at, isServed)}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })
                      ) : null}

                      {selectedOrder.cancelled_at && (
                        <div className="flex justify-between items-center text-gray-700 dark:text-gray-300 pt-1 flex-wrap gap-1 min-w-0">
                          <span className="font-semibold min-w-0 truncate">Cancelled:</span>
                          <span className="font-mono font-bold shrink-0 whitespace-nowrap">{formatExactTimestamp(selectedOrder.cancelled_at)}</span>
                        </div>
                      )}

                      {selectedOrder.paid_at && (
                        <div className="flex justify-between items-center text-gray-900 dark:text-gray-100 pt-1 flex-wrap gap-1 min-w-0">
                          <span className="font-semibold min-w-0 truncate">Payment Received{selectedOrder.marked_paid_by ? ` (${selectedOrder.marked_paid_by})` : ''}:</span>
                          <span className="font-mono font-bold shrink-0 whitespace-nowrap">{formatExactTimestamp(selectedOrder.paid_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

                  <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick Action to Update Status:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.order_type === 'reservation' && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
                        <Button
                          size="sm"
                          className="bg-gray-900 hover:bg-black text-white font-bold cursor-pointer gap-1.5 shadow-sm"
                          onClick={async () => {
                            setReservationToSeat(selectedOrder);
                            let currentTables = allTables;
                            if (restaurant?.id) {
                              try {
                                const freshTables = await db.getTables(restaurant.id);
                                if (freshTables && freshTables.length > 0) {
                                  setAllTables(freshTables);
                                  currentTables = freshTables;
                                }
                              } catch (_) {}
                            }
                            const avail = currentTables.find(t => t.name?.toLowerCase() !== 'takeaway' && !t.is_occupied && t.occupancy_status !== 'occupied');
                            setSelectedTableForSeat(avail?.id || '');
                            setSeatGuestModalOpen(true);
                          }}
                        >
                          <UserCheck className="h-4 w-4" /> Customer Arrived — Seat Table
                        </Button>
                      )}
                      {activeRole !== 'waiter' && effectiveStatus === 'new' && (
                        <Button 
                          size="sm" 
                          variant="primary" 
                          className="cursor-pointer font-bold" 
                          isLoading={processingOrderIds.includes(`${selectedOrder.id}:accepted`)}
                          disabled={processingOrderIds.includes(`${selectedOrder.id}:accepted`)}
                          onClick={() => updateOrderStatus('accepted')}
                        >
                          Accept Order
                        </Button>
                      )}
                      {activeRole !== 'waiter' && effectiveStatus === 'accepted' && (
                        <Button 
                          size="sm" 
                          className="bg-gray-900 hover:bg-black text-white cursor-pointer font-medium" 
                          isLoading={processingOrderIds.includes(`${selectedOrder.id}:preparing`)}
                          disabled={processingOrderIds.includes(`${selectedOrder.id}:preparing`)}
                          onClick={() => updateOrderStatus('preparing')}
                        >
                          Start Preparing
                        </Button>
                      )}
                      {activeRole !== 'waiter' && effectiveStatus === 'preparing' && (
                        <Button 
                          size="sm" 
                          className="bg-gray-900 hover:bg-black text-white cursor-pointer font-medium" 
                          isLoading={processingOrderIds.includes(`${selectedOrder.id}:ready`)}
                          disabled={processingOrderIds.includes(`${selectedOrder.id}:ready`)}
                          onClick={() => updateOrderStatus('ready')}
                        >
                          Mark Ready for Pickup
                        </Button>
                      )}
                      {effectiveStatus === 'ready' && (
                        <Button 
                          size="sm" 
                          className="bg-gray-900 hover:bg-black text-white cursor-pointer font-bold" 
                          isLoading={processingOrderIds.includes(`${selectedOrder.id}:served`)}
                          disabled={processingOrderIds.includes(`${selectedOrder.id}:served`)}
                          onClick={() => updateOrderStatus('served')}
                        >
                          {selectedOrder.order_type === 'takeaway' ? 'Hand Over Order' : 'Serve Order'}
                        </Button>
                      )}
                      {effectiveStatus === 'served' && selectedOrder.payment_status !== 'paid' && (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold shadow-md" 
                          isLoading={submittingPayment}
                          disabled={submittingPayment}
                          onClick={() => {
                            if (selectedOrder.payment_status === 'paid') {
                              showToast('This order has already been marked as paid.', 'Payment Notice', 'info');
                              return;
                            }
                            setPaymentModalOpen(true);
                          }}
                        >
                          {selectedOrder.order_type === 'takeaway' ? 'Settle & Complete Takeaway' : 'Complete Bill & Pay'}
                        </Button>
                      )}
                      {(selectedOrder.payment_status === 'paid' || effectiveStatus === 'completed') && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-950 dark:text-white font-bold text-xs rounded-xl border border-gray-300 dark:border-gray-700">
                          <Check className="h-3.5 w-3.5 text-gray-900 dark:text-gray-100" />
                          <span>Paid ({selectedOrder.payment_method?.toUpperCase() || 'PAID'})</span>
                        </div>
                      )}

      {/* Payment Method Selection Modal */}
      {paymentModalOpen && selectedOrder && restaurant && (
        <Dialog isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Complete Bill & Collect Payment">
          <div className="space-y-5 p-1">
            {(() => {
              const calcResult = calculateBillingTotals({
                items: selectedOrder.items || [],
                batches: selectedOrder.batches || [],
                discountAmount: Number(selectedOrder.discount_amount || 0),
                offerCode: selectedOrder.offer_code,
                specialInstructions: selectedOrder.special_instructions,
                offers: restaurant.settings.offers || [],
                settings: restaurant.settings,
                gstNumber: restaurant.gst_number,
                gstEnabled: restaurant.settings.gst_enabled,
                gstPercentage: restaurant.settings.gst_percentage || 0,
                serviceChargeEnabled: restaurant.settings.service_charge_enabled !== false,
                serviceChargePercentage: restaurant.settings.service_charge_percentage || 0,
                customCharges: restaurant.settings.custom_charges || []
              });

              return (
                <>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Net Payable Amount ({selectedOrder.order_type === 'takeaway' ? 'Takeaway' : selectedOrder.table_name || 'Dine-In'})
                    </p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(calcResult.grandTotal, restaurant.settings.currency)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      Order {getFormattedOrderId(selectedOrder, restaurant.name, orders)} • {calcResult.validSubtotal > 0 ? `Subtotal ${formatPrice(calcResult.validSubtotal, restaurant.settings.currency)}` : 'Bill Summary'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentMethod === 'cash'
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold hover:border-slate-300'
                        }`}
                      >
                        <Banknote className="h-6 w-6 text-emerald-600" />
                        <span className="text-sm font-bold">Cash Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('online')}
                        className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                          paymentMethod === 'online'
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 font-bold shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold hover:border-slate-300'
                        }`}
                      >
                        <CreditCard className="h-6 w-6 text-indigo-600" />
                        <span className="text-sm font-bold">Online / UPI</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                    <Button variant="ghost" onClick={() => setPaymentModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className={paymentMethod === 'cash' ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6' : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6'}
                      isLoading={submittingPayment}
                      disabled={submittingPayment || selectedOrder.payment_status === 'paid'}
                      onClick={handleConfirmPayment}
                    >
                      {paymentMethod === 'cash'
                        ? `Confirm Cash Payment (${formatPrice(calcResult.grandTotal, restaurant.settings.currency)})`
                        : `Confirm Online Payment (${formatPrice(calcResult.grandTotal, restaurant.settings.currency)})`}
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </Dialog>
      )}
      {/* Prepared Food Disposition & Order Cancellation Modal */}
      {cancelModalOpen && selectedOrder && (
        <Dialog isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} title="Cancel Order & Log Prepared Food Disposition">
          <div className="space-y-4 p-1 max-h-[80vh] overflow-y-auto">
            {(() => {
              const cancelModalCalc = calculateBillingTotals({
                items: selectedOrder.items || [],
                batches: selectedOrder.batches || [],
                discountAmount: Number(selectedOrder.discount_amount || 0),
                offerCode: selectedOrder.offer_code,
                specialInstructions: selectedOrder.special_instructions,
                offers: restaurant?.settings?.offers || [],
                settings: restaurant?.settings,
                gstNumber: restaurant?.gst_number,
                gstEnabled: restaurant?.settings?.gst_enabled,
                gstPercentage: restaurant?.settings?.gst_percentage || 0,
                serviceChargeEnabled: restaurant?.settings?.service_charge_enabled !== false,
                serviceChargePercentage: restaurant?.settings?.service_charge_percentage || 0,
                customCharges: restaurant?.settings?.custom_charges || []
              });

              return (
                <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase">
                      Cancellation Stage: {selectedOrder.status.toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
                      Total: {formatPrice(cancelModalCalc.grandTotal, restaurant?.settings?.currency)}
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400">
                    Order cancellation & inventory reversal. Select what happened to the prepared food or raw stock.
                  </p>
                </div>
              );
            })()}

            {/* Cancellation Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Cancellation *
              </label>
              <select
                value={cancellationReasonOption}
                onChange={e => setCancellationReasonOption(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                <option value="Customer refused / did not pay">Customer refused / did not pay</option>
                <option value="Long wait time">Long wait time / Customer walked out</option>
                <option value="Customer changed mind">Customer changed mind</option>
                <option value="Wrong dish prepared">Wrong dish prepared / Kitchen error</option>
                <option value="Food quality issue">Food quality issue / Complaint</option>
                <option value="Duplicate order">Duplicate order placed</option>
                <option value="Other">Other (specify below)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Additional Reason Notes</label>
              <input
                type="text"
                placeholder="Optional details or context..."
                value={customCancellationNotes}
                onChange={e => setCustomCancellationNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              />
            </div>

            {/* Disposition Type */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Prepared Food Disposition *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'reallocated', label: 'Reallocated', desc: 'Resold to another table' },
                  { id: 'staff_meal', label: 'Staff Meal', desc: 'Given to kitchen/floor staff' },
                  { id: 'complimentary', label: 'Complimentary', desc: 'Offered as free item' },
                  { id: 'owner_internal', label: 'Owner / Tasting', desc: 'Internal testing/use' },
                  { id: 'waste', label: 'Waste / Discard', desc: 'Trashed / Spoiled' },
                  { id: 'other', label: 'Other', desc: 'Custom handling' }
                ].map(disp => {
                  const isServed = selectedOrder.status === 'served';
                  const isDisabled = isServed && disp.id === 'reallocated';

                  return (
                    <button
                      key={disp.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setDispositionType(disp.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-100 dark:bg-slate-800'
                          : dispositionType === disp.id
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <p className="text-xs font-bold">{disp.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{disp.desc}</p>
                    </button>
                  );
                })}
              </div>
              {selectedOrder.status === 'served' && (
                <p className="text-[10px] text-gray-500 font-semibold">
                  Note: "Reallocated" is disabled because food was already served to a customer.
                </p>
              )}
            </div>

            {/* Extra Fields based on Disposition */}
            {dispositionType === 'reallocated' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Destination Order / Table #</label>
                <input
                  type="text"
                  placeholder="e.g. Table 4 / Order #1234"
                  value={destinationOrderDisplayId}
                  onChange={e => setDestinationOrderDisplayId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                />
              </div>
            )}

            {dispositionType === 'waste' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Waste Reason</label>
                <select
                  value={wasteReason}
                  onChange={e => setWasteReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
                >
                  <option value="Customer Refused Order">Customer Refused Order</option>
                  <option value="Burnt / Overcooked">Burnt / Overcooked in Kitchen</option>
                  <option value="Dropped / Contaminated">Dropped / Contaminated</option>
                  <option value="Cold / Quality Deteriorated">Cold / Quality Deteriorated</option>
                  <option value="Unclaimed Takeaway">Unclaimed Takeaway</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Disposition Notes {dispositionType === 'other' && '*'}</label>
              <textarea
                rows={2}
                placeholder="Details on food disposition..."
                value={dispositionNotes}
                onChange={e => setDispositionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-semibold"
              />
            </div>

            {/* Restore Raw Inventory Option */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-3 space-y-1.5">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreInventoryStock}
                  onChange={e => setRestoreInventoryStock(e.target.checked)}
                  className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Restore Raw Inventory Stock (Default: OFF)
                  </p>
                  <p className="text-[10px] text-amber-800 dark:text-amber-300">
                    Check ONLY if raw ingredients were NOT cooked or damaged and can safely return to pantry.
                  </p>
                </div>
              </label>
            </div>

            {/* Refund Status if Paid */}
            {selectedOrder.payment_status === 'paid' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl p-3 space-y-1.5">
                <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                  Payment Refund Status
                </label>
                <select
                  value={refundStatusSelection}
                  onChange={e => setRefundStatusSelection(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold"
                >
                  <option value="none">No Refund (Customer charged/forfeited)</option>
                  <option value="pending">Refund Pending (To be processed by cashier)</option>
                  <option value="processed">Refund Processed (Cash/UPI refunded)</option>
                  <option value="declined">Refund Declined / Not Applicable</option>
                </select>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>
                Go Back
              </Button>
              <Button
                variant="danger"
                isLoading={isSubmittingCancellation}
                disabled={isSubmittingCancellation}
                onClick={handleConfirmCancellationWithDisposition}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5"
              >
                Confirm Cancellation & Log Disposition
              </Button>
            </div>
          </div>
        </Dialog>
      )}

                      {activeRole !== 'waiter' && effectiveStatus !== 'completed' && effectiveStatus !== 'cancelled' && (
                        <Button 
                          size="sm" 
                          variant="danger" 
                          className="cursor-pointer" 
                          isLoading={isSubmittingCancellation}
                          disabled={isSubmittingCancellation}
                          onClick={() => updateOrderStatus('cancelled')}
                        >
                          Cancel Order
                        </Button>
                      )}

                      {/* Manual Restore Button for post-prep cancelled orders */}
                      {effectiveStatus === 'cancelled' && selectedOrder.inventory_consumed && !selectedOrder.inventory_restored && (
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                          onClick={handleManualInventoryRestore}
                        >
                          Restore Raw Inventory
                        </Button>
                      )}

                      {(effectiveStatus === 'completed' || effectiveStatus === 'cancelled') && (
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 py-1">
                          <AlertCircle className="h-4 w-4" /> {effectiveStatus === 'cancelled' ? `Order cancelled (${selectedOrder.cancellation_reason || 'No reason specified'})` : 'This order has been finalized and cannot be edited.'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      {selectedOrder.items.map((item: any) => {
                        const isCancelled = item.is_cancelled || item.status === 'cancelled' || (item.batch_id && selectedOrder.batches?.find((b: any) => b.id === item.batch_id)?.status === 'cancelled');
                        const isServed = item.is_served || item.status === 'served' || (item.batch_id && selectedOrder.batches?.find((b: any) => b.id === item.batch_id)?.status === 'served');
                        return (
                          <div key={item.id} className={`p-4 flex items-center justify-between gap-4 ${isCancelled ? 'bg-rose-50/60 dark:bg-rose-950/20' : isServed ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                            <div>
                              <div className="flex items-center gap-2">
                                {isServed && <Check className="h-3.5 w-3.5 text-emerald-600 font-bold" />}
                                {isCancelled && <X className="h-3.5 w-3.5 text-rose-500 font-bold" />}
                                <p className={`font-semibold text-sm ${isCancelled ? 'text-rose-600 dark:text-rose-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                                   {item.menu_item_name}
                                </p>
                                {isServed && (
                                  <Badge variant="success" className="text-[10px] py-0.5 px-2 font-bold uppercase tracking-wider">
                                    Served
                                  </Badge>
                                )}
                                {isCancelled && (
                                  <Badge variant="error" className="text-[10px] py-0.5 px-2 font-bold uppercase tracking-wider">
                                    Cancelled by Kitchen {selectedOrder.cancellation_reason ? `("${selectedOrder.cancellation_reason}")` : ''}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 font-semibold mt-0.5">{item.quantity}x @ {formatPrice(item.price, restaurant.settings.currency)}</p>
                              {item.notes && (
                                <span className="inline-block mt-1 text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/30 font-semibold">
                                  Note: {item.notes}
                                </span>
                              )}
                            </div>
                            <span className={`font-bold ${isCancelled ? 'text-rose-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                              {formatPrice(isCancelled ? 0 : item.price * item.quantity, restaurant.settings.currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Activity Log */}
                  {((selectedOrder.batches || []).some((b: any) => b.accepted_by || b.preparing_by || b.ready_by || b.served_by) || selectedOrder.completed_by || selectedOrder.cancelled_by) && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Order Activity Log</h4>
                      <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {selectedOrder.batches?.map((b: any) => (
                          <div key={b.id} className="space-y-1">
                            {selectedOrder.batches!.length > 1 && <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Batch #{b.batch_number}</p>}
                            {b.accepted_by && <p>• Accepted by: <span className="text-slate-800 dark:text-slate-200">{b.accepted_by}</span></p>}
                            {b.preparing_by && <p>• Cooking by: <span className="text-slate-800 dark:text-slate-200">{b.preparing_by}</span></p>}
                            {b.ready_by && <p>• Ready by: <span className="text-slate-800 dark:text-slate-200">{b.ready_by}</span></p>}
                            {b.served_by && <p>• Served by: <span className="text-slate-800 dark:text-slate-200">{b.served_by}</span></p>}
                          </div>
                        ))}
                        {selectedOrder.completed_by && (
                          <p className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5">• Completed by: <span className="text-slate-800 dark:text-slate-200">{selectedOrder.completed_by}</span></p>
                        )}
                        {selectedOrder.cancelled_by && (
                          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-1.5 space-y-0.5">
                            <p>• Cancelled by: <span className="text-rose-600 dark:text-rose-400">{selectedOrder.cancelled_by}</span></p>
                            {selectedOrder.cancellation_reason && (
                              <p className="text-[10px] text-slate-400 font-medium pl-2">Reason: "{selectedOrder.cancellation_reason}"</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedOrder.special_instructions && (
                    <div className="space-y-1.5 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-stone-400 rounded-xl shadow-2xs">
                      <h4 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider">Customer Note</h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {selectedOrder.special_instructions}
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-2xl">
                  {(() => {
                    const calcResult = calculateBillingTotals({
                      items: selectedOrder.items || [],
                      batches: selectedOrder.batches || [],
                      discountAmount: Number(selectedOrder.discount_amount || 0),
                      offerCode: selectedOrder.offer_code,
                      specialInstructions: selectedOrder.special_instructions,
                      offers: restaurant.settings.offers || [],
                      settings: restaurant.settings,
                      gstNumber: restaurant.gst_number,
                      gstEnabled: restaurant.settings.gst_enabled,
                      gstPercentage: restaurant.settings.gst_percentage || 0,
                      serviceChargeEnabled: restaurant.settings.service_charge_enabled !== false,
                      serviceChargePercentage: restaurant.settings.service_charge_percentage || 0,
                      customCharges: restaurant.settings.custom_charges || []
                    });

                    const code = selectedOrder.offer_code;

                    return (
                      <div className="space-y-1.5 max-w-xs ml-auto">
                        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                          <span>Subtotal</span>
                          <span className="font-medium">{formatPrice(calcResult.validSubtotal, restaurant.settings.currency)}</span>
                        </div>
                        {calcResult.discountAmount > 0 && (
                          <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-bold">
                            <span>Promo Discount {code ? '(' + code + ')' : ''}</span>
                            <span>-{formatPrice(calcResult.discountAmount, restaurant.settings.currency)}</span>
                          </div>
                        )}
                        {calcResult.customChargesSnapshot.map((c, i) => (
                          <div key={i} className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                            <span>{c.name} {c.taxable ? '(Taxable)' : ''}</span>
                            <span className="font-medium">{formatPrice(c.calculatedAmount, restaurant.settings.currency)}</span>
                          </div>
                        ))}
                        {calcResult.gstAmount > 0 && (
                          calcResult.taxType === 'cgst_sgst' && calcResult.cgstPercentage > 0 ? (
                            <>
                              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                                <span>CGST ({calcResult.cgstPercentage}%)</span>
                                <span className="font-medium">{formatPrice(calcResult.cgstAmount, restaurant.settings.currency)}</span>
                              </div>
                              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                                <span>SGST ({calcResult.sgstPercentage}%)</span>
                                <span className="font-medium">{formatPrice(calcResult.sgstAmount, restaurant.settings.currency)}</span>
                              </div>
                            </>
                          ) : (
                            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                              <span>GST ({calcResult.taxRateSnapshot || 0}%)</span>
                              <span className="font-medium">{formatPrice(calcResult.gstAmount, restaurant.settings.currency)}</span>
                            </div>
                          )
                        )}
                        {restaurant.settings.service_charge_enabled !== false && calcResult.serviceChargeAmount > 0 && (
                          <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                            <span>Service Charge ({restaurant.settings.service_charge_percentage || 0}%)</span>
                            <span className="font-medium">{formatPrice(calcResult.serviceChargeAmount, restaurant.settings.currency)}</span>
                          </div>
                        )}
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Grand Total</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{formatPrice(calcResult.grandTotal, restaurant.settings.currency)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-slate-400 text-sm gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <ClipboardList className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="font-semibold text-slate-600 dark:text-slate-400">No Order Selected</p>
                  <p className="text-xs text-slate-400 mt-0.5">Select an order from the list to view details and manage billing.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Requests Tab View */}
      {activeTab === 'requests' && (
        <Card className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Customer Requests & Waiter Calls</h3>
              <p className="text-xs text-slate-500">Live notifications and waiter calls from dining tables</p>
            </div>
            <Button
              size="sm"
              onClick={handleSeedTestRequest}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Seed Test Request
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {customerRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <span className="font-semibold text-slate-600 dark:text-slate-400">All customer requests resolved!</span>
                <span className="text-xs text-slate-400">Notifications from customers at tables will appear here in real time.</span>
                <Button
                  size="sm"
                  onClick={handleSeedTestRequest}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                >
                  + Seed Test Request Now
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left">Dining Location</th>
                      <th scope="col" className="px-6 py-4 text-left">Call Request Type</th>
                      <th scope="col" className="px-6 py-4 text-left">Time Received</th>
                      <th scope="col" className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {customerRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/25 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-950 dark:text-white">
                          {req.table_name}
                        </td>
                        <td className="px-6 py-4">
                          {req.status === 'pending' ? (
                            <Badge variant="purple">Pending</Badge>
                          ) : req.status === 'accepted' ? (
                            <Badge variant="warning">Waiter On Way</Badge>
                          ) : (
                            <Badge variant="success">Completed</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                          {formatExactTimestamp(req.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          {req.status === 'pending' && (
                            <button
                              disabled={processingRequestIds.includes(req.id)}
                              className="inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                              onClick={() => handleAcceptRequest(req.id)}
                            >
                              {processingRequestIds.includes(req.id) && (
                                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                              )}
                              Accept Request
                            </button>
                          )}
                          {req.status !== 'completed' && (
                            <button
                              disabled={processingRequestIds.includes(req.id)}
                              className="inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer ml-2"
                              onClick={() => handleResolveRequest(req.id)}
                            >
                              {processingRequestIds.includes(req.id) ? (
                                <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              Mark Completed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Toast Notification */}
      {toast && toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border animate-pop animate-fade-in ${
          toast.variant === 'error'
            ? 'bg-rose-600 text-white border-rose-500'
            : toast.variant === 'info'
            ? 'bg-amber-600 text-white border-amber-500'
            : 'bg-emerald-600 text-white border-emerald-500'
        }`}>
          <div className="bg-white/20 p-2 rounded-lg">
            {toast.variant === 'error' ? (
              <XCircle className="h-5 w-5 text-white animate-bounce" />
            ) : toast.variant === 'info' ? (
              <AlertCircle className="h-5 w-5 text-white animate-bounce" />
            ) : (
              <Bell className="h-5 w-5 text-white animate-bounce" />
            )}
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide uppercase">{toast.title || (toast.variant === 'error' ? 'Error' : toast.variant === 'info' ? 'Notice' : 'New Order')}</p>
            <p className="text-xs text-white/95 font-medium">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="ml-4 hover:bg-white/10 p-1 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Waiter POS Punch Order Modal */}
      {restaurant && (
        <PunchOrderModal
          isOpen={punchModalOpen}
          onClose={() => setPunchModalOpen(false)}
          restaurant={restaurant}
          staffName={profile?.full_name || 'Staff Member'}
          onOrderCreated={async () => {
            await safeReloadOrders(restaurant.id);
          }}
        />
      )}

      {/* Pay Merged Group — Payment Method Modal */}
        <Dialog
          isOpen={payMergedModalOpen}
          onClose={() => setPayMergedModalOpen(false)}
          title="COMPLETE MERGED BILL"
          size="sm"
          footer={
            <div className="flex gap-3 w-full">
              <Button variant="outline" size="sm" className="flex-1 cursor-pointer" onClick={() => setPayMergedModalOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
                onClick={executePayMergedGroup}
              >
                Confirm Payment
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{mergedGroupDetails?.group?.name}</p>
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                <span>Merged Outstanding Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {formatPrice(mergedGroupDetails?.groupTotals?.unpaidTotal ?? mergedGroupDetails?.groupTotals?.total ?? 0, restaurant?.settings?.currency)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Select Payment Method:</span>
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethodChoice === 'cash'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 font-bold text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="mergedPayMethod" checked={paymentMethodChoice === 'cash'} onChange={() => setPaymentMethodChoice('cash')} className="accent-emerald-600" />
                <Banknote className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Cash</span>
              </label>
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  paymentMethodChoice === 'online_upi' || (paymentMethodChoice as string) === 'online / upi'
                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 font-bold text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="mergedPayMethod" checked={paymentMethodChoice === 'online_upi' || (paymentMethodChoice as string) === 'online / upi'} onChange={() => setPaymentMethodChoice('online_upi')} className="accent-indigo-600" />
                <CreditCard className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-200">Online / UPI</span>
              </label>
            </div>
          </div>
        </Dialog>

        {/* Printable Bill Preview Modal */}
        {printOrderData && (
          <Dialog
            isOpen={printModalOpen}
            onClose={() => setPrintModalOpen(false)}
            title="PRINT BILL PREVIEW"
            size="md"
            footer={
              <div className="flex gap-3 w-full justify-end">
                <Button variant="outline" size="sm" onClick={() => setPrintModalOpen(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 cursor-pointer"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                >
                  <Printer className="h-4 w-4" /> Print Physical Receipt
                </Button>
              </div>
            }
          >
            <div id="printable-bill-container" className="space-y-4 p-4 font-mono text-xs text-slate-900 bg-white border border-slate-200 rounded-xl shadow-inner max-h-[65vh] overflow-y-auto">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <h3 className="text-base font-bold uppercase tracking-wide">{printOrderData.restaurant.name}</h3>
                <p className="text-[11px] text-slate-500">{printOrderData.restaurant.address || 'Dining QR Order System'}</p>
                <p className="text-[11px] text-slate-500">Tel: {printOrderData.restaurant.phone || 'N/A'}</p>
              </div>

              <div className="space-y-1 py-2 border-b border-dashed border-slate-300 text-[11px]">
                <p><span className="font-bold">Order ID:</span> {getFormattedOrderId(printOrderData.order, printOrderData.restaurant.name, orders)}</p>
                <p><span className="font-bold">Type:</span> {printOrderData.order.order_type === 'takeaway' ? 'TAKEAWAY' : printOrderData.order.order_type === 'reservation' ? 'RESERVATION' : `TABLE (${printOrderData.order.table_name || 'N/A'})`}</p>
                <p><span className="font-bold">Date:</span> {formatExactTimestamp(printOrderData.order.created_at)}</p>
                <p><span className="font-bold">Payment Status:</span> {printOrderData.order.payment_status === 'paid' || printOrderData.order.payment_status === 'customer_marked_paid' ? 'PAID' : 'UNPAID'}</p>
              </div>

              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-dashed border-slate-300 font-bold">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printOrderData.validItems.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-1">{item.quantity}x {item.menu_item_name}</td>
                      <td className="py-1 text-right">{formatPrice(item.price * item.quantity, printOrderData.restaurant.settings?.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(printOrderData.calcResult.validSubtotal, printOrderData.restaurant.settings?.currency)}</span>
                </div>
                {printOrderData.calcResult.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({printOrderData.order.offer_code || 'Promo'}):</span>
                    <span>-{formatPrice(printOrderData.calcResult.discountAmount, printOrderData.restaurant.settings?.currency)}</span>
                  </div>
                )}
                {printOrderData.restaurant.settings?.gst_enabled !== false && printOrderData.calcResult.gstAmount > 0 && (
                  <div className="flex justify-between">
                    <span>GST ({printOrderData.restaurant.settings?.gst_percentage || 0}%):</span>
                    <span>{formatPrice(printOrderData.calcResult.gstAmount, printOrderData.restaurant.settings?.currency)}</span>
                  </div>
                )}
                {printOrderData.restaurant.settings?.service_charge_enabled !== false && printOrderData.calcResult.serviceChargeAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Service Charge ({printOrderData.restaurant.settings?.service_charge_percentage || 0}%):</span>
                    <span>{formatPrice(printOrderData.calcResult.serviceChargeAmount, printOrderData.restaurant.settings?.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-300">
                  <span>Total:</span>
                  <span>{formatPrice(printOrderData.calcResult.grandTotal, printOrderData.restaurant.settings?.currency)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-3 border-t border-dashed border-slate-300">
                <p>Thank you for dining with us!</p>
                <p>Powered by CleverOps · cleverops.in</p>
              </div>
            </div>
          </Dialog>
        )}

        {/* Seat Guest & Start Session Modal (BUG-RES-001 & BUG-RES-003) */}
        {seatGuestModalOpen && reservationToSeat && (
          <Dialog isOpen={seatGuestModalOpen} onClose={() => setSeatGuestModalOpen(false)} title="Seat Guest & Start Dining Session">
            <div className="space-y-4 p-2">
              {(() => {
                const parsed = parseReservationDetails(reservationToSeat);
                return (
                  <div className="bg-[#F8F8F6] dark:bg-stone-900 border border-[#E7E5E4] dark:border-stone-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {parsed.name || 'Guest Reservation'}
                        </span>
                        {parsed.phone && (
                          <p className="text-xs text-stone-500 font-mono mt-0.5">{parsed.phone}</p>
                        )}
                      </div>
                      <span className="px-2.5 py-0.5 bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-full">
                        {parsed.guests} Guests
                      </span>
                    </div>
                    <div className="text-xs text-stone-600 dark:text-stone-400 space-y-1.5 pt-1 border-t border-stone-200 dark:border-stone-800">
                      <p>• Booking Time: <span className="font-bold font-mono text-stone-900 dark:text-stone-100">{parsed.date} {parsed.time}</span></p>
                      {parsed.notes && <p>• Customer Note: <span className="italic text-stone-700 dark:text-stone-300">{parsed.notes}</span></p>}
                      <p>• Pre-ordered Items: <span className="font-bold text-stone-900 dark:text-stone-100">{(reservationToSeat.items || []).length} item(s)</span></p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                  Select Physical Table to Assign *
                </label>
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                  <div className="grid grid-cols-12 bg-stone-50 dark:bg-stone-900/50 px-3 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400">
                    <span className="col-span-5">Table</span>
                    <span className="col-span-2 text-center">Seats</span>
                    <span className="col-span-3 text-center">Zone</span>
                    <span className="col-span-2 text-right">Status</span>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800">
                    {allTables
                      .filter(t => !t.is_archived && t.name?.toLowerCase() !== 'takeaway')
                      .map(t => {
                        const isOccupied = t.is_occupied || t.occupancy_status === 'occupied';
                        const isReserved = t.occupancy_status === 'reserved';
                        const resDetails = parseReservationDetails(reservationToSeat);
                        const guestCountNum = parseInt(resDetails.guests || '1', 10) || 1;
                        const tSeats = t.seats || t.capacity || 4;
                        const isBestFit = !isOccupied && !isReserved && tSeats >= guestCountNum && tSeats <= guestCountNum + 2;

                        return (
                          <div
                            key={t.id}
                            onClick={() => !isOccupied && setSelectedTableForSeat(t.id)}
                            className={`grid grid-cols-12 px-3 py-2 text-xs items-center cursor-pointer transition-colors ${
                              selectedTableForSeat === t.id
                                ? 'bg-stone-100 dark:bg-stone-800 font-semibold border-l-2 border-stone-900'
                                : 'hover:bg-stone-50 dark:hover:bg-stone-850'
                            } ${isOccupied ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            <span className="col-span-5 flex items-center gap-1.5 font-medium text-stone-900 dark:text-stone-100">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: isOccupied ? '#f43f5e' : isReserved ? '#a8a29e' : '#10b981'
                                }}
                              />
                              {t.display_number || t.name}
                              {isBestFit && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded font-medium">
                                  Best Fit
                                </span>
                              )}
                            </span>
                            <span className="col-span-2 text-center font-mono text-stone-600 dark:text-stone-400">{tSeats}</span>
                            <span className="col-span-3 text-center text-[11px] text-stone-500 truncate">{t.zone_name || 'General'}</span>
                            <span className="col-span-2 text-right">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                  isOccupied
                                    ? 'bg-stone-50 text-stone-700 border-stone-300'
                                    : isReserved
                                    ? 'bg-stone-50 text-stone-600 border-stone-200'
                                    : 'bg-stone-50 text-stone-900 border-stone-300'
                                }`}
                              >
                                {isOccupied ? 'Occupied' : isReserved ? 'Reserved' : 'Available'}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Seating the guest will mark the table as Occupied and release pre-ordered dishes to the Kitchen Display System (KDS).
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" onClick={() => setSeatGuestModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-stone-900 hover:bg-black dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 font-bold px-5"
                  disabled={!selectedTableForSeat || isSeatingGuest}
                  isLoading={isSeatingGuest}
                  onClick={handleSeatReservation}
                >
                  Seat Guest &amp; Start Session
                </Button>
              </div>
            </div>
          </Dialog>
        )}

        {/* Customer Lookup & Re-Order Dialog (Toast POS / Square Style) */}
        {customerLookupOpen && (
          <Dialog
            isOpen={customerLookupOpen}
            onClose={() => setCustomerLookupOpen(false)}
            title="Customer Lookup &amp; Quick Re-order"
          >
            <div className="space-y-4 pt-2">
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Search repeat guests by mobile number, name, or ordered items.
              </p>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Enter 10-digit mobile number or customer name..."
                  value={customerLookupQuery}
                  onChange={(e) => setCustomerLookupQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
                  autoFocus
                />
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl">
                {filteredRecentCustomers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-400">
                    No matching customer records found.
                  </div>
                ) : (
                  filteredRecentCustomers.map((cust, idx) => (
                    <div
                      key={`cust_${cust.phone || cust.name}_${idx}`}
                      className="p-3 hover:bg-stone-50 dark:hover:bg-stone-850 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-900 dark:text-stone-100 truncate">
                            {cust.name}
                          </span>
                          {cust.phone && (
                            <span className="font-mono text-[11px] text-stone-600 dark:text-stone-400">
                              {cust.phone}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-full font-semibold">
                            {cust.orderCount} {cust.orderCount === 1 ? 'visit' : 'visits'}
                          </span>
                        </div>
                        {cust.lastItems.length > 0 && (
                          <p className="text-[11px] text-stone-500 truncate">
                            Last order: {cust.lastItems.slice(0, 3).join(', ')}{cust.lastItems.length > 3 ? '...' : ''}
                          </p>
                        )}
                        <p className="text-[10px] text-stone-400">
                          Last seen {formatDate(cust.lastOrderDate)}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-stone-900 hover:bg-black text-white dark:bg-stone-100 dark:hover:bg-white dark:text-stone-900 text-xs font-bold px-3 py-1 rounded-lg cursor-pointer"
                          onClick={() => {
                            setCustomerLookupOpen(false);
                            setPunchModalOpen(true);
                          }}
                        >
                          Punch Order
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 flex justify-end border-t border-stone-100 dark:border-stone-800">
                <Button variant="ghost" size="sm" onClick={() => setCustomerLookupOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Dialog>
        )}
    </div>
  );
}
