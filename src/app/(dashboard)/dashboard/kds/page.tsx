'use client';

import { useState, useEffect, useRef } from 'react';
import { db, Order, OrderBatch } from '@/lib/db';
import { formatExactTimestamp } from '@/lib/timestamp';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '../../layout';
import { formatPrice, getFormattedOrderId, getCleanSpecialInstructions } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { 
  ChefHat, Clock, Check, ArrowRight, Play, CheckCircle2, 
  X, AlertCircle, Volume2, Sparkles, Bell
} from 'lucide-react';


export default function KitchenDisplayPage() {
  const { restaurant, profile, alarmMuted, setAlarmMuted } = useRestaurant();
  const [restaurantId, setRestaurantId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatchIds, setProcessingBatchIds] = useState<string[]>([]);

  // sound toggle mapped to global layout alarm state
  const soundEnabled = !alarmMuted;
  const setSoundEnabled = (enabled: boolean) => {
    setAlarmMuted(!enabled);
  };

  // Real-time new order alert popup state
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  
  // Real-time toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  // Time state for relative elapsed calculations
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Cancellation reason modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [kdsDispositionType, setKdsDispositionType] = useState<'reallocated' | 'staff_meal' | 'complimentary' | 'owner_internal' | 'waste' | 'other'>('waste');
  const [kdsRestoreInventory, setKdsRestoreInventory] = useState(false);
  const [recipesMap, setRecipesMap] = useState<Record<string, any>>({});
  const [inventoryItemsMap, setInventoryItemsMap] = useState<Record<string, any>>({});
  const [transactionsMap, setTransactionsMap] = useState<Record<string, any>>({});
  const [errorMessage, setErrorMessage] = useState('');




  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 15000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const isReloadingRef = useRef(false);
  const pendingReloadRef = useRef(false);

  // Request browser notifications permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const showDesktopNotification = (order: Order) => {
    // Desktop notifications disabled per product specification
  };

  // Prevent duplicate chimes/alerts for the same order
  const alertedOrderIds = useRef<Set<string>>(new Set());
  const alertedBatchIds = useRef<Set<string>>(new Set());

  const loadKdsData = async (restId: string) => {
    const allOrders = await db.getOrders(restId);
    const activeOrders = allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
    setOrders(activeOrders);
    
    // Add existing order and batch IDs to the alerted sets so they don't trigger the bell on load
    allOrders.forEach(o => {
      alertedOrderIds.current.add(o.id);
      o.batches?.forEach(b => alertedBatchIds.current.add(b.id));
    });
    
    try {
      const [recipesRes, itemsRes, txsRes] = await Promise.all([
        supabase.from('inventory_recipes').select('*, inventory_recipe_ingredients(*)').eq('restaurant_id', restId),
        supabase.from('inventory_items').select('*').eq('restaurant_id', restId),
        supabase.from('inventory_transactions').select('*').eq('restaurant_id', restId).eq('transaction_type', 'ORDER_CONSUMPTION')
      ]);

      if (recipesRes.data) {
        const rMap: Record<string, any> = {};
        recipesRes.data.forEach((r: any) => { rMap[r.menu_item_id] = r; });
        setRecipesMap(rMap);
      }
      if (itemsRes.data) {
        const iMap: Record<string, any> = {};
        itemsRes.data.forEach((i: any) => { iMap[i.id] = i; });
        setInventoryItemsMap(iMap);
      }
      if (txsRes.data) {
        const tMap: Record<string, any> = {};
        txsRes.data.forEach((t: any) => {
          if (t.batch_id && t.inventory_item_id) {
            tMap[`${t.batch_id}:${t.inventory_item_id}`] = t;
          }
          if (t.order_id && t.inventory_item_id) {
            tMap[`${t.order_id}:${t.inventory_item_id}`] = t;
          }
        });
        setTransactionsMap(tMap);
      }
    } catch (e) {}

    setLoading(false);
  };

  const safeReloadKdsData = async (restId: string) => {
    if (isReloadingRef.current) {
      pendingReloadRef.current = true;
      return;
    }
    isReloadingRef.current = true;
    try {
      const allOrders = await db.getOrders(restId);
      const activeOrders = allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
      setOrders(activeOrders);

      const [recipesRes, itemsRes, txsRes] = await Promise.all([
        supabase.from('inventory_recipes').select('*, inventory_recipe_ingredients(*)').eq('restaurant_id', restId),
        supabase.from('inventory_items').select('*').eq('restaurant_id', restId),
        supabase.from('inventory_transactions').select('*').eq('restaurant_id', restId).eq('transaction_type', 'ORDER_CONSUMPTION')
      ]);

      if (recipesRes.data) {
        const rMap: Record<string, any> = {};
        recipesRes.data.forEach((r: any) => { rMap[r.menu_item_id] = r; });
        setRecipesMap(rMap);
      }
      if (itemsRes.data) {
        const iMap: Record<string, any> = {};
        itemsRes.data.forEach((i: any) => { iMap[i.id] = i; });
        setInventoryItemsMap(iMap);
      }
      if (txsRes.data) {
        const tMap: Record<string, any> = {};
        txsRes.data.forEach((t: any) => {
          if (t.batch_id && t.inventory_item_id) {
            tMap[`${t.batch_id}:${t.inventory_item_id}`] = t;
          }
          if (t.order_id && t.inventory_item_id) {
            tMap[`${t.order_id}:${t.inventory_item_id}`] = t;
          }
        });
        setTransactionsMap(tMap);
      }
    } catch (e) {
      console.error('Failed to reload KDS data:', e);
    } finally {
      isReloadingRef.current = false;
      if (pendingReloadRef.current) {
        pendingReloadRef.current = false;
        await safeReloadKdsData(restId);
      }
    }
  };

  const reloadFnRef = useRef(safeReloadKdsData);
  useEffect(() => {
    reloadFnRef.current = safeReloadKdsData;
  });

  useEffect(() => {
    if (restaurant?.id) {
      setRestaurantId(restaurant.id);
      loadKdsData(restaurant.id);
    }
  }, [restaurant]);

  // Setup Supabase Realtime for Incoming Orders & Batches
  useEffect(() => {
    if (!restaurantId) return;

    const handleResync = () => {
      console.log('Force resync event received. Reloading KDS data...');
      reloadFnRef.current(restaurantId);
    };
    window.addEventListener('force-resync', handleResync);

    console.log(`Subscribing to realtime updates (orders & batches) for restaurant: ${restaurantId}`);
    const channel = supabase
      .channel(`kds_${restaurantId}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'broadcast',
        { event: 'new-order' },
        async (payload) => {
          console.log('Realtime broadcast KDS order event received:', payload);
          await reloadFnRef.current(restaurantId);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload) => {
          console.log('Realtime KDS order change payload received:', payload);
          await reloadFnRef.current(restaurantId);

          if (payload.eventType === 'INSERT') {
            const newOrderPayload = payload.new as Order;
            if (!alertedOrderIds.current.has(newOrderPayload.id)) {
              alertedOrderIds.current.add(newOrderPayload.id);
              console.log(`New order detected! Playing alarm for order ID: ${newOrderPayload.id}`);

              const fullOrder = await db.getOrderById(newOrderPayload.id);
              if (fullOrder) {
                setNewOrderAlert(fullOrder);
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
          event: 'INSERT',
          schema: 'public',
          table: 'order_batches'
        },
        async (payload) => {
          console.log('Realtime KDS batch insert payload received:', payload);
          const newBatch = payload.new as OrderBatch;

          const isLocalOrder = orders.some(o => o.id === newBatch.order_id);
          if (!isLocalOrder) {
            const { data: pOrder } = await supabase
              .from('orders')
              .select('restaurant_id')
              .eq('id', newBatch.order_id)
              .eq('restaurant_id', restaurantId)
              .maybeSingle();

            if (!pOrder) return;
          }

          const fullOrder = await db.getOrderById(newBatch.order_id);
          if (fullOrder && fullOrder.restaurant_id === restaurantId) {
            await reloadFnRef.current(restaurantId);

            if (!alertedBatchIds.current.has(newBatch.id)) {
              alertedBatchIds.current.add(newBatch.id);
              console.log(`New batch detected! Playing alarm for batch ID: ${newBatch.id}`);

              setNewOrderAlert(fullOrder);
              showDesktopNotification(fullOrder);
              setToast({ message: `New Items Added - ${fullOrder.table_name || 'Table X'}`, visible: true });
              
              setTimeout(() => {
                setToast(prev => prev && prev.message.includes(fullOrder.table_name || 'Table X') ? { ...prev, visible: false } : prev);
              }, 5000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_batches'
        },
        async (payload) => {
          console.log('Realtime KDS batch update payload received:', payload);
          const updatedBatch = payload.new as OrderBatch;
          
          const isLocalOrder = orders.some(o => o.id === updatedBatch.order_id);
          if (isLocalOrder) {
            await reloadFnRef.current(restaurantId);
          } else {
            const { data: parentOrder } = await supabase
              .from('orders')
              .select('restaurant_id')
              .eq('id', updatedBatch.order_id)
              .eq('restaurant_id', restaurantId)
              .maybeSingle();

            if (parentOrder) {
              await reloadFnRef.current(restaurantId);
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`Supabase Realtime KDS subscription status: ${status}`);
        if (err) {
          console.error(`Supabase Realtime KDS subscription error:`, err);
        }
      });

    return () => {
      console.log('Cleaning up KDS realtime channel subscription...');
      supabase.removeChannel(channel);
      window.removeEventListener('force-resync', handleResync);
    };
  }, [restaurantId]);

  const updateBatchStatus = async (batchId: string, nextStatus: OrderBatch['status']) => {
    if (processingBatchIds.includes(batchId)) return;
    setProcessingBatchIds(prev => [...prev, batchId]);

    // Find original status for ID-based patch rollback
    const origStatus = orders
      .flatMap(o => o.batches || [])
      .find((b: any) => b.id === batchId)?.status || 'new';

    // Optimistic UI state update
    setOrders(prev => prev.map(order => {
      if (!order.batches || !order.batches.some((b: any) => b.id === batchId)) return order;
      return {
        ...order,
        batches: order.batches.map((b: any) => 
          b.id === batchId ? { ...b, status: nextStatus } : b
        )
      };
    }));

    try {
      if (nextStatus === 'accepted') {
        window.dispatchEvent(new Event('stop-kitchen-sound'));
      }
      await db.updateBatchStatus(batchId, nextStatus, profile?.full_name || 'Kitchen Staff');
      if (restaurantId) {
        await loadKdsData(restaurantId);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err: any) {
      // Functional ID-based patch rollback (preserves concurrent realtime updates on other orders)
      setOrders(prev => prev.map(order => {
        if (!order.batches || !order.batches.some((b: any) => b.id === batchId)) return order;
        return {
          ...order,
          batches: order.batches.map((b: any) => 
            b.id === batchId ? { ...b, status: origStatus } : b
          )
        };
      }));
      setErrorMessage(`Failed to update status: ${err.message || 'Network error'}`);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setProcessingBatchIds(prev => prev.filter(id => id !== batchId));
    }
  };



  const cancelBatch = (batchId: string) => {
    setOrderToCancel(batchId);
    setCancellationReason('');
    setCancelModalOpen(true);
  };

  const getTimeElapsed = (dateString: string, currentNow: number) => {
    return formatExactTimestamp(dateString);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-3 gap-6 h-[80vh]">
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  // Extract active batches from active orders
  const activeBatches = orders.reduce((acc: any[], order) => {
    if (order.batches) {
      order.batches.forEach(batch => {
        const isCancelled = batch.status === 'cancelled' || batch.special_instructions?.includes('[CANCELLED]');
        if (batch.status !== 'served' && !isCancelled) {
          acc.push({
            ...batch,
            table_name: order.table_name,
            restaurant_id: order.restaurant_id,
            order_id: order.id,
            payment_status: order.payment_status || 'pending',
            order_type: order.order_type || 'dine_in',
            customer_arrival_minutes: order.customer_arrival_minutes,
            takeaway_notes: order.takeaway_notes
          });
        }
      });
    }
    return acc;
  }, []);

  const newOrders = activeBatches.filter(b => b.status === 'new' && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'));
  const preparingOrders = activeBatches.filter(b => (b.status === 'accepted' || b.status === 'preparing') && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'));
  const readyOrders = activeBatches.filter(b => b.status === 'ready' && b.status !== 'cancelled' && !b.special_instructions?.includes('[CANCELLED]'));

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Title Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <img src="/logo.png" alt="CleverOps Logo" className="h-7 w-7 object-contain rounded-md" />
            Kitchen Display System (KDS)
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Live cooking tickets and real-time customer status tracking.</p>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            soundEnabled 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Volume2 className="h-4 w-4" />
          {soundEnabled ? 'Kitchen Bell On' : 'Kitchen Bell Off'}
        </button>
      </div>



      {/* Grid Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[70vh]">
        
        {/* COLUMN 1: NEW INCOMING ORDERS */}
        <div className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
              New Orders
            </h3>
            <Badge variant="info">{newOrders.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {newOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs py-12">
                No new orders.
              </div>
            ) : (
              newOrders.map(order => (
                <Card key={order.id} className="border-l-4 border-l-indigo-600 shadow-md animate-pop">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {order.order_type === 'takeaway' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase">
                              Takeaway
                            </span>
                          ) : (
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                          )}
                          {order.payment_status === 'paid' ? (
                            <Badge variant="success">Paid</Badge>
                          ) : order.payment_status === 'customer_marked_paid' ? (
                            <Badge variant="warning">Marked Paid</Badge>
                          ) : null}
                        </div>
                        {order.order_type === 'takeaway' && (
                          <div className="text-xs font-black text-purple-600 dark:text-purple-400 mt-1">
                            Arrives in {order.customer_arrival_minutes} mins
                            {order.takeaway_notes && <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Note: {order.takeaway_notes}</span>}
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">ORDER #{getFormattedOrderId({ id: order.order_id, created_at: order.created_at }, restaurant?.name || '', orders)} • BATCH #{order.batch_number}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at, nowTime)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold py-1">
                      {order.items.map((item: any) => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && <span className="text-[10px] text-rose-500 font-medium">({item.notes})</span>}
                        </li>
                      ))}
                    </ul>

                    {(() => {
                      const notesText = getCleanSpecialInstructions(order, order);
                      if (!notesText) return null;
                      return (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-3 my-2 text-amber-900 dark:text-amber-200">
                          <div className="flex items-center gap-1.5 font-extrabold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                            <span>📝</span>
                            <span>Special Instructions</span>
                          </div>
                          <p className="text-xs md:text-sm font-black text-amber-950 dark:text-amber-100 mt-1 whitespace-pre-wrap">
                            {notesText}
                          </p>
                        </div>
                      );
                    })()}

                    <details className="text-[11px] font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <summary className="cursor-pointer font-extrabold text-slate-700 dark:text-slate-300 hover:text-slate-900 flex items-center justify-between select-none">
                        <span>🔍 Recipe Ingredients & Stock Impact</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Auto Stock Deducted</span>
                      </summary>

                      <div className="mt-2 space-y-2 text-[10px] text-slate-600 dark:text-slate-400">
                        {order.items.map((it: any) => {
                          const recipe = recipesMap[it.menu_item_id];
                          const ings = recipe?.inventory_recipe_ingredients || [];

                          return (
                            <div key={it.id} className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1">
                              <div className="font-extrabold text-slate-800 dark:text-slate-200">
                                {it.quantity}x {it.menu_item_name}
                              </div>

                              {ings.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic">No recipe configured — zero stock impact.</p>
                              ) : (
                                <div className="space-y-1 pt-1">
                                  {ings.map((ing: any) => {
                                    const item = inventoryItemsMap[ing.inventory_item_id];
                                    const txKey = `${order.id}:${ing.inventory_item_id}`;
                                    const tx = transactionsMap[txKey] || transactionsMap[`${order.order_id}:${ing.inventory_item_id}`];
                                    const itemName = item?.name || 'Raw Ingredient';
                                    const stockUnit = item?.unit || ing.unit;
                                    const req = tx ? Math.abs(Number(tx.quantity || 0)) : (Number(ing.quantity || 0) * Number(it.quantity || 1));
                                    const availableBefore = tx ? Number(tx.before_stock) : Number(item?.current_stock || 0) + req;
                                    const remaining = tx ? Number(tx.after_stock) : Number(item?.current_stock || 0);
                                    const currentStock = Number(item?.current_stock || 0);
                                    const isShortage = remaining < 0 || currentStock < 0;

                                    return (
                                      <div key={ing.id} className="flex justify-between items-center p-1 bg-slate-50 dark:bg-slate-800 rounded">
                                        <div>
                                          <span className="font-bold text-slate-900 dark:text-white">{itemName}</span>
                                          <span className="block text-[9px] text-slate-400">
                                            Req: {req} {ing.unit} | Before: {availableBefore} {stockUnit} | Rem: {remaining} {stockUnit} | Current: {currentStock} {stockUnit}
                                          </span>
                                        </div>

                                        {isShortage ? (
                                          <span className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 px-1.5 py-0.5 rounded font-black text-[9px]">
                                            INSUFFICIENT (Shortage: {Math.abs(remaining < 0 ? remaining : currentStock)} {stockUnit})
                                          </span>
                                        ) : (
                                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-black text-[9px]">
                                            OK (Deducted)
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </details>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        disabled={processingBatchIds.includes(order.id)}
                        className="inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg border border-rose-200 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-rose-600 bg-transparent transition-all disabled:opacity-50 cursor-pointer"
                        onClick={() => cancelBatch(order.id)}
                      >
                        Decline
                      </button>
                      <button 
                        disabled={processingBatchIds.includes(order.id)}
                        className="inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                        onClick={() => updateBatchStatus(order.id, 'accepted')}
                      >
                        {processingBatchIds.includes(order.id) && (
                          <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                        )}
                        Accept
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: PREPARING (COOKING) */}
        <div className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              Preparing
            </h3>
            <Badge variant="warning">{preparingOrders.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {preparingOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs py-12">
                No active cooking tickets.
              </div>
            ) : (
              preparingOrders.map(order => (
                <Card key={order.id} className="border-l-4 border-l-amber-500 shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {order.order_type === 'takeaway' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase">
                              Takeaway
                            </span>
                          ) : (
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                          )}
                          {order.payment_status === 'paid' ? (
                            <Badge variant="success">Paid</Badge>
                          ) : order.payment_status === 'customer_marked_paid' ? (
                            <Badge variant="warning">Marked Paid</Badge>
                          ) : null}
                        </div>
                        {order.order_type === 'takeaway' && (
                          <div className="text-xs font-black text-purple-600 dark:text-purple-400 mt-1">
                            Arrives in {order.customer_arrival_minutes} mins
                            {order.takeaway_notes && <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Note: {order.takeaway_notes}</span>}
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wider">ORDER {getFormattedOrderId({ id: order.order_id, created_at: order.created_at }, restaurant?.name || '', orders)} • BATCH #{order.batch_number}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at, nowTime)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold py-1">
                      {order.items.map((item: any) => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && <span className="text-[10px] text-rose-500 font-medium">({item.notes})</span>}
                        </li>
                      ))}
                    </ul>

                    {(() => {
                      const notesText = getCleanSpecialInstructions(order, order);
                      if (!notesText) return null;
                      return (
                        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 rounded-xl p-3 my-2 text-amber-900 dark:text-amber-200">
                          <div className="flex items-center gap-1.5 font-extrabold text-xs text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                            <span>📝</span>
                            <span>Special Instructions</span>
                          </div>
                          <p className="text-xs md:text-sm font-black text-amber-950 dark:text-amber-100 mt-1 whitespace-pre-wrap">
                            {notesText}
                          </p>
                        </div>
                      );
                    })()}

                    {(order.accepted_by || order.preparing_by) && (
                      <div className="text-[10px] text-slate-400 font-semibold space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5 pb-1">
                        {order.accepted_by && <p>Accepted by: <span className="text-slate-600 dark:text-slate-300">{order.accepted_by}</span></p>}
                        {order.preparing_by && <p>Cooking by: <span className="text-slate-600 dark:text-slate-300">{order.preparing_by}</span></p>}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {order.status === 'accepted' ? (
                        <button 
                          disabled={processingBatchIds.includes(order.id)}
                          className="w-full inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all disabled:opacity-50 cursor-pointer"
                          onClick={() => updateBatchStatus(order.id, 'preparing')}
                        >
                          {processingBatchIds.includes(order.id) ? (
                            <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5 mr-1" />
                          )}
                          Start Cooking
                        </button>
                      ) : (
                        <button 
                          disabled={processingBatchIds.includes(order.id)}
                          className="w-full inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all disabled:opacity-50 cursor-pointer"
                          onClick={() => updateBatchStatus(order.id, 'ready')}
                        >
                          {processingBatchIds.includes(order.id) ? (
                            <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Ready for Pickup
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: READY FOR PICKUP */}
        <div className="bg-slate-100 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800 pb-2">
            <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm tracking-wider uppercase flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
              Ready
            </h3>
            <Badge variant="purple">{readyOrders.length}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {readyOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs py-12">
                No orders ready for pickup.
              </div>
            ) : (
              readyOrders.map(order => (
                <Card key={order.id} className="border-l-4 border-l-purple-600 shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {order.order_type === 'takeaway' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase">
                              Takeaway
                            </span>
                          ) : (
                            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                          )}
                          {order.payment_status === 'paid' ? (
                            <Badge variant="success">Paid</Badge>
                          ) : order.payment_status === 'customer_marked_paid' ? (
                            <Badge variant="warning">Marked Paid</Badge>
                          ) : null}
                        </div>
                        {order.order_type === 'takeaway' && (
                          <div className="text-xs font-black text-purple-600 dark:text-purple-400 mt-1">
                            Arrives in {order.customer_arrival_minutes} mins
                            {order.takeaway_notes && <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Note: {order.takeaway_notes}</span>}
                          </div>
                        )}
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 tracking-wider">ORDER #{getFormattedOrderId({ id: order.order_id, created_at: order.created_at }, restaurant?.name || '', orders)} • BATCH #{order.batch_number}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at, nowTime)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold py-1">
                      {order.items.map((item: any) => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                        </li>
                      ))}
                    </ul>

                    {(order.accepted_by || order.preparing_by || order.ready_by) && (
                      <div className="text-[10px] text-slate-400 font-semibold space-y-0.5 border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1.5 pb-1">
                        {order.accepted_by && <p>Accepted by: <span className="text-slate-600 dark:text-slate-300">{order.accepted_by}</span></p>}
                        {order.preparing_by && <p>Cooking by: <span className="text-slate-600 dark:text-slate-300">{order.preparing_by}</span></p>}
                        {order.ready_by && <p>Ready by: <span className="text-slate-600 dark:text-slate-300">{order.ready_by}</span></p>}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                      <span className="text-xs text-slate-400 font-semibold italic flex items-center justify-center gap-1.5 py-1">
                        <Clock className="h-3.5 w-3.5 text-purple-500" /> Waiting for waiter pickup
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- Realtime New Order Alert Dialog --- */}
      <Dialog
        isOpen={!!newOrderAlert}
        onClose={() => setNewOrderAlert(null)}
        title="New Table Order Received!"
        footer={
          <div className="flex gap-2 w-full">
            <button 
              className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 font-extrabold px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-50" 
              onClick={() => setNewOrderAlert(null)}
            >
              Close
            </button>
            <button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2" 
              onClick={async () => {
                if (newOrderAlert) {
                  const newBatches = newOrderAlert.batches?.filter(b => b.status === 'new') || [];
                  for (const batch of newBatches) {
                    await db.updateBatchStatus(batch.id, 'accepted', profile?.full_name || 'Kitchen Staff');
                  }
                  if (restaurantId) {
                    await loadKdsData(restaurantId);
                    window.dispatchEvent(new Event('storage'));
                  }
                  setNewOrderAlert(null);
                }
              }}
            >
              Accept Order
            </button>
          </div>
        }
      >
        {newOrderAlert && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Dining Location</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{newOrderAlert.table_name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">ORDER #{getFormattedOrderId(newOrderAlert, restaurant?.name || '', orders)}</p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ordered items</h4>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300">
                {newOrderAlert.items.map(item => (
                  <li key={item.id} className="py-2 flex justify-between">
                    <span>{item.quantity}x {item.menu_item_name}</span>
                    {item.notes && <span className="text-rose-500 font-medium">({item.notes})</span>}
                  </li>
                ))}
              </ul>
            </div>

            {newOrderAlert.special_instructions && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-400">
                <strong>Cooking requests:</strong> {newOrderAlert.special_instructions}
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Toast Notification */}
      {toast && toast.visible && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-pop">
          <div className="bg-white/20 p-2 rounded-lg">
            <Bell className="h-5 w-5 text-white animate-bounce" />
          </div>
          <div>
            <p className="font-extrabold text-sm tracking-wide uppercase">New Order</p>
            <p className="text-xs text-emerald-100">{toast.message}</p>
          </div>
          <button 
            onClick={() => setToast(null)}
            className="ml-4 hover:bg-white/10 p-1 rounded-lg transition-colors text-white/80 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Decline Order Reason Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-pop">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Decline / Cancel Order</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please provide a reason for declining this order. The customer will see this reason on their tracking page.</p>
            </div>

            {(() => {
              const targetBatch = orders.flatMap(o => o.batches || []).find(b => b.id === orderToCancel);
              const isPostPrep = targetBatch && ['preparing', 'ready'].includes(targetBatch.status);

              return (
                <div className="space-y-3">
                  {isPostPrep && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase">
                        ⚠ Food was already {targetBatch?.status?.toUpperCase()}
                      </p>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300">
                        Raw inventory was already physically consumed. Select what was done with the cooked food:
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'reallocated', label: 'Reallocated', desc: 'Resold' },
                          { id: 'staff_meal', label: 'Staff Meal', desc: 'Kitchen/Staff' },
                          { id: 'complimentary', label: 'Complimentary', desc: 'Free Item' },
                          { id: 'owner_internal', label: 'Owner / Tasting', desc: 'Internal' },
                          { id: 'waste', label: 'Waste / Discard', desc: 'Trashed' },
                          { id: 'other', label: 'Other', desc: 'Custom' }
                        ].map(disp => (
                          <button
                            key={disp.id}
                            type="button"
                            onClick={() => setKdsDispositionType(disp.id as any)}
                            className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                              kdsDispositionType === disp.id
                                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-black'
                                : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="font-bold block">{disp.label}</span>
                            <span className="text-[10px] text-slate-500">{disp.desc}</span>
                          </button>
                        ))}
                      </div>

                      <label className="flex items-center gap-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={kdsRestoreInventory}
                          onChange={e => setKdsRestoreInventory(e.target.checked)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                          Restore raw inventory (only if ingredients were undamaged/uncooked)
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider block">
                      Cancellation Reason <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="e.g. Item out of stock / Kitchen is closing / Customer refused"
                      rows={3}
                      className="block w-full px-3.5 py-2.5 text-sm border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-semibold"
                    />
                  </div>
                </div>
              );
            })()}
            
            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-xl font-bold px-4 py-2 cursor-pointer"
              >
                Go Back
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={!cancellationReason.trim()}
                onClick={async () => {
                  if (!orderToCancel || !cancellationReason.trim()) return;
                  try {
                    window.dispatchEvent(new Event('stop-kitchen-sound'));
                    const cancelReasonText = cancellationReason.trim();
                    const batchIdToCancel = orderToCancel;
                    const targetBatch = orders.flatMap(o => o.batches || []).find(b => b.id === batchIdToCancel);
                    const targetOrder = orders.find(o => (o.batches || []).some(b => b.id === batchIdToCancel));
                    const isPostPrep = targetBatch && ['preparing', 'ready'].includes(targetBatch.status);
                    
                    setOrders(prev => prev.map(o => ({
                      ...o,
                      batches: o.batches?.map(b => b.id === batchIdToCancel ? {
                        ...b,
                        status: 'cancelled' as const,
                        special_instructions: `[CANCELLED] ${cancelReasonText}`
                      } : b)
                    })));

                    await db.updateBatchStatus(
                      batchIdToCancel,
                      'cancelled',
                      profile?.full_name || 'Kitchen Staff',
                      cancelReasonText
                    );

                    // If food was already prepared, record disposition
                    if (isPostPrep && restaurantId && targetBatch) {
                      const { recordPreparedFoodDisposition } = await import('@/lib/inventoryEngine');
                      for (const item of (targetBatch.items || [])) {
                        await recordPreparedFoodDisposition({
                          restaurantId,
                          orderId: targetOrder?.id || '',
                          batchId: targetBatch.id,
                          orderItemId: item.id,
                          menuItemId: item.menu_item_id,
                          menuItemName: item.menu_item_name,
                          variantName: item.variant_name,
                          quantity: item.quantity,
                          wasServed: false,
                          dispositionType: kdsDispositionType,
                          wasteReason: kdsDispositionType === 'waste' ? 'Kitchen Cancellation / Refusal' : undefined,
                          notes: cancelReasonText,
                          handledBy: profile?.full_name || 'Kitchen Staff',
                          restoreInventory: kdsRestoreInventory
                        });
                      }
                    }

                    if (restaurantId) {
                      await loadKdsData(restaurantId);
                      window.dispatchEvent(new Event('storage'));
                    }
                    setCancelModalOpen(false);
                  } catch (err: any) {
                    alert(`Failed to cancel order: ${err.message}`);
                  }
                }}
                className="rounded-xl font-extrabold px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-md shadow-rose-600/10"
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
