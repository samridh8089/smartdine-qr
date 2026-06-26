'use client';

import { useState, useEffect, useRef } from 'react';
import { db, Order } from '@/lib/db';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { 
  ChefHat, Clock, Check, ArrowRight, Play, CheckCircle2, 
  X, AlertCircle, Volume2, Sparkles
} from 'lucide-react';

export default function KitchenDisplayPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // sound toggle state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Real-time new order alert popup state
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);

  // Prevent duplicate chimes/alerts for the same order
  const alertedOrderIds = useRef<Set<string>>(new Set());

  // Unlock audio context on user interaction
  useEffect(() => {
    const unlock = () => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const tempCtx = new AudioContextClass();
        if (tempCtx.state === 'suspended') {
          tempCtx.resume();
        }
      }
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Request browser notifications permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const showDesktopNotification = (order: Order) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`New Order - ${order.table_name || 'Table'}`, {
          body: `Items: ${order.items?.map(i => `${i.quantity}x ${i.menu_item_name}`).join(', ') || 'No items'}. Total: ₹${order.total}`,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.error('Notification error:', e);
      }
    }
  };

  const loadKdsData = async (restId: string) => {
    const allOrders = await db.getOrders(restId);
    const activeOrders = allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
    setOrders(activeOrders);
    
    // Add existing order IDs to the alerted set so they don't trigger the bell on load
    allOrders.forEach(o => alertedOrderIds.current.add(o.id));
    
    setLoading(false);
  };

  useEffect(() => {
    async function loadKds() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;
      setRestaurantId(restId);
      await loadKdsData(restId);
    }
    loadKds();
  }, []);

  // Setup Supabase Realtime for Incoming Orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('kds_orders_live')
      .on(
        'postgres_changes',
        {
          event: '*', // listen to all events: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        async (payload) => {
          console.log('Realtime KDS order change:', payload);
          
          // Reload orders list
          const allOrders = await db.getOrders(restaurantId);
          const activeOrders = allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
          setOrders(activeOrders);

          // Handle new order insertion chimes
          if (payload.eventType === 'INSERT') {
            const newOrderPayload = payload.new as Order;
            
            // Check if we already alerted for this order
            if (!alertedOrderIds.current.has(newOrderPayload.id)) {
              alertedOrderIds.current.add(newOrderPayload.id);

              // Play double chime
              if (soundEnabled) {
                playOrderSound();
              }

              // Trigger hardware vibration (mobile/tablets support)
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
              }

              // Fetch full order with items and display popup alert
              const fullOrder = await db.getOrderById(newOrderPayload.id);
              if (fullOrder) {
                setNewOrderAlert(fullOrder);
                showDesktopNotification(fullOrder);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, soundEnabled]);

  const playOrderSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;

      // Master Volume Control - Loud and Noticeable!
      const mainGain = audioCtx.createGain();
      mainGain.gain.setValueAtTime(0.8, now);
      mainGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0); // 2 second decay
      mainGain.connect(audioCtx.destination);

      // Frequencies for a bright, resonant bell chime
      const frequencies = [587.33, 880, 1174.66, 1760];
      const types: OscillatorType[] = ['sine', 'sine', 'triangle', 'sine'];
      const gains = [0.6, 0.4, 0.2, 0.1];

      frequencies.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        
        osc.type = types[i];
        osc.frequency.setValueAtTime(freq, now);
        
        oscGain.gain.setValueAtTime(gains[i], now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + (i === 0 ? 2.0 : 0.8));
        
        osc.connect(oscGain);
        oscGain.connect(mainGain);
        
        osc.start(now);
        osc.stop(now + 2.0);
      });
    } catch (e) {
      console.warn('Audio playback blocked or unsupported', e);
    }
  };

  const updateStatus = async (orderId: string, nextStatus: Order['status']) => {
    try {
      await db.updateOrderStatus(orderId, nextStatus);
      if (restaurantId) {
        await loadKdsData(restaurantId);
        // Dispatch local event to sync with other dashboard tabs
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err: any) {
      alert(`Failed to update order status: ${err.message}`);
    }
  };

  const getTimeElapsed = (dateString: string) => {
    const elapsedMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(elapsedMs / 60000);
    if (mins < 1) return 'Just now';
    return `${mins}m ago`;
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

  // Group active orders by columns
  const newOrders = orders.filter(o => o.status === 'new');
  const preparingOrders = orders.filter(o => o.status === 'accepted' || o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Title Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-emerald-600 dark:text-emerald-400 animate-bounce" />
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
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">ORDER #{order.id.slice(-5).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold py-1">
                      {order.items.map(item => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && <span className="text-[10px] text-rose-500 font-medium">({item.notes})</span>}
                        </li>
                      ))}
                    </ul>

                    {order.special_instructions && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-400">
                        <strong>Note:</strong> {order.special_instructions}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-rose-600 border-rose-100 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                        onClick={() => updateStatus(order.id, 'cancelled')}
                      >
                        Decline
                      </Button>
                      <Button 
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => updateStatus(order.id, 'accepted')}
                      >
                        Accept
                      </Button>
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
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wider">ORDER #{order.id.slice(-5).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold py-1">
                      {order.items.map(item => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && <span className="text-[10px] text-rose-500 font-medium">({item.notes})</span>}
                        </li>
                      ))}
                    </ul>

                    {order.special_instructions && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-400">
                        <strong>Note:</strong> {order.special_instructions}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {order.status === 'accepted' ? (
                        <Button 
                          className="w-full bg-amber-500 hover:bg-amber-600 cursor-pointer" 
                          size="sm"
                          onClick={() => updateStatus(order.id, 'preparing')}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" /> Start Cooking
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-purple-600 hover:bg-purple-700 cursor-pointer" 
                          size="sm"
                          onClick={() => updateStatus(order.id, 'ready')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Ready for Pickup
                        </Button>
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
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 tracking-wider">ORDER #{order.id.slice(-5).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold py-1">
                      {order.items.map(item => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 cursor-pointer" 
                        size="sm"
                        onClick={() => updateStatus(order.id, 'served')}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Serve & Complete
                      </Button>
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
        title="🔔 New Table Order Received!"
        footer={
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              className="flex-1 cursor-pointer" 
              onClick={() => setNewOrderAlert(null)}
            >
              Close
            </Button>
            <Button 
              className="flex-1 cursor-pointer" 
              onClick={() => {
                if (newOrderAlert) {
                  updateStatus(newOrderAlert.id, 'accepted');
                  setNewOrderAlert(null);
                }
              }}
            >
              Accept Order
            </Button>
          </div>
        }
      >
        {newOrderAlert && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Dining Location</span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{newOrderAlert.table_name}</h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">ORDER #{newOrderAlert.id.slice(-5).toUpperCase()}</p>
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
    </div>
  );
}
