'use client';

import { useState, useEffect, useRef } from 'react';
import { db, Order, OrderBatch } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { useRestaurant } from '../../layout';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { 
  ChefHat, Clock, Check, ArrowRight, Play, CheckCircle2, 
  X, AlertCircle, Volume2, Sparkles, Bell
} from 'lucide-react';

// Helper to generate a 2-second WAV file (0.5s A5 880Hz square wave beep followed by 1.5s of silence)
const createBeepWavDataUri = () => {
  const sampleRate = 8000;
  const duration = 2.0;
  const numSamples = sampleRate * duration;
  const buffer = new Uint8Array(44 + numSamples);
  
  // RIFF header
  buffer[0] = 0x52; // 'R'
  buffer[1] = 0x49; // 'I'
  buffer[2] = 0x46; // 'F'
  buffer[3] = 0x46; // 'F'
  
  const fileSize = 36 + numSamples;
  buffer[4] = fileSize & 0xff;
  buffer[5] = (fileSize >> 8) & 0xff;
  buffer[6] = (fileSize >> 16) & 0xff;
  buffer[7] = (fileSize >> 24) & 0xff;
  
  buffer[8] = 0x57; // 'W'
  buffer[9] = 0x41; // 'A'
  buffer[10] = 0x56; // 'V'
  buffer[11] = 0x45; // 'E'
  
  // fmt chunk
  buffer[12] = 0x66; // 'f'
  buffer[13] = 0x6d; // 'm'
  buffer[14] = 0x74; // 't'
  buffer[15] = 0x20; // ' '
  
  buffer[16] = 16; buffer[17] = 0; buffer[18] = 0; buffer[19] = 0;
  buffer[20] = 1; buffer[21] = 0;
  buffer[22] = 1; buffer[23] = 0;
  
  buffer[24] = sampleRate & 0xff;
  buffer[25] = (sampleRate >> 8) & 0xff;
  buffer[26] = (sampleRate >> 16) & 0xff;
  buffer[27] = (sampleRate >> 24) & 0xff;
  
  buffer[28] = sampleRate & 0xff;
  buffer[29] = (sampleRate >> 8) & 0xff;
  buffer[30] = (sampleRate >> 16) & 0xff;
  buffer[31] = (sampleRate >> 24) & 0xff;
  
  buffer[32] = 1; buffer[33] = 0;
  buffer[34] = 8; buffer[35] = 0;
  
  // data chunk
  buffer[36] = 0x64; // 'd'
  buffer[37] = 0x61; // 'a'
  buffer[38] = 0x74; // 't'
  buffer[39] = 0x61; // 'a'
  
  buffer[40] = numSamples & 0xff;
  buffer[41] = (numSamples >> 8) & 0xff;
  buffer[42] = (numSamples >> 16) & 0xff;
  buffer[43] = (numSamples >> 24) & 0xff;
  
  // Generate square wave for 0.5s, then 1.5s silence
  const frequency = 880;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    if (t < 0.5) {
      const sample = Math.sin(2 * Math.PI * frequency * t) >= 0 ? 225 : 30;
      buffer[44 + i] = sample;
    } else {
      buffer[44 + i] = 128;
    }
  }
  
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
};

