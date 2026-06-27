'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Order, Restaurant } from '@/lib/db';
import { formatPrice, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import { 
  CheckCircle2, AlertTriangle, ArrowLeft, 
  RotateCcw, Printer, ChefHat, Clock, Plus
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

  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrderData = async () => {
    const o = await db.getOrderById(orderId);
    if (!o) {
      setLoading(false);
      return;
    }
    setOrder(o);

    const rest = await db.getRestaurantById(o.restaurant_id);
    if (rest) setRestaurant(rest);
    setLoading(false);
  };

  useEffect(() => {
    loadOrderData();
  }, [orderId]);

  // Realtime Supabase Subscription for Order Status updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`customer_order_tracking_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          console.log('Realtime Order Tracking Update:', payload.new);
          // Refetch order details with item mappings
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

  const handleReorder = async () => {
    if (!order || !restaurant) return;
    
    try {
      const menuItems = await db.getMenuItems(order.restaurant_id);
      const reorderCart = order.items.map(item => {
        const fullItem = menuItems.find(i => i.id === item.menu_item_id);
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
          notes: item.notes
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

  const getStepTimestamp = (stepKey: string) => {
    if (!order.batches || order.batches.length === 0) {
      if (stepKey === 'new') return order.created_at;
      return null;
    }
    const sortedBatches = [...order.batches].sort((a, b) => b.batch_number - a.batch_number);
    const latestActiveBatch = sortedBatches.find(b => b.status !== 'served') || sortedBatches[0];

    if (stepKey === 'new') return latestActiveBatch.created_at;
    if (stepKey === 'accepted') return latestActiveBatch.accepted_at;
    if (stepKey === 'preparing') return latestActiveBatch.preparing_at;
    if (stepKey === 'ready') return latestActiveBatch.ready_at;
    if (stepKey === 'served') return latestActiveBatch.served_at;
    return null;
  };

  const formatTimelineTime = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  };

  // Define status steps
  const steps = [
    { key: 'new', label: 'Order Sent', desc: 'Sent to kitchen' },
    { key: 'accepted', label: 'Accepted', desc: 'Confirmed by staff' },
    { key: 'preparing', label: 'Preparing', desc: 'Chef is cooking' },
    { key: 'ready', label: 'Ready', desc: 'Food is ready' },
    { key: 'served', label: 'Served', desc: 'Brought to table' }
  ];

  const getStatusIndex = (status: Order['status']) => {
    if (status === 'cancelled') return -1;
    if (status === 'completed') return 4;
    return steps.findIndex(s => s.key === status);
  };

  const currentStepIndex = getStatusIndex(order.status);

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/40 pb-12 transition-colors">
      {/* Mini Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm sticky top-0 z-30 shrink-0">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href={`/menu/${restaurant.slug}/table/${order.table_id}`}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Menu
          </Link>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">SmartDine QR Order Tracking</span>
        </div>
      </header>

      {/* Main Track container */}
      <main className="max-w-lg w-full mx-auto px-4 py-8 space-y-6">
        
        {/* Restaurant Header Info */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{restaurant.name}</h1>
          <p className="text-xs text-slate-400 dark:text-slate-550 font-semibold uppercase">{order.table_name || 'Table'} • Receipt #{order.id.slice(-5).toUpperCase()}</p>
        </div>

        {/* Live Timeline State Card */}
        <Card className="shadow-md dark:border-slate-800 animate-pop">
          <CardContent className="p-6 space-y-6">
            
            {order.status === 'cancelled' ? (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-800 dark:text-rose-455 rounded-xl p-4 flex items-center gap-3 text-sm">
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                <div>
                  <strong>Order Cancelled:</strong> This order has been cancelled by the restaurant staff. Please contact the service desk.
                </div>
              </div>
            ) : order.status === 'completed' ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl p-4 flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 animate-bounce" />
                <div>
                  <strong>Order Completed:</strong> Thank you for dining with us! We hope you enjoyed your meal.
                </div>
              </div>
            ) : (
              /* Beautiful Live vertical timeline */
              <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-8 py-2">
                {steps.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  
                  return (
                    <div key={step.key} className="relative pl-8">
                      {/* Timeline dot */}
                      <span className={`
                        absolute -left-[11px] top-1 h-5 w-5 rounded-full flex items-center justify-center border-2 transition-all duration-300
                        ${isDone ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                        ${isCurrent ? 'bg-white dark:bg-slate-900 border-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/50' : ''}
                        ${!isDone && !isCurrent ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300' : ''}
                      `}>
                        {isDone && <CheckCircle2 className="h-3 w-3 text-white fill-current" />}
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />}
                      </span>
                      
                      {/* Step Labels */}
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className={`text-sm font-extrabold transition-colors duration-300 ${
                            isCurrent ? 'text-emerald-600 dark:text-emerald-400' : isDone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                          }`}>
                            {step.label}
                          </h4>
                          {(isDone || isCurrent) && getStepTimestamp(step.key) && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold shrink-0">
                              {formatTimelineTime(getStepTimestamp(step.key))}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </CardContent>
        </Card>

        {/* Order Details & Summary */}
        <Card className="dark:border-slate-800">
          <CardContent className="p-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Order Summary</h3>

            {/* List */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items.map(item => (
                <div key={item.id} className="py-3 flex justify-between gap-4 text-xs md:text-sm font-semibold">
                  <span className="text-slate-700 dark:text-slate-300">{item.quantity}x {item.menu_item_name}</span>
                  <span className="text-slate-955 dark:text-white">{formatPrice(item.price * item.quantity, restaurant.settings.currency)}</span>
                </div>
              ))}
            </div>

            {/* Billing breakdown */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 pt-4">
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal, restaurant.settings.currency)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>GST ({restaurant.settings.gst_percentage}%)</span>
                <span>{formatPrice(order.gst, restaurant.settings.currency)}</span>
              </div>
              {order.service_charge > 0 && (
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Service Charge ({restaurant.settings.service_charge_percentage}%)</span>
                  <span>{formatPrice(order.service_charge, restaurant.settings.currency)}</span>
                </div>
              )}
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-1" />
              <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm md:text-base">
                <span>Total Amount Paid</span>
                <span>{formatPrice(order.total, restaurant.settings.currency)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col gap-2">
              {order.status !== 'completed' && order.status !== 'cancelled' && (
                <Button 
                  className={`w-full gap-1.5 cursor-pointer flex items-center justify-center ${
                    order.status === 'served' ? 'bg-emerald-650 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  onClick={() => router.push(`/menu/${restaurant.slug}/table/${order.table_id}`)}
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
