'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Order, Restaurant } from '@/lib/db';
import { parsePlanSpec, PlanEntitlementSpec } from '@/lib/entitlements';
import { calculateBillingTotals } from '@/lib/billingEngine';
import { formatPrice, formatDate, getFormattedOrderId } from '@/lib/utils';
import { formatExactTimestamp } from '@/lib/timestamp';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { 
  CheckCircle2, AlertTriangle, ArrowLeft, 
  RotateCcw, Printer, ChefHat, Clock, Plus, Bell
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PageProps {
  params: Promise<{
    order_id: string;
  }>;
}

export default function OrderTrackingPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderId = resolvedParams.order_id;

  const [order, setOrder] = useState<Order | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(`smartdine_order_cache_${orderId}`);
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [planSpec, setPlanSpec] = useState<PlanEntitlementSpec | null>(null);
  const [loading, setLoading] = useState(!order);
  const [callLoading, setCallLoading] = useState(false);
  const [callSent, setCallSent] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const handleCallWaiter = async () => {
    if (!order || !restaurant || !order.table_id) return;
    setCallLoading(true);
    try {
      await db.createCustomerRequest(restaurant.id, order.table_id, 'call_waiter');
      setCallSent(true);
      setTimeout(() => setCallSent(false), 4000);
    } catch (err: any) {
      alert('Failed to notify waiter: ' + err.message);
    } finally {
      setCallLoading(false);
    }
  };

  const [mergedGroupDetails, setMergedGroupDetails] = useState<any | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState<boolean>(false);

  const loadOrderData = async () => {
    const o = await db.getOrderById(orderId);
    if (!o) {
      setLoading(false);
      return;
    }
    setOrder(o);
    // Instant paint unblock
    setLoading(false);

    // Parallel background resolution of restaurant and merge details
    Promise.all([
      db.getRestaurantById(o.restaurant_id).then(async (rest) => {
        if (rest) {
          setRestaurant(rest);
          try {
            sessionStorage.setItem('smartdine_active_restaurant_slug', rest.slug);
            if (o.status === 'completed' || o.status === 'cancelled') {
              sessionStorage.removeItem(`smartdine_latest_order_${rest.id}`);
              localStorage.removeItem(`smartdine_latest_order_${rest.id}`);
            }
          } catch (e) {}
          const planId = (rest.subscription_plan || 'starter').toLowerCase();
          const { data: planRow } = await supabase.from('pricing_plans').select('*').eq('id', planId).maybeSingle();
          setPlanSpec(parsePlanSpec(planRow || { id: planId }));
        }
      }),
      (async () => {
        let mGroupId = o.merge_group_id;
        let mSessionId = (o as any).merge_session_id;
        if (!mGroupId && o.table_id && o.restaurant_id) {
          const activeMerge = await db.getActiveMergeGroupForTable(o.restaurant_id, o.table_id);
          if (activeMerge) {
            mGroupId = activeMerge.group.id;
            mSessionId = activeMerge.session?.id;
          }
        }
        if (mGroupId && o.restaurant_id) {
          const details = await db.getMergedGroupDetails(o.restaurant_id, mGroupId, mSessionId || undefined);
          setMergedGroupDetails(details);
        } else {
          setMergedGroupDetails(null);
        }
      })()
    ]).catch(e => console.error('Background order tracking load error:', e));
  };

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  // Realtime Supabase Subscription for Order Status and Batch updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`customer_order_tracking_${orderId}`, {
        config: { broadcast: { self: true } }
      })
      .on(
        'broadcast',
        { event: 'order-status-updated' },
        (payload) => {
          console.log('Realtime broadcast customer status updated:', payload);
          if (payload.payload?.updatedOrder) {
            setOrder(payload.payload.updatedOrder);
          } else if (payload.payload?.newStatus) {
            setOrder(prev => prev ? { ...prev, status: payload.payload.newStatus } : prev);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'status-update' },
        (payload) => {
          console.log('Realtime broadcast customer status update:', payload);
          if (payload.payload?.updatedOrder) {
            setOrder(payload.payload.updatedOrder);
          } else if (payload.payload?.newStatus) {
            setOrder(prev => prev ? { ...prev, status: payload.payload.newStatus } : prev);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          console.log('Realtime Customer Order Update:', payload);
          const updatedOrder = await db.getOrderById(orderId);
          if (updatedOrder) {
            setOrder(updatedOrder);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_batches',
          filter: `order_id=eq.${orderId}`
        },
        async (payload) => {
          console.log('Realtime Customer Batch Update:', payload);
          const updatedOrder = await db.getOrderById(orderId);
          if (updatedOrder) {
            setOrder(updatedOrder);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handleConfirmMergedPayment = async () => {
    if (!mergedGroupDetails || submittingPayment) return;
    if (!confirm('Have you completed the payment for this merged group session?')) return;

    setSubmittingPayment(true);
    try {
      const unpaidOrders = (mergedGroupDetails.orders || []).filter((o: any) => o.status !== 'cancelled' && o.payment_status !== 'paid');
      for (const ord of unpaidOrders) {
        await db.updateOrderPaymentStatus(ord.id, 'customer_marked_paid');
      }
      await loadOrderData();
      alert('Payment confirmation submitted to waiter for the merged session. Please wait for verification.');
    } catch (err: any) {
      alert('Failed to submit merged payment confirmation: ' + err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!order || submittingPayment) return;
    if (!confirm('Have you completed the payment?')) return;

    setSubmittingPayment(true);
    try {
      await db.updateOrderPaymentStatus(order.id, 'customer_marked_paid');
      await loadOrderData();
      alert('Payment confirmation submitted to waiter. Please wait for verification.');
    } catch (err: any) {
      alert('Failed to submit payment confirmation: ' + err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleReorder = async () => {
    if (!order || !restaurant) return;
    
    try {
      const menuItems = await db.getMenuItems(order.restaurant_id);
      const reorderCart = (order.items || [])
        .filter(item => !item.is_cancelled && item.status !== 'cancelled' && !item.notes?.includes('[CANCELLED]'))
        .map(item => {
          const fullItem = menuItems.find(i => i.id === item.menu_item_id);
          const cleanNote = (item.notes || '').includes('[CANCELLED]') ? '' : (item.notes || '').trim();
          return {
            menuItem: fullItem || {
              id: item.menu_item_id,
              restaurant_id: order.restaurant_id,
              category_id: '',
              name: item.menu_item_name,
              description: '',
              price: item.price,
              is_available: true,
              is_veg: true
            },
            quantity: item.quantity,
            notes: cleanNote,
            variantId: item.variant_id,
            variantName: item.variant_name,
            price: item.price
          };
        });

      sessionStorage.setItem(`smartdine_cart_${restaurant.id}`, JSON.stringify(reorderCart));
      router.push(`/menu/${restaurant.slug}/table/${order.table_id}`);
    } catch (err: any) {
      alert(`Failed to reorder: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Retrieving Order Ticket...</p>
        </div>
      </div>
    );
  }

  if (!order || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">We couldn't locate this order ticket. Please ask staff for assistance.</p>
          <div className="pt-4">
            <Button onClick={() => router.push('/')} variant="secondary" className="cursor-pointer">Go to Homepage</Button>
          </div>
        </div>
      </div>
    );
  }

  if (planSpec && planSpec.features.live_order_tracking === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{restaurant.name}</h2>
          <div className="space-y-2 pt-2">
            <span className="inline-block px-3 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-extrabold text-xs rounded-full uppercase tracking-wider">
              Live Order Tracking Disabled
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
              Live Order Tracking is currently disabled for this restaurant's subscription plan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check order.batches status & special_instructions for batch cancellation as well!
  const isItemCancelled = (item: any) => {
    if (item.is_cancelled || item.status === 'cancelled' || item.notes?.includes('[CANCELLED]')) return true;
    if (item.batch_id && order.batches && order.batches.length > 0) {
      const batch = order.batches.find(b => b.id === item.batch_id);
      if (batch && ((batch.status as string) === 'cancelled' || batch.special_instructions?.includes('[CANCELLED]'))) return true;
    }
    return false;
  };

  const validItems = (order.items || []).filter(item => !isItemCancelled(item));
  const cancelledItems = (order.items || []).filter(item => isItemCancelled(item));

  const gstEnabled = restaurant?.settings?.gst_enabled !== false;
  const gstPercentage = restaurant?.settings?.gst_percentage || 0;
  const serviceChargeEnabled = restaurant?.settings?.service_charge_enabled !== false;
  const serviceChargePercentage = restaurant?.settings?.service_charge_percentage || 0;

  const calcResult = calculateBillingTotals({
    items: order.items || [],
    batches: order.batches || [],
    discountAmount: Number(order.discount_amount || 0),
    offerCode: order.offer_code,
    specialInstructions: order.special_instructions,
    offers: restaurant?.settings?.offers || [],
    gstEnabled,
    gstPercentage,
    serviceChargeEnabled,
    serviceChargePercentage,
    customCharges: restaurant?.settings?.custom_charges || []
  });

  const snapSubtotal = Number(order.subtotal || 0);
  const snapDiscount = Number(order.discount_total ?? order.discount_amount ?? 0);
  const snapGrandTotal = Number(order.grand_total ?? order.total ?? 0);

  const hasCancelledItemsOrBatches = (order.items || []).some(i => i.is_cancelled || i.status === 'cancelled' || i.notes?.includes('[CANCELLED]')) ||
    (order.batches || []).some(b => b.status === 'cancelled' || b.special_instructions?.includes('[CANCELLED]'));

  const displaySubtotal = (hasCancelledItemsOrBatches || !snapSubtotal) ? calcResult.validSubtotal : snapSubtotal;
  const discAmt = (hasCancelledItemsOrBatches || !snapDiscount) ? calcResult.discountAmount : snapDiscount;
  const calculatedGst = calcResult.gstAmount;
  const calculatedServiceCharge = calcResult.serviceChargeAmount;
  const displayTotal = (order.status === 'cancelled' && validItems.length === 0)
    ? 0 
    : ((hasCancelledItemsOrBatches || !snapGrandTotal) ? calcResult.grandTotal : snapGrandTotal);

  // Define status steps first so getStepTimestamp can reference steps safely
  const steps = [
    { key: 'new', label: 'Order Sent', desc: 'Sent to kitchen' },
    { key: 'accepted', label: 'Accepted', desc: 'Confirmed by staff' },
    { key: 'preparing', label: 'Preparing', desc: 'Chef is cooking' },
    { key: 'ready', label: 'Ready', desc: order.order_type === 'takeaway' ? 'Ready for Pickup' : 'Food is ready' },
    { key: 'served', label: 'Served', desc: order.order_type === 'takeaway' ? 'Picked Up' : 'Brought to table' }
  ];

  const getStatusIndex = (status: Order['status']) => {
    if (status === 'cancelled') return -1;
    if (status === 'completed') return 4;
    return steps.findIndex(s => s.key === status);
  };

  const currentStepIndex = getStatusIndex(order.status);

  const getStepTimestamp = (stepKey: string): string | null => {
    if (!order.batches || order.batches.length === 0) {
      if (stepKey === 'new') return order.created_at;
      if (stepKey === 'served' && (order.status === 'served' || order.status === 'completed')) return order.updated_at || order.created_at;
      return null;
    }
    const sortedBatches = [...order.batches].sort((a, b) => b.batch_number - a.batch_number);

    // Explicit timestamp only from batches — NO fake fallbacks
    for (const b of sortedBatches) {
      if (stepKey === 'new' && b.created_at) return b.created_at;
      if (stepKey === 'accepted' && b.accepted_at) return b.accepted_at;
      if (stepKey === 'preparing' && b.preparing_at) return b.preparing_at;
      if (stepKey === 'ready' && b.ready_at) return b.ready_at;
      if (stepKey === 'served' && b.served_at) return b.served_at;
    }

    if (stepKey === 'new') return order.created_at;
    return null;
  };

  const formatTimelineTime = (isoString: string | null | undefined, stepKey: string = '', isDoneOrCurrent: boolean = true) => {
    if (isoString) return formatExactTimestamp(isoString);
    if (isDoneOrCurrent && stepKey && stepKey !== 'new') return 'Timestamp unavailable';
    return '';
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/40 pb-12 transition-colors">
      {/* Mini Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm sticky top-0 z-30 shrink-0">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href={order.order_type === 'takeaway' ? `/menu/${restaurant.slug}/takeaway` : `/menu/${restaurant.slug}/table/${order.table_id}`}
              className="text-xs font-extrabold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Menu
            </Link>
            <img src="/logo.png" alt="CleverOps Logo" className="h-6 w-auto object-contain hidden sm:block" />
          </div>

          {/* Call Waiter button on Order Tracking Page */}
          {order.table_id && order.order_type !== 'takeaway' && (
            <button
              onClick={handleCallWaiter}
              disabled={callLoading}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Bell className="h-4 w-4 text-white animate-bounce" />
              <span>Call Waiter</span>
            </button>
          )}
        </div>
      </header>

      {/* Call Waiter Success Confirmation Banner */}
      {callSent && (
        <div className="max-w-xl mx-auto px-4 pt-3">
          <div className="bg-emerald-500 text-white p-3.5 rounded-2xl text-center text-xs font-bold shadow-lg animate-pop flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>Waiter has been notified! A staff member will come to your table shortly.</span>
          </div>
        </div>
      )}

      {/* Main Track container */}
      <main className="max-w-lg w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Restaurant Header Info */}
        <div className="text-center space-y-2">
          <span className="inline-block px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 rounded-full text-xs font-black tracking-wide uppercase">
            Order {getFormattedOrderId(order, restaurant.name)}
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none pt-1">{restaurant.name}</h1>
          <p className="text-xs text-slate-450 dark:text-slate-500 font-semibold uppercase flex items-center justify-center gap-1.5">
            {order.order_type === 'takeaway' ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase">
                Takeaway
              </span>
            ) : (
              <span>{order.table_name || 'Table'}</span>
            )}
            <span>• Receipt #{getFormattedOrderId(order, restaurant.name)}</span>
          </p>
        </div>

        {/* MERGED GROUP SESSION BANNER — Shown when this order belongs to a merged session */}
        {mergedGroupDetails && (
          <Card className="shadow-lg border-t-4 border-t-indigo-500 dark:border-slate-800 overflow-hidden">
            <CardContent className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-950/50 pb-3">
                <div>
                  <h3 className="font-black text-base text-indigo-900 dark:text-indigo-200">
                    {mergedGroupDetails.group.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 mt-0.5">
                    Merged Session · Tables: {(mergedGroupDetails.members || []).map((m: any) => m.table_name).join(' + ')}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  mergedGroupDetails.session?.status === 'completed' || mergedGroupDetails.groupTotals?.isFullyPaid
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                    : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200'
                }`}>
                  {mergedGroupDetails.session?.status === 'completed' || mergedGroupDetails.groupTotals?.isFullyPaid ? 'Completed' : 'Active'}
                </span>
              </div>

              {/* Compact Table Selector Buttons */}
              <div className="space-y-2 border-b border-indigo-100 dark:border-indigo-950/50 pb-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Physical Tables in Merged Session</p>
                <div className="flex flex-wrap gap-2">
                  {(mergedGroupDetails.tableBreakdown || []).map((tbl: any) => {
                    const activeTblId = selectedTableId || order?.table_id || mergedGroupDetails.tableBreakdown[0]?.table_id;
                    const isSelected = activeTblId === tbl.table_id;
                    return (
                      <button
                        key={tbl.table_id}
                        type="button"
                        onClick={() => setSelectedTableId(tbl.table_id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                        <span>{tbl.table_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {tbl.validOrderCount} Order · {tbl.itemCount} Items
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Per-table breakdown (shows selected table) */}
              <div className="space-y-4">
                {(mergedGroupDetails.tableBreakdown || [])
                  .filter((tbl: any) => {
                    const activeTblId = selectedTableId || order?.table_id || mergedGroupDetails.tableBreakdown[0]?.table_id;
                    return tbl.table_id === activeTblId;
                  })
                  .map((tbl: any) => (
                    <div key={tbl.table_id} className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <span className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                          {tbl.table_name} Orders
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">{tbl.validOrderCount} Order · {tbl.itemCount} Items</span>
                      </div>

                      {/* Orders under this table */}
                      {(tbl.orders || []).filter((o: any) => o.status !== 'cancelled').map((ord: any) => (
                        <div key={ord.id} className="space-y-2 pl-4 border-l-2 border-indigo-200 dark:border-indigo-900">
                          <div className="space-y-1">
                            {(ord.items || []).filter((i: any) => i.status !== 'cancelled').map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <span>{item.quantity}x {item.menu_item_name || item.name}</span>
                                <span className="font-mono">{formatPrice(item.price * item.quantity, restaurant?.settings?.currency)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs font-bold">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Subtotal</span>
                              <span>{formatPrice(ord.subtotal, restaurant?.settings?.currency)}</span>
                            </div>
                            {((ord.implied_discount || ord.discount_amount) || 0) > 0 && (
                              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                                <span>Promo {ord.offer_code ? `(${ord.offer_code})` : ''}</span>
                                <span>-{formatPrice((ord.implied_discount || ord.discount_amount) || 0, restaurant?.settings?.currency)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-slate-900 dark:text-white font-extrabold">
                              <span>Net</span>
                              <span>{formatPrice(ord.net ?? Math.max(0, (ord.subtotal || 0) - ((ord.implied_discount || ord.discount_amount) || 0)), restaurant?.settings?.currency)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>

              {/* Consolidated Merged Bill */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 border-b border-indigo-200 dark:border-indigo-800 pb-2">Consolidated Merged Bill</p>
                <div className="space-y-1.5 text-xs font-bold">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Combined Subtotal</span>
                    <span className="font-mono">{formatPrice(mergedGroupDetails.groupTotals?.subtotal || 0, restaurant?.settings?.currency)}</span>
                  </div>
                  {(mergedGroupDetails.groupTotals?.discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Combined Promo Discount</span>
                      <span className="font-mono">-{formatPrice(mergedGroupDetails.groupTotals.discount, restaurant?.settings?.currency)}</span>
                    </div>
                  )}
                  {(mergedGroupDetails.groupTotals?.gst || 0) > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>GST</span>
                      <span className="font-mono">{formatPrice(mergedGroupDetails.groupTotals.gst, restaurant?.settings?.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-indigo-800 dark:text-indigo-200 pt-1.5 border-t border-indigo-200 dark:border-indigo-800">
                    <span>Merged Grand Total</span>
                    <span className="font-mono">{formatPrice(mergedGroupDetails.groupTotals?.total || 0, restaurant?.settings?.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Group-Level Payment Controls */}
              {restaurant.settings?.payment_enabled && (() => {
                const unpaidAmt = mergedGroupDetails.groupTotals?.unpaidTotal ?? mergedGroupDetails.groupTotals?.total ?? 0;
                const isFullyPaid = mergedGroupDetails.groupTotals?.isFullyPaid || unpaidAmt === 0;
                const anyMarkedPaid = (mergedGroupDetails.orders || []).some((o: any) => o.payment_status === 'customer_marked_paid');

                // Check if ALL active orders/batches across ALL tables in the merged group are Served / Terminal
                const allMergedOrders = (mergedGroupDetails.orders || []);
                const hasUnservedMergedOrder = allMergedOrders.some((ord: any) => {
                  if (ord.status === 'cancelled') return false;
                  if (ord.batches && ord.batches.length > 0) {
                    return ord.batches.some((b: any) => {
                      const isCancelled = b.status === 'cancelled' || b.special_instructions?.includes('[CANCELLED]');
                      if (isCancelled) return false;
                      return b.status !== 'served' && (b.status as string) !== 'completed';
                    });
                  }
                  return ord.status !== 'served' && ord.status !== 'completed';
                });
                const canActivateMergedPayment = !hasUnservedMergedOrder;

                return (
                  <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span className="font-extrabold text-xs text-slate-700 dark:text-slate-200">Merged Session Payment</span>
                      {isFullyPaid ? (
                        <Badge variant="success">Payment Received</Badge>
                      ) : anyMarkedPaid ? (
                        <Badge variant="warning">Verification Pending</Badge>
                      ) : (
                        <Badge variant="error">Payment Pending</Badge>
                      )}
                    </div>

                    {isFullyPaid ? (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold text-center">
                        All orders in this merged session have been paid. Thank you!
                      </p>
                    ) : canActivateMergedPayment ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-extrabold text-slate-800 dark:text-white">
                          <span>Outstanding Merged Total</span>
                          <span className="text-sm font-mono text-emerald-700 dark:text-emerald-400">
                            {formatPrice(unpaidAmt, restaurant.settings.currency)}
                          </span>
                        </div>

                        {restaurant.settings?.upi_id && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg text-[11px] font-semibold space-y-1">
                            <div className="flex justify-between text-slate-500">
                              <span>Payee Name</span>
                              <span className="text-slate-800 dark:text-slate-200">{restaurant.settings.upi_name}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>UPI ID</span>
                              <span className="text-slate-800 dark:text-slate-200 font-mono">{restaurant.settings.upi_id}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2">
                          <a
                            href={`upi://pay?pa=${encodeURIComponent(restaurant.settings?.upi_id || '')}&pn=${encodeURIComponent(restaurant.settings?.upi_name || restaurant.name)}&am=${unpaidAmt}&cu=INR`}
                            className="w-full"
                          >
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs">
                              Pay {formatPrice(unpaidAmt, restaurant.settings.currency)} Now
                            </Button>
                          </a>
                          <Button
                            variant="outline"
                            onClick={handleConfirmMergedPayment}
                            disabled={submittingPayment}
                            className="w-full font-bold py-2.5 rounded-xl text-xs disabled:opacity-50"
                          >
                            {submittingPayment ? 'Submitting...' : 'I Have Completed Payment'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 animate-pulse" />
                        <span>Payment link will activate once all orders in your merged group are served.</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              <p className="text-[10px] text-slate-400 font-semibold text-center leading-relaxed">
                This is a shared dining session. Your bill is consolidated with all tables in this group.
              </p>
            </CardContent>
          </Card>
        )}

        {/* PAYMENT CARD (Dine-in & Takeaway only, for non-merged single orders) */}
        {restaurant.settings?.payment_enabled && (!mergedGroupDetails || mergedGroupDetails.group?.status !== 'active') && order.order_type !== 'reservation' && order.status !== 'cancelled' && (
          <Card className="shadow-md border-t-4 border-t-emerald-600 dark:border-slate-800 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Payment Status</h3>
                <div>
                  {order.payment_status === 'paid' ? (
                    <Badge variant="success">Payment Received</Badge>
                  ) : order.payment_status === 'customer_marked_paid' ? (
                    <Badge variant="warning">Verification Pending</Badge>
                  ) : (
                    <Badge variant="error">Payment Pending</Badge>
                  )}
                </div>
              </div>

              {order.payment_status === 'paid' ? (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  Thank you! Your payment of <strong>{formatPrice(displayTotal, restaurant.settings.currency)}</strong> was received and verified by {order.marked_paid_by || 'staff'}.
                </p>
              ) : order.payment_status === 'customer_marked_paid' ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                    You have marked this order as paid. Waiter is currently verifying the transaction.
                  </p>
                  <p className="text-[10px] text-slate-450 italic">
                    Submitted: {order.paid_at ? new Date(order.paid_at).toLocaleTimeString() : 'Just now'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold leading-relaxed">
                    Pay <strong>{formatPrice(displayTotal, restaurant.settings.currency)}</strong> online using any UPI application.
                  </p>
                  
                  <div className="bg-slate-50/65 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 font-semibold">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payee Name</span>
                      <span className="text-slate-700 dark:text-slate-300">{restaurant.settings.upi_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">UPI ID</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono">{restaurant.settings.upi_id}</span>
                    </div>
                  </div>

                  {(() => {
                    let canActivatePayment = false;
                    if ((order.status as string) === 'cancelled') {
                      canActivatePayment = false;
                    } else if (order.batches && order.batches.length > 0) {
                      const hasUnservedActiveBatch = order.batches.some((b: any) => {
                        const isCancelled = (b.status as string) === 'cancelled' || b.special_instructions?.includes('[CANCELLED]');
                        if (isCancelled) return false;
                        return (b.status as string) !== 'served' && (b.status as string) !== 'completed';
                      });
                      canActivatePayment = !hasUnservedActiveBatch;
                    } else {
                      canActivatePayment = ['served', 'completed'].includes(order.status);
                    }

                    return canActivatePayment ? (
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <a 
                          href={`upi://pay?pa=${encodeURIComponent(restaurant.settings.upi_id || '')}&pn=${encodeURIComponent(restaurant.settings.upi_name || '')}&am=${displayTotal}&cu=INR`}
                          className="w-full"
                        >
                          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer py-3 rounded-xl text-xs sm:text-sm">
                            Pay {formatPrice(displayTotal, restaurant.settings.currency)} Now
                          </Button>
                        </a>
                        <Button 
                          variant="outline" 
                          onClick={handleConfirmPayment}
                          disabled={submittingPayment}
                          className="w-full font-bold cursor-pointer py-3 rounded-xl text-xs sm:text-sm disabled:opacity-50"
                        >
                          {submittingPayment ? 'Submitting...' : 'I have completed payment'}
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs rounded-xl font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 animate-pulse" />
                        <span>Payment link will activate once your order is served.</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* RESERVATION CONFIRMATION CARD */}
        {order.order_type === 'reservation' ? (
          <Card className="shadow-lg border-2 border-emerald-500/30 bg-white dark:bg-slate-900 overflow-hidden animate-pop">
            <CardContent className="p-6 md:p-8 text-center space-y-6">
              <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 rounded-full flex items-center justify-center mx-auto border-4 border-emerald-500/20 shadow-lg">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40 uppercase tracking-wider">
                  Table Reservation Confirmed
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white pt-1">
                  Reservation Ticket #{order.id.slice(-6).toUpperCase()}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                  Your table reservation has been sent to the owner and kitchen. We look forward to serving you!
                </p>
              </div>

              {/* Reservation Details Box */}
              <div className="bg-slate-50 dark:bg-slate-950/50 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-left space-y-2.5 font-semibold text-xs md:text-sm">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
                  Booking Details
                </h4>
                {order.special_instructions && (
                  <div className="text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed font-bold">
                    {order.special_instructions.split('|').map((part, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-emerald-600">•</span>
                        <span>{part.trim()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-2">
                <Button 
                  onClick={() => router.push(`/menu/${restaurant.slug}/reservation`)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Reservation Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Live Batch-wise Timeline State Cards for Dine-in & Takeaway */
          order.status === 'cancelled' && (!order.batches || order.batches.length === 0) ? (
            <Card className="shadow-md dark:border-slate-800 animate-pop">
              <CardContent className="p-6 space-y-4">
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl p-4 space-y-3 text-sm">
                  <div className="flex items-center gap-3 font-bold">
                    <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                    <span>Order Cancelled: This order was declined by kitchen staff.</span>
                  </div>
                  {order.cancellation_reason && (
                    <div className="text-xs border-t border-rose-100 dark:border-rose-900/20 pt-2 font-semibold">
                      <span className="text-rose-900 dark:text-rose-300 uppercase tracking-wider text-[10px] font-bold block mb-1">Reason:</span>
                      <p className="bg-white dark:bg-slate-900/50 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/20 italic">
                        "{order.cancellation_reason}"
                      </p>
                      {order.cancelled_by && (
                        <span className="text-[10px] text-slate-400 block mt-1">Declined by: {order.cancelled_by}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : order.batches && order.batches.length > 0 ? (
            /* Collapsible Order & Batch Lifecycle Timeline */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowTimeline(!showTimeline)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all text-left cursor-pointer shadow-xs"
              >
                <span className="flex items-center gap-2 font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{showTimeline ? '▼' : '▶'}</span>
                  <span>{showTimeline ? 'Hide Order & Batch Lifecycle Timeline' : 'View Order & Batch Lifecycle Timeline'}</span>
                </span>
                <Badge variant="neutral" className="text-[10px] font-mono border-indigo-200 text-indigo-700 dark:text-indigo-300">
                  {order.batches.length} Batch{order.batches.length > 1 ? 'es' : ''}
                </Badge>
              </button>

              {showTimeline && (
                <div className="space-y-4 animate-fade-in">
                  {[...order.batches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((batch, bIdx) => {
                const isCancelled = batch.status === 'cancelled' || batch.special_instructions?.includes('[CANCELLED]');
                const bItems = (validItems || []).filter(i => i.batch_id === batch.id || (bIdx === 0 && !i.batch_id));
                const statusOrder = ['new', 'accepted', 'preparing', 'ready', 'served', 'completed'];
                const bStatusIdx = statusOrder.indexOf(batch.status);

                const isAccepted = !isCancelled && (!!batch.accepted_at || !!batch.accepted_by);
                const isPreparing = !isCancelled && (!!batch.preparing_at || !!batch.preparing_by);
                const isReady = !isCancelled && (!!batch.ready_at || !!batch.ready_by);
                const isServed = !isCancelled && (!!batch.served_at || !!batch.served_by || bStatusIdx >= 4);

                return (
                  <Card key={batch.id || bIdx} className="shadow-md dark:border-slate-800 animate-pop overflow-hidden">
                    <CardContent className="p-5 space-y-4">
                      {/* Batch Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-slate-900 dark:text-white text-sm">Batch #{bIdx + 1}</h3>
                            {isCancelled ? (
                              <Badge variant="error">Cancelled</Badge>
                            ) : batch.status === 'served' || (batch.status as string) === 'completed' ? (
                              <Badge variant="success">Served</Badge>
                            ) : batch.status === 'ready' ? (
                              <Badge variant="info">Ready to Serve</Badge>
                            ) : batch.status === 'preparing' ? (
                              <Badge variant="warning">Cooking</Badge>
                            ) : (
                              <Badge variant="info">Order Sent</Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                            Placed: {formatExactTimestamp(batch.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Items in this Batch */}
                      {bItems.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {bItems.map(i => `${i.quantity}x ${i.menu_item_name}`).join(', ')}
                        </div>
                      )}

                      {/* Batch Timeline */}
                      {isCancelled ? (
                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-400 rounded-xl p-3.5 space-y-2 text-xs">
                          <div className="flex justify-between items-center font-extrabold">
                            <span className="flex items-center gap-1.5">
                              <AlertTriangle className="h-4 w-4 text-rose-500" />
                              Batch Cancelled
                            </span>
                            <span className="font-mono text-[10px]">{formatExactTimestamp(batch.cancelled_at || batch.updated_at)}</span>
                          </div>
                          {(batch.special_instructions?.includes('[CANCELLED]') || order.cancellation_reason) && (
                            <p className="italic text-[11px] bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-rose-100 dark:border-rose-900/20">
                              "{batch.special_instructions?.replace('[CANCELLED]', '').trim() || order.cancellation_reason}"
                            </p>
                          )}
                          {batch.cancelled_by && (
                            <span className="text-[10px] text-slate-400 block font-semibold">Declined by: {batch.cancelled_by}</span>
                          )}
                        </div>
                      ) : (
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-5 py-1 text-xs">
                          {/* Order Sent */}
                          <div className="relative pl-6">
                            <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                              <CheckCircle2 className="h-2.5 w-2.5 text-white fill-current" />
                            </span>
                            <div className="flex justify-between items-baseline">
                              <span className="font-bold text-slate-900 dark:text-white">Order Sent</span>
                              <span className="font-mono font-bold text-slate-500 text-[11px]">{formatExactTimestamp(batch.created_at)}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-semibold">Sent to kitchen</span>
                          </div>

                          {/* Accepted */}
                          {isAccepted && (
                            <div className="relative pl-6">
                              <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <CheckCircle2 className="h-2.5 w-2.5 text-white fill-current" />
                              </span>
                              <div className="flex justify-between items-baseline">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">Accepted</span>
                                <span className="font-mono font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                                  {batch.accepted_at ? formatExactTimestamp(batch.accepted_at) : 'Timestamp unavailable'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Confirmed{batch.accepted_by ? ` by ${batch.accepted_by}` : ''}</span>
                            </div>
                          )}

                          {/* Preparing */}
                          {isPreparing && (
                            <div className="relative pl-6">
                              <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <CheckCircle2 className="h-2.5 w-2.5 text-white fill-current" />
                              </span>
                              <div className="flex justify-between items-baseline">
                                <span className="font-bold text-amber-700 dark:text-amber-400">Preparing</span>
                                <span className="font-mono font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                                  {batch.preparing_at ? formatExactTimestamp(batch.preparing_at) : 'Timestamp unavailable'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Cooking{batch.preparing_by ? ` by ${batch.preparing_by}` : ''}</span>
                            </div>
                          )}

                          {/* Ready */}
                          {isReady && (
                            <div className="relative pl-6">
                              <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-purple-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <CheckCircle2 className="h-2.5 w-2.5 text-white fill-current" />
                              </span>
                              <div className="flex justify-between items-baseline">
                                <span className="font-bold text-purple-700 dark:text-purple-400">Ready</span>
                                <span className="font-mono font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                                  {batch.ready_at ? formatExactTimestamp(batch.ready_at) : 'Timestamp unavailable'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Food ready{batch.ready_by ? ` by ${batch.ready_by}` : ''}</span>
                            </div>
                          )}

                          {/* Served */}
                          {isServed && (
                            <div className="relative pl-6">
                              <span className="absolute -left-[9px] top-0.5 h-4 w-4 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                <CheckCircle2 className="h-2.5 w-2.5 text-white fill-current" />
                              </span>
                              <div className="flex justify-between items-baseline">
                                <span className="font-bold text-blue-700 dark:text-blue-400">Served</span>
                                <span className="font-mono font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                                  {batch.served_at ? formatExactTimestamp(batch.served_at) : 'Timestamp unavailable'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-semibold">Brought to table{batch.served_by ? ` by ${batch.served_by}` : ''}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
                </div>
              )}
            </div>
          ) : (
            /* Single Order fallback (when no batches exist) */
            <Card className="shadow-md dark:border-slate-800 animate-pop">
              <CardContent className="p-6 space-y-6">
                <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8 py-2">
                  {steps.map((step, idx) => {
                    const isDone = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div key={step.key} className="relative pl-8">
                        <span className={`
                          absolute -left-[11px] top-1 h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all duration-300
                          ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                          ${isCurrent ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/50' : ''}
                          ${!isDone && !isCurrent ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300' : ''}
                        `}>
                          {isDone && <CheckCircle2 className="h-3 w-3 text-white fill-current" />}
                          {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />}
                        </span>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className={`text-sm font-extrabold transition-colors duration-300 ${
                              isCurrent ? 'text-emerald-600 dark:text-emerald-400' : isDone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                              {step.label}
                            </h4>
                            {(isDone || isCurrent) && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-bold shrink-0">
                                {formatTimelineTime(getStepTimestamp(step.key), step.key, isDone || isCurrent)}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )
        )}

        {/* Takeaway Info Details */}
        {order.order_type === 'takeaway' && (
          <Card className="shadow-md dark:border-slate-800 animate-pop">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">Takeaway Info</h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block">Order Type</span>
                  <span className="text-purple-600 dark:text-purple-400 mt-1 block uppercase font-black">
                    Takeaway Order Ticket
                  </span>
                </div>
                
                <div>
                  <span className="text-slate-400 block">Estimated Arrival</span>
                  <span className="text-slate-800 dark:text-slate-200 mt-1 block font-black">
                    {order.customer_arrival_minutes} minutes
                  </span>
                </div>
              </div>
              
              {order.takeaway_notes && (
                <div className="bg-slate-50 dark:bg-slate-950/20 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 font-bold block">Arrival Notes</span>
                  <span className="text-slate-700 dark:text-slate-300 block mt-1 font-medium">{order.takeaway_notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Order Details & Summary */}
        <Card className="dark:border-slate-800">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Order Summary</h3>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* 1. SERVED & ACTIVE ITEMS */}
              {validItems.map((item, idx) => (
                <div key={item.id || idx} className="py-3 flex justify-between gap-4 text-xs md:text-sm font-semibold">
                  <div className="flex flex-col">
                    <span className="text-slate-700 dark:text-slate-300">{item.quantity}x {item.menu_item_name}</span>
                    {item.notes && <span className="text-[10px] text-rose-500 font-medium">({item.notes})</span>}
                  </div>
                  <span className="text-slate-950 dark:text-white">{formatPrice(item.price * item.quantity, restaurant.settings.currency)}</span>
                </div>
              ))}

              {/* 2. CANCELLED ITEMS BY KITCHEN */}
              {cancelledItems.map((item, idx) => (
                <div key={`can_${item.id || idx}`} className="py-3 flex justify-between gap-4 text-xs md:text-sm font-semibold bg-rose-50/50 dark:bg-rose-950/10 px-2 rounded-lg my-1">
                  <div className="flex flex-col">
                    <span className="text-rose-600 dark:text-rose-400 line-through">{item.quantity}x {item.menu_item_name}</span>
                    <span className="text-[10px] text-rose-500 font-bold">[Cancelled by Kitchen]</span>
                  </div>
                  <span className="text-rose-500 font-bold line-through">{formatPrice(0, restaurant.settings.currency)}</span>
                </div>
              ))}
            </div>

            {/* Billing breakdown */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 pt-4">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(displaySubtotal, restaurant.settings.currency)}</span>
              </div>

              {/* Promo Discount Row */}
              {discAmt > 0 && (() => {
                const code = order.offer_code || (order.special_instructions?.match(/PROMO OFFER (?:APPLIED: )?([A-Z0-9]+)/)?.[1]);
                return (
                  <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>Promo Discount {code ? `(${code})` : ''}</span>
                    <span>-{formatPrice(discAmt, restaurant.settings.currency)}</span>
                  </div>
                );
              })()}

              {/* Tax Breakdown */}
              {order.tax_type_snapshot === 'cgst_sgst' && (order.tax_total || 0) > 0 ? (
                <>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <span>CGST ({(order.tax_rate_snapshot || 0) / 2}%)</span>
                    <span>{formatPrice(order.cgst_amount || 0, restaurant.settings.currency)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <span>SGST ({(order.tax_rate_snapshot || 0) / 2}%)</span>
                    <span>{formatPrice(order.sgst_amount || 0, restaurant.settings.currency)}</span>
                  </div>
                </>
              ) : order.tax_type_snapshot === 'igst' && (order.tax_total || 0) > 0 ? (
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>IGST ({order.tax_rate_snapshot || 0}%)</span>
                  <span>{formatPrice(order.igst_amount || 0, restaurant.settings.currency)}</span>
                </div>
              ) : order.tax_type_snapshot === 'none' || order.tax_rate_snapshot === 0 ? (
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>GST (0%)</span>
                  <span>{formatPrice(0, restaurant.settings.currency)}</span>
                </div>
              ) : gstEnabled && calculatedGst > 0 ? (
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>GST ({gstPercentage}%)</span>
                  <span>{formatPrice(calculatedGst, restaurant.settings.currency)}</span>
                </div>
              ) : null}

              {serviceChargeEnabled && calculatedServiceCharge > 0 && (
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Service Charge ({serviceChargePercentage}%)</span>
                  <span>{formatPrice(calculatedServiceCharge, restaurant.settings.currency)}</span>
                </div>
              )}
              {order.custom_charges && order.custom_charges.map((charge: any) => {
                const disc = order.discount_amount || 0;
                const base = Math.max(0, displaySubtotal - disc);
                const val = charge.type === 'percentage' 
                  ? base * (charge.value / 100) 
                  : charge.value;
                return (
                  <div key={charge.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <span>{charge.name}</span>
                    <span>{formatPrice(val, restaurant.settings.currency)}</span>
                  </div>
                );
              })}
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
              <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm md:text-base">
                <span>Grand Total</span>
                <span>{formatPrice(displayTotal, restaurant.settings.currency)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col gap-2">
              {order.status !== 'completed' && order.status !== 'cancelled' && (
                <Button 
                  className={`w-full gap-1.5 cursor-pointer flex items-center justify-center ${
                    order.status === 'served' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  onClick={() => {
                    if (restaurant) {
                      sessionStorage.removeItem(`smartdine_cart_${restaurant.id}`);
                    }
                    router.push(order.order_type === 'takeaway' ? `/menu/${restaurant.slug}/takeaway` : `/menu/${restaurant.slug}/table/${order.table_id}`);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add More Items
                </Button>
              )}
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="w-full gap-1.5 cursor-pointer flex items-center justify-center"
                  onClick={handleReorder}
                >
                  <RotateCcw className="h-4 w-4 text-slate-500" /> Reorder Items
                </Button>
                <Button 
                  variant="outline"
                  className="w-full gap-1.5 cursor-pointer flex items-center justify-center"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 text-slate-500" /> Print Receipt
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>

      </main>
    </div>
  );
}