export default function KitchenDisplayPage() {
  const { restaurant } = useRestaurant();
  const [restaurantId, setRestaurantId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingBatchIds, setProcessingBatchIds] = useState<string[]>([]);

  // sound toggle state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Real-time new order alert popup state
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  
  // Real-time toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

  // Time state for relative elapsed calculations
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Refs and Audio Elements for continuous alarms
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const isAlarmPlayingRef = useRef<boolean>(false);
  const [alarmActive, setAlarmActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmOscRef = useRef<OscillatorNode | null>(null);
  const alarmLfoRef = useRef<OscillatorNode | null>(null);
  const alarmGainRef = useRef<GainNode | null>(null);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const isReloadingRef = useRef(false);
  const pendingReloadRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    if (!soundEnabled) {
      stopAlarm();
    } else if (orders.some(o => o.batches?.some(b => b.status === 'new'))) {
      startAlarm();
    }
  }, [soundEnabled, orders]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 15000);
    return () => {
      clearInterval(timer);
      stopAlarm();
    };
  }, []);

  // Prevent duplicate chimes/alerts for the same order
  const alertedOrderIds = useRef<Set<string>>(new Set());
  const alertedBatchIds = useRef<Set<string>>(new Set());

  // Unlock and setup AudioContext on user interaction
  useEffect(() => {
    const initAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass && !audioCtxRef.current) {
          const ctx = new AudioContextClass();
          if (ctx.state === 'suspended') {
            ctx.resume();
          }
          audioCtxRef.current = ctx;
        }
      } catch (e) {
        console.warn('Failed to initialize AudioContext:', e);
      }
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
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

  const startAlarm = () => {
    if (!soundEnabledRef.current) return;
    if (isAlarmPlayingRef.current) return;

    console.log('Alarm started');
    isAlarmPlayingRef.current = true;
    setAlarmActive(true);

    // Try HTMLAudioElement first
    if (!alarmAudioRef.current) {
      const dataUri = createBeepWavDataUri();
      alarmAudioRef.current = new Audio(dataUri);
      alarmAudioRef.current.loop = true;
    }

    alarmAudioRef.current.play()
      .then(() => {
        // Successfully playing
      })
      .catch((err) => {
        console.warn('HTMLAudioElement play blocked, falling back to Web Audio API:', err);
        startWebAudioSiren();
      });
  };

  const startWebAudioSiren = () => {
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (alarmOscRef.current) return; // already running

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, now);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);

      // Loop LFO every 2 seconds (0.5Hz square wave)
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(0.5, now);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.4, now);

      lfo.connect(lfoGain);
      lfoGain.connect(gainNode.gain);

      // Pitch wobble
      const pitchLfo = ctx.createOscillator();
      pitchLfo.type = 'sine';
      pitchLfo.frequency.setValueAtTime(1, now);
      const pitchLfoGain = ctx.createGain();
      pitchLfoGain.gain.setValueAtTime(150, now);
      pitchLfo.connect(pitchLfoGain);
      pitchLfoGain.connect(osc.frequency);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      lfo.start(now);
      pitchLfo.start(now);
      osc.start(now);

      alarmOscRef.current = osc;
      alarmLfoRef.current = lfo;
      alarmGainRef.current = gainNode;
      (osc as any).pitchLfo = pitchLfo;
      (osc as any).pitchLfoGain = pitchLfoGain;
    } catch (e) {
      console.warn('Failed to start Web Audio API fallback:', e);
    }
  };

  const stopAlarm = () => {
    if (!isAlarmPlayingRef.current) return;

    console.log('Alarm stopped');
    isAlarmPlayingRef.current = false;
    setAlarmActive(false);

    if (alarmAudioRef.current) {
      alarmAudioRef.current.pause();
      alarmAudioRef.current.currentTime = 0;
    }

    try {
      if (alarmOscRef.current) {
        alarmOscRef.current.stop();
        alarmOscRef.current.disconnect();
        if ((alarmOscRef.current as any).pitchLfo) {
          (alarmOscRef.current as any).pitchLfo.stop();
          (alarmOscRef.current as any).pitchLfo.disconnect();
        }
        alarmOscRef.current = null;
      }
      if (alarmLfoRef.current) {
        alarmLfoRef.current.stop();
        alarmLfoRef.current.disconnect();
        alarmLfoRef.current = null;
      }
      if (alarmGainRef.current) {
        alarmGainRef.current.disconnect();
        alarmGainRef.current = null;
      }
    } catch (e) {
      console.warn('Failed to stop Web Audio API fallback:', e);
    }
  };

  const syncAlarmState = (activeOrdersList: Order[]) => {
    const hasNew = activeOrdersList.some(o => o.batches?.some(b => b.status === 'new'));
    if (hasNew) {
      startAlarm();
    } else {
      stopAlarm();
    }
  };

  const loadKdsData = async (restId: string) => {
    const allOrders = await db.getOrders(restId);
    const activeOrders = allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
    setOrders(activeOrders);
    
    // Add existing order and batch IDs to the alerted sets so they don't trigger the bell on load
    allOrders.forEach(o => {
      alertedOrderIds.current.add(o.id);
      o.batches?.forEach(b => alertedBatchIds.current.add(b.id));
    });
    
    setLoading(false);
    syncAlarmState(activeOrders);
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
      syncAlarmState(activeOrders);
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

    console.log(`Subscribing to realtime updates (orders & batches) for restaurant: ${restaurantId}`);
    const channel = supabase
      .channel('kds_orders_live')
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

              // Trigger hardware vibration
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
              }

              // Fetch full order with items and display popup alert
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

          // Fetch parent order to verify restaurant ID
          const fullOrder = await db.getOrderById(newBatch.order_id);
          if (fullOrder && fullOrder.restaurant_id === restaurantId) {
            await reloadFnRef.current(restaurantId);

            if (!alertedBatchIds.current.has(newBatch.id)) {
              alertedBatchIds.current.add(newBatch.id);
              console.log(`New batch detected! Playing alarm for batch ID: ${newBatch.id}`);

              // Trigger hardware vibration
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
              }

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
          
          // Verify this batch belongs to our restaurant by checking its parent order
          const { data: parentOrder } = await supabase
            .from('orders')
            .select('restaurant_id')
            .eq('id', updatedBatch.order_id)
            .single();

          if (parentOrder && parentOrder.restaurant_id === restaurantId) {
            await reloadFnRef.current(restaurantId);
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
      stopAlarm();
    };
  }, [restaurantId]);

  const updateBatchStatus = async (batchId: string, nextStatus: OrderBatch['status']) => {
    if (processingBatchIds.includes(batchId)) return;
    setProcessingBatchIds(prev => [...prev, batchId]);
    try {
      await db.updateBatchStatus(batchId, nextStatus);
      if (restaurantId) {
        await loadKdsData(restaurantId);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setProcessingBatchIds(prev => prev.filter(id => id !== batchId));
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await db.updateOrderStatus(orderId, 'cancelled');
      if (restaurantId) {
        await loadKdsData(restaurantId);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err: any) {
      alert(`Failed to cancel order: ${err.message}`);
    }
  };

  const getTimeElapsed = (dateString: string, currentNow: number) => {
    const elapsedMs = currentNow - new Date(dateString).getTime();
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

  // Extract active batches from active orders
  const activeBatches = orders.reduce((acc: any[], order) => {
    if (order.batches) {
      order.batches.forEach(batch => {
        if (batch.status !== 'served') {
          acc.push({
            ...batch,
            table_name: order.table_name,
            restaurant_id: order.restaurant_id,
            order_id: order.id
          });
        }
      });
    }
    return acc;
  }, []);

  const newOrders = activeBatches.filter(b => b.status === 'new');
  const preparingOrders = activeBatches.filter(b => b.status === 'accepted' || b.status === 'preparing');
  const readyOrders = activeBatches.filter(b => b.status === 'ready');

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

      {/* Large Pulsing Red Alert Card for New Orders */}
      {newOrders.length > 0 && (
        <div className="bg-red-600 text-white rounded-2xl p-6 shadow-xl border border-red-500 animate-pulse flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="bg-white/20 p-3.5 rounded-2xl animate-bounce">
              <Bell className="h-8 w-8 text-white fill-current animate-wiggle" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-wide uppercase">NEW ORDER WAITING FOR CONFIRMATION!</h3>
              <p className="text-sm text-red-100 font-semibold mt-1">Loud continuous alarm is active. Accept the order to confirm and stop the alarm.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={newOrders[0] ? processingBatchIds.includes(newOrders[0].id) : false}
              className="!bg-white !text-red-700 hover:bg-red-50 font-extrabold px-6 py-3 rounded-xl shadow-lg border border-transparent cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shrink-0 z-10"
              onClick={async () => {
                const firstNew = newOrders[0];
                if (firstNew) {
                  await updateBatchStatus(firstNew.id, 'accepted');
                }
              }}
            >
              {newOrders[0] && processingBatchIds.includes(newOrders[0].id) && (
                <div className="h-4 w-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
              )}
              Accept Order
            </button>
          </div>
        </div>
      )}

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
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">ORDER #{order.order_id.slice(-5).toUpperCase()} • BATCH #{order.batch_number}</span>
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

                    {order.special_instructions && (
                      <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-400">
                        <strong>Note:</strong> {order.special_instructions}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        disabled={processingBatchIds.includes(order.id)}
                        className="inline-flex items-center justify-center font-bold px-3 py-1.5 text-xs rounded-lg border border-rose-200 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-rose-600 bg-transparent transition-all disabled:opacity-50 cursor-pointer"
                        onClick={() => cancelOrder(order.order_id)}
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
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-wider">ORDER #{order.order_id.slice(-5).toUpperCase()} • BATCH #{order.batch_number}</span>
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

                    {order.special_instructions && (
                      <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30 rounded-lg p-2.5 text-xs text-amber-800 dark:text-amber-400">
                        <strong>Note:</strong> {order.special_instructions}
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
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 tracking-wider">ORDER #{order.order_id.slice(-5).toUpperCase()} • BATCH #{order.batch_number}</span>
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
        title="🔔 New Table Order Received!"
        footer={
          <div className="flex gap-2 w-full">
            <button 
              className="flex-1 border border-slate-200 dark:border-slate-700 text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 font-extrabold px-6 py-2.5 rounded-xl cursor-pointer disabled:opacity-50" 
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
                    await db.updateBatchStatus(batch.id, 'accepted');
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
    </div>
  );
}
