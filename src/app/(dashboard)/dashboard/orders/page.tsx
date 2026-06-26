'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, Order, Restaurant, CustomerRequest } from '@/lib/db';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice, formatDate } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Search, Printer, Check, X, AlertCircle, ShoppingBag, Bell, ClipboardList, CheckCircle } from 'lucide-react';

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('id');

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Tab state: 'orders' or 'requests'
  const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders');
  const [customerRequests, setCustomerRequests] = useState<CustomerRequest[]>([]);

  // Real-time toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);

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

  const playBellSound = () => {
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

  useEffect(() => {
    async function loadInitialData() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;

      const rest = await db.getRestaurantById(restId);
      if (rest) setRestaurant(rest);

      const allOrders = await db.getOrders(restId);
      setOrders(allOrders);

      // Cache existing order IDs on initial load so we don't chime for them
      allOrders.forEach(o => alertedOrderIds.current.add(o.id));

      // Load pending requests
      const reqs = await db.getCustomerRequests(restId);
      setCustomerRequests(reqs.filter(r => r.status === 'pending'));

      if (orderIdParam) {
        const selected = allOrders.find(o => o.id === orderIdParam);
        if (selected) setSelectedOrder(selected);
      } else if (allOrders.length > 0 && !selectedOrder) {
        setSelectedOrder(allOrders[0]);
      }

      setLoading(false);
    }
    loadInitialData();
  }, [orderIdParam]);

  // Realtime Supabase Subscription for Orders & Customer Requests
  useEffect(() => {
    if (!restaurant) return;
    const restId = restaurant.id;

    const loadRequests = async () => {
      const reqs = await db.getCustomerRequests(restId);
      setCustomerRequests(reqs.filter(r => r.status === 'pending'));
    };

    const loadOrders = async () => {
      const allOrders = await db.getOrders(restId);
      setOrders(allOrders);
      if (selectedOrder) {
        const updated = allOrders.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    };

    console.log(`Subscribing to live orders & requests updates for restaurant: ${restId}`);
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
          loadOrders();

          if (payload.eventType === 'INSERT') {
            const newOrderPayload = payload.new as Order;
            if (!alertedOrderIds.current.has(newOrderPayload.id)) {
              alertedOrderIds.current.add(newOrderPayload.id);
              console.log(`New order detected! Playing chimes for order ID: ${newOrderPayload.id}`);
              
              // Play bell sound
              playBellSound();
              
              // Trigger hardware vibration
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
              }

              // Fetch full order with items and display desktop notification
              const fullOrder = await db.getOrderById(newOrderPayload.id);
              if (fullOrder) {
                showDesktopNotification(fullOrder);
                setToast({ message: `New Order Received - ${fullOrder.table_name || 'Table X'}`, visible: true });
                
                // Auto-hide toast after 5 seconds
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
        (payload) => {
          console.log('Realtime Live Orders request change payload received:', payload);
          loadRequests();
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
    };
  }, [restaurant, selectedOrder]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    router.replace(`/dashboard/orders?id=${order.id}`);
  };

  const updateOrderStatus = async (status: Order['status']) => {
    if (!selectedOrder || !restaurant) return;
    try {
      const updated = await db.updateOrderStatus(selectedOrder.id, status);
      setSelectedOrder(updated);
      
      const allOrders = await db.getOrders(restaurant.id);
      setOrders(allOrders);
      
      // Dispatch storage event locally
      window.dispatchEvent(new Event('storage'));
    } catch (err: any) {
      alert(`Failed to update order status: ${err.message}`);
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    try {
      await db.resolveCustomerRequest(requestId);
      setCustomerRequests(customerRequests.filter(r => r.id !== requestId));
      alert('Request marked resolved.');
    } catch (err: any) {
      alert(`Failed to resolve request: ${err.message}`);
    }
  };

  const handlePrintInvoice = () => {
    if (!selectedOrder || !restaurant) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = selectedOrder.items.map(item => `
      <tr>
        <td style="padding: 6px 0; font-weight: 600;">${item.quantity}x ${item.menu_item_name}</td>
        <td style="padding: 6px 0; text-align: right;">${formatPrice(item.price * item.quantity, restaurant.settings.currency)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - #${selectedOrder.id.slice(-5).toUpperCase()}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 20px 10px;
              color: #000;
              font-size: 12px;
              line-height: 1.4;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .header { margin-bottom: 15px; }
            .header h2 { margin: 0 0 5px 0; font-size: 16px; font-weight: bold; }
            .header p { margin: 0; }
            .footer { margin-top: 20px; font-size: 10px; }
            @media print {
              body { margin: 0; padding: 10px; width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <h2>${restaurant.name}</h2>
            <p>${restaurant.address || 'Dining QR Order System'}</p>
            <p>Tel: ${restaurant.phone || 'N/A'}</p>
          </div>
          
          <div class="divider"></div>
          
          <div>
            <p><span class="bold">Receipt ID:</span> #${selectedOrder.id.slice(-5).toUpperCase()}</p>
            <p><span class="bold">Table:</span> ${selectedOrder.table_name || 'N/A'}</p>
            <p><span class="bold">Date:</span> ${new Date(selectedOrder.created_at).toLocaleString()}</p>
            <p><span class="bold">Status:</span> ${selectedOrder.status.toUpperCase()}</p>
          </div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 5px;">Item</th>
                <th style="text-align: right; padding-bottom: 5px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table>
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">${formatPrice(selectedOrder.subtotal, restaurant.settings.currency)}</td>
            </tr>
            <tr>
              <td>GST (${restaurant.settings.gst_percentage}%):</td>
              <td class="text-right">${formatPrice(selectedOrder.gst, restaurant.settings.currency)}</td>
            </tr>
            ${selectedOrder.service_charge > 0 ? `
              <tr>
                <td>Service Charge (${restaurant.settings.service_charge_percentage}%):</td>
                <td class="text-right">${formatPrice(selectedOrder.service_charge, restaurant.settings.currency)}</td>
              </tr>
            ` : ''}
            <tr class="bold" style="font-size: 14px;">
              <td style="padding-top: 5px;">Total:</td>
              <td class="text-right" style="padding-top: 5px;">${formatPrice(selectedOrder.total, restaurant.settings.currency)}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <div class="text-center footer">
            <p>Thank you for dining with us!</p>
            <p>SmartDine QR Order App</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.table_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(i => i.menu_item_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header section with Tabs */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Live Orders & Requests</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage statuses, print bills, and resolve customer notifications in real time.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Live Orders
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Bell className="h-3.5 w-3.5" /> Customer Calls
            {customerRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white font-extrabold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {customerRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Orders Tab View */}
      {activeTab === 'orders' && (
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {/* Left Side: Order List */}
          <div className="w-full md:w-5/12 flex flex-col space-y-4 min-h-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
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

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1">
              {filteredOrders.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-slate-400 text-sm py-12 flex-col gap-2">
                  <ClipboardList className="h-8 w-8 text-slate-300" />
                  <span>No orders match this query.</span>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  return (
                    <button
                      key={order.id}
                      onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-slate-900 dark:bg-slate-800 text-white shadow-md' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-950 dark:text-white">#{order.id.slice(-5).toUpperCase()}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                          {order.table_name || 'N/A'} • {order.items.reduce((s, i) => s + i.quantity, 0)} items
                        </p>
                        <p className="text-xs truncate max-w-[200px] text-slate-500 dark:text-slate-400">
                          {order.items.map(i => i.menu_item_name).join(', ')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-extrabold text-sm">{formatPrice(order.total, restaurant.settings.currency)}</p>
                        <p className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side: Order Detail & Billing panel */}
          <div className="hidden md:flex flex-1 flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            {selectedOrder ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-955 dark:text-white text-lg">Order #{selectedOrder.id.slice(-5).toUpperCase()}</h3>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold uppercase">
                      {selectedOrder.table_name || 'N/A'} • {formatDate(selectedOrder.created_at)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1 cursor-pointer" onClick={handlePrintInvoice}>
                      <Printer className="h-4 w-4" /> Print Bill
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick Action to Update Status:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedOrder.status === 'new' && (
                        <Button size="sm" variant="primary" className="cursor-pointer" onClick={() => updateOrderStatus('accepted')}>
                          Accept Order
                        </Button>
                      )}
                      {(selectedOrder.status === 'accepted' || selectedOrder.status === 'new') && (
                        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer" onClick={() => updateOrderStatus('preparing')}>
                          Start Preparing
                        </Button>
                      )}
                      {selectedOrder.status === 'preparing' && (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer" onClick={() => updateOrderStatus('ready')}>
                          Mark Ready for Pickup
                        </Button>
                      )}
                      {selectedOrder.status === 'ready' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={() => updateOrderStatus('served')}>
                          Mark Served
                        </Button>
                      )}
                      {selectedOrder.status === 'served' && (
                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white cursor-pointer" onClick={() => updateOrderStatus('completed')}>
                          Complete Order
                        </Button>
                      )}
                      {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                        <Button size="sm" variant="danger" className="cursor-pointer" onClick={() => updateOrderStatus('cancelled')}>
                          Cancel Order
                        </Button>
                      )}
                      {(selectedOrder.status === 'completed' || selectedOrder.status === 'cancelled') && (
                        <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 py-1">
                          <AlertCircle className="h-4 w-4" /> This order has been finalized and cannot be edited.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                      {selectedOrder.items.map(item => (
                        <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{item.menu_item_name}</p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{item.quantity}x @ {formatPrice(item.price, restaurant.settings.currency)}</p>
                            {item.notes && (
                              <span className="inline-block mt-1 text-[10px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/30 font-semibold">
                                Note: {item.notes}
                              </span>
                            )}
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white">{formatPrice(item.price * item.quantity, restaurant.settings.currency)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedOrder.special_instructions && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Chef Special Instructions</h4>
                      <p className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 text-sm rounded-xl p-4 leading-relaxed font-semibold">
                        {selectedOrder.special_instructions}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 shrink-0">
                  <div className="space-y-2.5 max-w-sm ml-auto">
                    <div className="flex justify-between text-sm text-slate-500 font-semibold">
                      <span>Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal, restaurant.settings.currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500 font-semibold">
                      <span>GST ({restaurant.settings.gst_percentage}%)</span>
                      <span>{formatPrice(selectedOrder.gst, restaurant.settings.currency)}</span>
                    </div>
                    {selectedOrder.service_charge > 0 && (
                      <div className="flex justify-between text-sm text-slate-500 font-semibold">
                        <span>Service Charge ({restaurant.settings.service_charge_percentage}%)</span>
                        <span>{formatPrice(selectedOrder.service_charge, restaurant.settings.currency)}</span>
                      </div>
                    )}
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                    <div className="flex justify-between text-slate-900 dark:text-white font-black text-lg">
                      <span>Grand Total</span>
                      <span>{formatPrice(selectedOrder.total, restaurant.settings.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-12 text-slate-400 text-sm">
                <ShoppingBag className="h-10 w-10 text-slate-300 mb-2" />
                <span>Select an order from the list to manage and view bill invoices.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Requests Tab View */}
      {activeTab === 'requests' && (
        <Card className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <div className="flex-1 overflow-y-auto">
            {customerRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
                <span className="font-semibold text-slate-600 dark:text-slate-400">All customer requests resolved!</span>
                <span className="text-xs text-slate-400">Notifications from customers at tables will appear here in real time.</span>
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
                        <td className="px-6 py-4 font-extrabold text-slate-950 dark:text-white">
                          {req.table_name}
                        </td>
                        <td className="px-6 py-4">
                          {req.type === 'call_waiter' ? (
                            <Badge variant="purple">🙋 Call Waiter</Badge>
                          ) : (
                            <Badge variant="warning">💳 Request Bill</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            onClick={() => handleResolveRequest(req.id)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Mark Resolved
                          </Button>
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
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-emerald-500 animate-pop animate-fade-in">
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
