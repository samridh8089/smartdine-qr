'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, Order, Restaurant, CustomerRequest, OrderBatch } from '@/lib/db';
import { calculateBillingTotals } from '@/lib/billingEngine';
import { getActiveUser, supabase } from '@/lib/supabase';
import { useRestaurant } from '../../layout';
import { formatPrice, formatDate, getFormattedOrderId } from '@/lib/utils';
import { formatExactTimestamp } from '@/lib/timestamp';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Search, Printer, Check, X, AlertCircle, ShoppingBag, Bell, ClipboardList, CheckCircle, ChefHat, Plus, XCircle, Banknote, CreditCard } from 'lucide-react';
import PunchOrderModal from '@/components/dashboard/PunchOrderModal';
import { playLoudBell, unlockAudio } from '@/lib/soundAlert';
import { registerServiceWorkerAndPush } from '@/lib/registerWebPush';


export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('id');

  const { restaurant, activeRole, profile } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderIdParam || null);
  const rawSelectedOrder = (selectedOrderId ? orders.find(o => o.id === selectedOrderId) : null) || (orders.length > 0 ? orders[0] : null);
  const selectedOrder = useMemo(() => {
    if (!rawSelectedOrder) return null;
    const canonicalStatus = db.calculateAggregateOrderStatus(rawSelectedOrder.status, rawSelectedOrder.batches);
    return {
      ...rawSelectedOrder,
      status: canonicalStatus
    };
  }, [rawSelectedOrder]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Tab state: 'orders' or 'requests'
  const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders');
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);

  // Real-time toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean; title?: string; variant?: 'success' | 'info' | 'warning' } | null>(null);
  const showToast = (message: string, title?: string, variant?: 'success' | 'info' | 'warning') => {
    setToast({ message, title: title || (variant === 'info' ? 'Order Notice' : 'New Order'), visible: true, variant: variant || 'success' });
    setTimeout(() => {
      setToast(prev => prev && prev.message === message ? { ...prev, visible: false } : prev);
    }, 5000);
  };

  const [processingRequestIds, setProcessingRequestIds] = useState<string[]>([]);
  const [processingOrderIds, setProcessingOrderIds] = useState<string[]>([]);
  const [punchModalOpen, setPunchModalOpen] = useState(false);
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
  }, [selectedOrder, mergeGroupIdParam, restaurant]);

  const [payMergedModalOpen, setPayMergedModalOpen] = useState(false);
  const [paymentMethodChoice, setPaymentMethodChoice] = useState<'cash' | 'online_upi'>('cash');

  const handlePayMergedGroup = () => {
    if (!mergedGroupDetails) return;
    setPayMergedModalOpen(true);
  };

  const executePayMergedGroup = async () => {
    if (!mergedGroupDetails || !restaurant) return;

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
          .neq('status', 'cancelled');

        for (const o of (groupOrders || [])) {
          await db.updateOrderStatus(o.id, 'completed', profile?.full_name || 'Cashier');
        }
      }

      setPayMergedModalOpen(false);
      await safeReloadOrders(restaurant.id);
      alert(`Merged Session "${mergedGroupDetails.group.name}" completely settled & paid via ${paymentMethodChoice.toUpperCase()}.`);
    } catch (err: any) {
      alert('Failed to complete merged session: ' + err.message);
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
        const title = `🚨 NEW ORDER - ${order.table_name || 'Table X'}`;
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
    const allOrders = await db.getOrders(restId);
    const filteredForRole = activeRole === 'waiter'
      ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
      : allOrders;
    setOrders(filteredForRole);

    // Cache existing order IDs on initial load so we don't chime for them
    allOrders.forEach(o => alertedOrderIds.current.add(o.id));

    // Load pending & active requests
    let reqs = await db.getCustomerRequests(restId);
    let activeReqs = reqs.filter(r => r.status === 'pending');
    if (activeReqs.length === 0) {
      try {
        const tables = await db.getTables(restId);
        const tableId = tables.length > 0 ? tables[0].id : 'takeaway';
        await db.createCustomerRequest(restId, tableId, 'call_waiter');
        reqs = await db.getCustomerRequests(restId);
        activeReqs = reqs.filter(r => r.status === 'pending');
      } catch (e) {}
    }
    setCustomerRequests(activeReqs);

    if (orderIdParam) {
      setSelectedOrderId(orderIdParam);
    } else if (filteredForRole.length > 0 && !selectedOrderIdRef.current) {
      setSelectedOrderId(filteredForRole[0].id);
    }

    setLoading(false);
  };

  // Priority 9 (Phase-20E): Open Order deep-linking with auto-scroll, statusFilter unblocking, and focus
  useEffect(() => {
    if (!orderIdParam || orders.length === 0) return;
    
    setSelectedOrderId(orderIdParam);
    const targetOrder = orders.find(o => o.id === orderIdParam);
    if (targetOrder && statusFilter !== 'all' && targetOrder.status !== statusFilter) {
      setStatusFilter('all');
    }

    const timer = setTimeout(() => {
      const el = document.getElementById(`order-item-${orderIdParam}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [orderIdParam, orders, statusFilter]);

  useEffect(() => {
    if (restaurant?.id) {
      loadInitialData(restaurant.id);
    }
  }, [restaurant, orderIdParam]);

  const safeReloadOrders = async (restId: string) => {
    if (isReloadingRef.current) {
      pendingReloadRef.current = true;
      return;
    }
    isReloadingRef.current = true;
    try {
      const allOrders = await db.getOrders(restId);
      const filteredOrders = activeRole === 'waiter'
        ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
        : allOrders;
      setOrders(filteredOrders);

      let reqs = await db.getCustomerRequests(restId);
      let activeReqs = reqs.filter(r => r.status === 'pending');
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

  useEffect(() => {
    if (restaurant?.id) {
      loadInitialData(restaurant.id);
    }
  }, [restaurant, orderIdParam]);

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
      .channel('live_orders_requests')
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
            setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
          }
          await reloadFnRef.current(restId);

          if (payload.eventType === 'INSERT') {
            const newOrderPayload = payload.new as Order;
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
                message: `🔔 ${req.table_name || 'Table'} requested ${req.type === 'call_waiter' ? 'Waiter Assistance' : 'The Bill'}`,
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
  }, [restaurant]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrderId(order.id);
    router.replace(`/dashboard/orders?id=${order.id}`);
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
    if (processingOrderIds.includes(selectedOrder.id)) return;

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

    const orderIdToUpdate = selectedOrder.id;
    setProcessingOrderIds(prev => [...prev, orderIdToUpdate]);
    
    // Immediate safe optimistic update
    setOrders(prev => prev.map(o => {
      if (o.id === orderIdToUpdate) {
        const updatedBatches = (o.batches || []).map((b: any) => ({ ...b, status }));
        return {
          ...o,
          status,
          batches: updatedBatches
        };
      }
      return o;
    }));

    try {
      if (status === 'served') {
        window.dispatchEvent(new Event('stop-waiter-sound'));
      }
      const updated = await db.updateOrderStatus(
        orderIdToUpdate, 
        status, 
        profile?.full_name || activeRole || 'Staff Member', 
        cancellationReason
      );
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      
      const allOrders = await db.getOrders(restaurant.id);
      const filteredOrders = activeRole === 'waiter'
        ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
        : allOrders;
      setOrders(filteredOrders);
      
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      const allOrders = await db.getOrders(restaurant.id);
      const filteredOrders = activeRole === 'waiter'
        ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
        : allOrders;
      setOrders(filteredOrders);

      if (err.code === 'ORDER_ALREADY_SERVED' || err.message?.includes('already served')) {
        window.dispatchEvent(new Event('stop-waiter-sound'));
        showToast("Order already served by another team member.", "Waiter Notice", "info");
        return;
      }
      alert(`Failed to update order status: ${err.message}`);
    } finally {
      setProcessingOrderIds(prev => prev.filter(id => id !== orderIdToUpdate));
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
    setIsSubmittingCancellation(true);
    setOrders(prev => prev.map(o => o.id === orderIdToCancel ? { ...o, status: 'cancelled' } : o));

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

      // 3. Record Prepared Food Disposition for each active item
      const { recordPreparedFoodDisposition } = await import('@/lib/inventoryEngine');
      for (const item of (selectedOrder.items || [])) {
        if (item.is_cancelled || item.status === 'cancelled') continue;

        await recordPreparedFoodDisposition({
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
        });
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

      setCancelModalOpen(false);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));

      const allOrders = await db.getOrders(restaurant.id);
      const filteredOrders = activeRole === 'waiter'
        ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
        : allOrders;
      setOrders(filteredOrders);
      window.dispatchEvent(new Event('storage'));
      alert('Order cancelled and prepared food disposition logged successfully.');
    } catch (err: any) {
      const allOrders = await db.getOrders(restaurant.id);
      setOrders(allOrders);
      alert(`Error during cancellation: ${err.message}`);
    } finally {
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

  const handlePrintInvoice = () => {
    if (!selectedOrder || !restaurant) return;

    const calcResult = calculateBillingTotals({
      items: selectedOrder.items || [],
      batches: selectedOrder.batches || [],
      discountAmount: Number(selectedOrder.discount_amount || 0),
      offerCode: selectedOrder.offer_code,
      specialInstructions: selectedOrder.special_instructions,
      offers: restaurant.settings.offers || [],
      gstEnabled: restaurant.settings.gst_enabled !== false,
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
    setSubmittingPayment(true);
    try {
      const calcResult = calculateBillingTotals({
        items: selectedOrder.items || [],
        batches: selectedOrder.batches || [],
        discountAmount: Number(selectedOrder.discount_amount || 0),
        gstEnabled: restaurant.settings.gst_enabled !== false,
        gstPercentage: restaurant.settings.gst_percentage || 0,
        serviceChargeEnabled: restaurant.settings.service_charge_enabled !== false,
        serviceChargePercentage: restaurant.settings.service_charge_percentage || 0,
        customCharges: restaurant.settings.custom_charges || []
      });

      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          marked_paid_by: profile?.full_name || activeRole || 'Staff Member',
          subtotal: calcResult.validSubtotal,
          gst: calcResult.gstAmount,
          service_charge: calcResult.serviceChargeAmount,
          custom_charges: calcResult.customChargesSnapshot,
          total: calcResult.grandTotal
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Authoritative lifecycle completion: consumes any unconsumed inventory, syncs batches & items
      const updated = await db.updateOrderStatus(
        selectedOrder.id, 
        'completed', 
        profile?.full_name || activeRole || 'Staff Member'
      );

      setPaymentModalOpen(false);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));

      const allOrders = await db.getOrders(restaurant.id);
      setOrders(allOrders);

      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      alert(`Failed to complete payment: ${err.message}`);
    } finally {
      setSubmittingPayment(false);
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

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const formattedId = getFormattedOrderId(order, restaurant?.name || '', orders);
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formattedId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.table_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(i => i.menu_item_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 min-h-full pb-12">
      {/* Alarm alerting cards for waiters */}
      {(activeRole === 'waiter' || activeRole === 'owner' || activeRole === 'manager') && (
        <div className="flex flex-col gap-4 shrink-0 animate-fade-in">
          {orders.some(o => o.status === 'ready') && (
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 text-orange-900 dark:text-orange-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center shrink-0">
                  <ChefHat className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Order Ready for Pickup</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">Kitchen has finished. Deliver to table and mark as served.</p>
                </div>
              </div>
              <button
                disabled={orders.find(o => o.status === 'ready') ? processingOrderIds.includes(orders.find(o => o.status === 'ready')!.id) : false}
                className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                onClick={async () => {
                  const firstReady = orders.find(o => o.status === 'ready');
                  if (!firstReady) {
                    showToast("Order already served by another team member.", "Waiter Notice", "info");
                    return;
                  }

                  if (firstReady.status === 'served' || firstReady.status === 'completed') {
                    window.dispatchEvent(new Event('stop-waiter-sound'));
                    showToast("Order already served by another team member.", "Waiter Notice", "info");
                    return;
                  }

                  setProcessingOrderIds(prev => [...prev, firstReady.id]);
                  setOrders(prev => prev.map(o => o.id === firstReady.id ? { ...o, status: 'served' } : o));
                  try {
                    window.dispatchEvent(new Event('stop-waiter-sound'));
                    const updated = await db.updateOrderStatus(firstReady.id, 'served', profile?.full_name || activeRole || 'Staff Member');
                    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                    const allOrders = await db.getOrders(restaurant.id);
                    setOrders(allOrders);
                    window.dispatchEvent(new Event('storage'));
                  } catch (err: any) {
                    const allOrders = await db.getOrders(restaurant.id);
                    const filteredOrders = activeRole === 'waiter'
                      ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
                      : allOrders;
                    setOrders(filteredOrders);

                    if (err.code === 'ORDER_ALREADY_SERVED' || err.message?.includes('already served')) {
                      window.dispatchEvent(new Event('stop-waiter-sound'));
                      showToast("Order already served by another team member.", "Waiter Notice", "info");
                      return;
                    }
                    alert(`Failed to serve order: ${err.message}`);
                  } finally {
                    setProcessingOrderIds(prev => prev.filter(id => id !== firstReady.id));
                  }
                }}
              >
                {orders.find(o => o.status === 'ready') && processingOrderIds.includes(orders.find(o => o.status === 'ready')!.id) && (
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Serve Order
              </button>
            </div>
          )}

          {customerRequests.some(r => r.status === 'pending') && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Customer Calling Waiter</p>
                  <div className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5 mt-0.5">
                    {customerRequests.filter(r => r.status === 'pending').map(r => (
                      <p key={r.id}>{r.table_name} — {r.type === 'call_waiter' ? 'Service Request' : 'Bill Request'}</p>
                    ))}
                  </div>
                </div>
              </div>
              <button
                disabled={customerRequests.find(r => r.status === 'pending') ? processingRequestIds.includes(customerRequests.find(r => r.status === 'pending')!.id) : false}
                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                onClick={async () => {
                  const firstPending = customerRequests.find(r => r.status === 'pending');
                  if (firstPending) {
                    await handleAcceptRequest(firstPending.id);
                  }
                }}
              >
                {customerRequests.find(r => r.status === 'pending') && processingRequestIds.includes(customerRequests.find(r => r.status === 'pending')!.id) && (
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Accept
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header section: title + actions + tabs all in one row */}
      <div className="shrink-0 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[36px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Live Orders &amp; Requests</h2>
          <p className="text-slate-500 dark:text-slate-400 text-[14px] font-normal mt-1">Manage statuses, print bills, and resolve customer requests in real time.</p>
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
              <Bell className="h-3.5 w-3.5" /> Customer Calls
              {customerRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center">
                  {customerRequests.length}
                </span>
              )}
            </button>
          </div>

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
          {/* Left Side: Order List */}
          <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs self-start md:sticky md:top-6">
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
                <option value="served">Served</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-1">
              {filteredOrders.length === 0 ? (
                <div className="flex items-center justify-center text-center text-slate-400 text-sm py-12 flex-col gap-2">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                  <span>No orders match this query.</span>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      id={`order-item-${order.id}`}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/80 shadow-sm ring-2 ring-emerald-500/30 text-slate-900 dark:text-white' 
                          : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-950 dark:text-white">{getFormattedOrderId(order, restaurant?.name || '', orders)}</span>
                          {getStatusBadge(order.status)}
                          {order.payment_status === 'paid' ? (
                            <Badge variant="success">Paid</Badge>
                          ) : order.payment_status === 'customer_marked_paid' ? (
                            <Badge variant="warning">Marked Paid</Badge>
                          ) : null}
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                          {order.order_type === 'takeaway' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase tracking-wide">
                              Takeaway
                            </span>
                          ) : order.order_type === 'reservation' ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 uppercase tracking-wide">
                              Reservation
                            </span>
                          ) : (
                            <span>{order.table_name || 'N/A'}</span>
                          )}
                          <span>· {order.items.reduce((s, i) => s + i.quantity, 0)} items</span>
                          {order.order_type === 'takeaway' && (
                            <span className="text-purple-600 dark:text-purple-400 text-[9px]">
                              (Pickup {order.customer_arrival_minutes}m)
                            </span>
                          )}
                        </p>
                        <p className="text-xs truncate max-w-[200px] text-slate-500 dark:text-slate-400">
                          {order.items.map(i => i.menu_item_name).join(', ')}
                        </p>
                        {(() => {
                          const rawInst = order.special_instructions || (order.batches && order.batches[0]?.special_instructions) || '';
                          const cleanInst = rawInst
                            .replace(/^\[Batch #\d+\]:\s*/, '')
                            .split('\n')[0]
                            .trim();
                          if (cleanInst && !cleanInst.startsWith('[CANCELLED]')) {
                            return (
                              <div className="mt-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 px-2 py-0.5 rounded-md inline-block max-w-[220px] truncate">
                                📝 Note: {cleanInst}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="text-right space-y-1">
                        {(() => {
                          const cardCalc = calculateBillingTotals({
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
                          });
                          return <p className="font-bold text-sm text-slate-900 dark:text-white">{formatPrice(cardCalc.grandTotal, restaurant.settings.currency)}</p>;
                        })()}
                        <p className="text-[10px] text-slate-400 font-medium">{formatExactTimestamp(order.created_at)}</p>
                        {order.status === 'ready' && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 text-xs rounded-lg cursor-pointer"
                              isLoading={processingOrderIds.includes(order.id)}
                              disabled={processingOrderIds.includes(order.id)}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (order.status === 'served' || order.status === 'completed') {
                                  window.dispatchEvent(new Event('stop-waiter-sound'));
                                  showToast("Order already served by another team member.", "Waiter Notice", "info");
                                  return;
                                }

                                setProcessingOrderIds(prev => [...prev, order.id]);
                                try {
                                  window.dispatchEvent(new Event('stop-waiter-sound'));
                                  await db.updateOrderStatus(order.id, 'served', profile?.full_name || 'Waiter');
                                  const allOrders = await db.getOrders(restaurant.id);
                                  const filteredOrders = activeRole === 'waiter'
                                    ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
                                    : allOrders;
                                  setOrders(filteredOrders);
                                  window.dispatchEvent(new Event('storage'));
                                } catch (err: any) {
                                  if (err.code === 'ORDER_ALREADY_SERVED' || err.message?.includes('already served')) {
                                    window.dispatchEvent(new Event('stop-waiter-sound'));
                                    showToast("Order already served by another team member.", "Waiter Notice", "info");
                                    const allOrders = await db.getOrders(restaurant.id);
                                    const filteredOrders = activeRole === 'waiter'
                                      ? allOrders.filter(o => ['ready', 'served', 'completed'].includes(o.status))
                                      : allOrders;
                                    setOrders(filteredOrders);
                                    return;
                                  }
                                  alert(`Failed to serve order: ${err.message}`);
                                } finally {
                                  setProcessingOrderIds(prev => prev.filter(id => id !== order.id));
                                }
                              }}
                            >
                              Serve
                            </Button>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side: Order Detail & Billing panel */}
          <div className="hidden md:flex flex-1 flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm relative">
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-950 dark:text-white text-lg">Order {getFormattedOrderId(selectedOrder, restaurant?.name || '', orders)}</h3>
                      {selectedOrder.merge_group_id && (
                        <Button size="sm" variant="outline" className="text-xs font-bold text-indigo-600 border-indigo-200" onClick={() => setViewMode('merged')}>
                          View Merged Session ({mergedGroupDetails?.group?.name || 'Group'})
                        </Button>
                      )}
                      {selectedOrder.order_type === 'takeaway' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase tracking-wide">
                          Takeaway
                        </span>
                      )}
                      {getStatusBadge(selectedOrder.status)}
                      {selectedOrder.payment_status === 'paid' ? (
                        <Badge variant="success">Paid Verified</Badge>
                      ) : selectedOrder.payment_status === 'customer_marked_paid' ? (
                        <Badge variant="warning">Customer Marked Paid</Badge>
                      ) : selectedOrder.status === 'cancelled' ? null : (
                        <Badge variant="error">Payment Pending</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5 flex-wrap">
                      {selectedOrder.order_type === 'takeaway' ? (
                        <span className="text-purple-600 dark:text-purple-400 font-bold">Pickup Customer (Arrives in {selectedOrder.customer_arrival_minutes} mins)</span>
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
                  {selectedOrder.status === 'cancelled' && (
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
                              <div className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex justify-between items-center flex-wrap gap-1 min-w-0">
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
                                    <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Accepted</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Confirmed{batch.accepted_by ? ` by ${batch.accepted_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{formatExactTimestamp(batch.accepted_at)}</span>
                                    </div>
                                  )}
                                  {batch.preparing_at && (
                                    <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Preparing</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Cooking{batch.preparing_by ? ` by ${batch.preparing_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{formatExactTimestamp(batch.preparing_at)}</span>
                                    </div>
                                  )}
                                  <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-md p-2 space-y-1 text-[11px] mt-1">
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
                                    <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Accepted</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Confirmed{batch.accepted_by ? ` by ${batch.accepted_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{renderStepTime(batch.accepted_at, isAccepted)}</span>
                                    </div>
                                  )}

                                  {/* Preparing */}
                                  {isPreparing && (
                                    <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Preparing</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Cooking{batch.preparing_by ? ` by ${batch.preparing_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{renderStepTime(batch.preparing_at, isPreparing)}</span>
                                    </div>
                                  )}

                                  {/* Ready */}
                                  {isReady && (
                                    <div className="flex justify-between items-center text-purple-700 dark:text-purple-400 text-[11px] flex-wrap gap-1 min-w-0">
                                      <div className="min-w-0 truncate">
                                        <span className="font-bold">Ready</span>
                                        <span className="text-slate-400 text-[10px] block truncate">Food Ready{batch.ready_by ? ` by ${batch.ready_by}` : ''}</span>
                                      </div>
                                      <span className="font-mono font-bold shrink-0 whitespace-nowrap">{renderStepTime(batch.ready_at, isReady)}</span>
                                    </div>
                                  )}

                                  {/* Served */}
                                  {isServed && (
                                    <div className="flex justify-between items-center text-blue-700 dark:text-blue-400 text-[11px] flex-wrap gap-1 min-w-0">
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
                        <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 pt-1 flex-wrap gap-1 min-w-0">
                          <span className="font-semibold min-w-0 truncate">Cancelled:</span>
                          <span className="font-mono font-bold shrink-0 whitespace-nowrap">{formatExactTimestamp(selectedOrder.cancelled_at)}</span>
                        </div>
                      )}

                      {selectedOrder.paid_at && (
                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 pt-1 flex-wrap gap-1 min-w-0">
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
                      {activeRole !== 'waiter' && selectedOrder.status === 'new' && (
                        <Button 
                          size="sm" 
                          variant="primary" 
                          className="cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('accepted')}
                        >
                          Accept Order
                        </Button>
                      )}
                      {activeRole !== 'waiter' && selectedOrder.status === 'accepted' && (
                        <Button 
                          size="sm" 
                          className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('preparing')}
                        >
                          Start Preparing
                        </Button>
                      )}
                      {activeRole !== 'waiter' && selectedOrder.status === 'preparing' && (
                        <Button 
                          size="sm" 
                          className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('ready')}
                        >
                          Mark Ready for Pickup
                        </Button>
                      )}
                      {selectedOrder.status === 'ready' && (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('served')}
                        >
                          Serve Order
                        </Button>
                      )}
                      {selectedOrder.status === 'served' && (
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-bold shadow-md" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => setPaymentModalOpen(true)}
                        >
                          Complete Bill & Pay
                        </Button>
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
                gstEnabled: restaurant.settings.gst_enabled !== false,
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
                      disabled={submittingPayment}
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
                gstEnabled: restaurant?.settings?.gst_enabled !== false,
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
                <p className="text-[10px] text-rose-500 font-bold">
                  ⚠ Note: "Reallocated" is disabled because food was already served to a customer.
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

                      {activeRole !== 'waiter' && selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                        <Button 
                          size="sm" 
                          variant="danger" 
                          className="cursor-pointer" 
                          isLoading={processingOrderIds.includes(selectedOrder.id)}
                          disabled={processingOrderIds.includes(selectedOrder.id)}
                          onClick={() => updateOrderStatus('cancelled')}
                        >
                          Cancel Order
                        </Button>
                      )}

                      {/* Manual Restore Button for post-prep cancelled orders */}
                      {selectedOrder.status === 'cancelled' && selectedOrder.inventory_consumed && !selectedOrder.inventory_restored && (
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                          onClick={handleManualInventoryRestore}
                        >
                          Restore Raw Inventory
                        </Button>
                      )}

                      {(selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled') && (
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 py-1">
                          <AlertCircle className="h-4 w-4" /> {selectedOrder.status === 'cancelled' ? `Order cancelled (${selectedOrder.cancellation_reason || 'No reason specified'})` : 'This order has been finalized and cannot be edited.'}
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
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Chef Special Instructions</h4>
                      <p className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-sm rounded-xl p-4 leading-relaxed font-semibold">
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
                      gstEnabled: restaurant.settings.gst_enabled !== false,
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
                        {restaurant.settings.gst_enabled !== false && calcResult.gstAmount > 0 && (
                          <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                            <span>GST ({restaurant.settings.gst_percentage || 0}%)</span>
                            <span className="font-medium">{formatPrice(calcResult.gstAmount, restaurant.settings.currency)}</span>
                          </div>
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
          toast.variant === 'info'
            ? 'bg-amber-600 text-white border-amber-500'
            : 'bg-emerald-600 text-white border-emerald-500'
        }`}>
          <div className="bg-white/20 p-2 rounded-lg">
            {toast.variant === 'info' ? (
              <AlertCircle className="h-5 w-5 text-white animate-bounce" />
            ) : (
              <Bell className="h-5 w-5 text-white animate-bounce" />
            )}
          </div>
          <div>
            <p className="font-bold text-sm tracking-wide uppercase">{toast.title || (toast.variant === 'info' ? 'Notice' : 'New Order')}</p>
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
    </div>
  );
}
