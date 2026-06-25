'use client';

import { useState, useEffect } from 'react';
import { db, Order } from '@/lib/db';
import { getActiveUser } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  ChefHat, Clock, Check, ArrowRight, Play, CheckCircle2, 
  X, AlertCircle, Volume2
} from 'lucide-react';

export default function KitchenDisplayPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // sound toggle state
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    async function loadKds() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;
      setRestaurantId(restId);

      const allOrders = await db.getOrders(restId);
      // Filter out completed and cancelled orders for kitchen display
      const activeOrders = allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
      setOrders(activeOrders);
      setLoading(false);
    }
    loadKds();

    // Listen for storage events (e.g. customer placing order) to trigger realtime update
    const handleStorage = async () => {
      // Audio notification on new orders
      const previousOrdersCount = orders.filter(o => o.status === 'new').length;
      
      const user = await getActiveUser();
      if (user && user.restaurant_id) {
        const allOrders = await db.getOrders(user.restaurant_id);
        const currentOrders = allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status));
        const newOrdersCount = currentOrders.filter(o => o.status === 'new').length;
        
        if (newOrdersCount > previousOrdersCount && soundEnabled) {
          playOrderSound();
        }
        setOrders(currentOrders);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [orders, soundEnabled]);

  const playOrderSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc2.connect(gainNode);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 150);
    } catch (e) {
      console.log('Audio playback blocked or unsupported');
    }
  };

  const updateStatus = async (orderId: string, nextStatus: Order['status']) => {
    try {
      await db.updateOrderStatus(orderId, nextStatus);
      // Reload local list
      if (restaurantId) {
        const allOrders = await db.getOrders(restaurantId);
        setOrders(allOrders.filter(o => !['completed', 'cancelled', 'served'].includes(o.status)));
        // Dispatch storage event to sync with other dashboard panels locally
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
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-6 h-[80vh]">
          <div className="bg-slate-200 rounded-xl" />
          <div className="bg-slate-200 rounded-xl" />
          <div className="bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  // Group active orders by column
  const newOrders = orders.filter(o => o.status === 'new');
  const preparingOrders = orders.filter(o => o.status === 'accepted' || o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Title Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ChefHat className="h-6 w-6 text-emerald-600 animate-bounce" />
            Kitchen Display System (KDS)
          </h2>
          <p className="text-slate-500 text-sm mt-1">Live cooking tickets and real-time customer status tracking.</p>
        </div>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all ${
            soundEnabled 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100' 
              : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Volume2 className="h-4 w-4" />
          {soundEnabled ? 'Kitchen Bell On' : 'Kitchen Bell Off'}
        </button>
      </div>

      {/* Grid Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[70vh]">
        
        {/* COLUMN 1: NEW INCOMING ORDERS */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-2">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-wider uppercase flex items-center gap-2">
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
                <Card key={order.id} className="border-l-4 border-l-indigo-600 shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-indigo-600 tracking-wider">ORDER #{order.id.slice(-5).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 text-slate-700 text-sm font-semibold py-1">
                      {order.items.map(item => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && <span className="text-[10px] text-rose-500 font-medium">({item.notes})</span>}
                        </li>
                      ))}
                    </ul>

                    {order.special_instructions && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-800">
                        <strong>Note:</strong> {order.special_instructions}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-rose-600 border-rose-100 hover:bg-rose-50"
                        onClick={() => updateStatus(order.id, 'cancelled')}
                      >
                        Decline
                      </Button>
                      <Button 
                        size="sm"
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
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-2">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-wider uppercase flex items-center gap-2">
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
                        <h4 className="font-extrabold text-slate-900 text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-amber-600 tracking-wider">ORDER #{order.id.slice(-5).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 text-slate-700 text-sm font-semibold py-1">
                      {order.items.map(item => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                          {item.notes && <span className="text-[10px] text-rose-500 font-medium">({item.notes})</span>}
                        </li>
                      ))}
                    </ul>

                    {order.special_instructions && (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 text-xs text-amber-800">
                        <strong>Note:</strong> {order.special_instructions}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100">
                      {order.status === 'accepted' ? (
                        <Button 
                          className="w-full bg-amber-500 hover:bg-amber-600" 
                          size="sm"
                          onClick={() => updateStatus(order.id, 'preparing')}
                        >
                          <Play className="h-3.5 w-3.5 mr-1" /> Start Cooking
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-purple-600 hover:bg-purple-700" 
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
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-4">
          <div className="flex items-center justify-between shrink-0 border-b border-slate-200 pb-2">
            <h3 className="font-extrabold text-slate-800 text-sm tracking-wider uppercase flex items-center gap-2">
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
                        <h4 className="font-extrabold text-slate-900 text-base">{order.table_name}</h4>
                        <span className="text-[10px] font-bold text-purple-600 tracking-wider">ORDER #{order.id.slice(-5).toUpperCase()}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {getTimeElapsed(order.created_at)}
                      </span>
                    </div>

                    <ul className="divide-y divide-slate-100 text-slate-700 text-sm font-semibold py-1">
                      {order.items.map(item => (
                        <li key={item.id} className="py-1.5 flex justify-between">
                          <span>{item.quantity}x {item.menu_item_name}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2 border-t border-slate-100">
                      <Button 
                        className="w-full bg-emerald-600 hover:bg-emerald-700" 
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
    </div>
  );
}
