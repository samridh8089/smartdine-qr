'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db, Restaurant, Category, MenuItem, Table, CustomerRequest, Offer, isSubscriptionExpired } from '@/lib/db';
import { parsePlanSpec, PlanEntitlementSpec } from '@/lib/entitlements';
import { formatPrice } from '@/lib/utils';
import { calculateOrderTax } from '@/lib/tax';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { 
  ShoppingBag, Search, Compass, Info, X, Plus, 
  Minus, AlertCircle, AlertTriangle, CheckCircle2, ChevronRight, ChevronLeft, HelpCircle,
  Bell, CreditCard, Sparkles, ClipboardList, Calendar, UtensilsCrossed
} from 'lucide-react';

interface CustomerMenuProps {
  restaurantSlug: string;
  tableId?: string;
  isTakeaway?: boolean;
  isReservation?: boolean;
}

interface CartItem {
  menuItem: MenuItem;
  variantId?: string;
  variantName?: string;
  price?: number;
  quantity: number;
  notes?: string;
}

// Define style mappings for brand themes
const THEME_MAP = {
  emerald: {
    bg: 'bg-emerald-600',
    hoverBg: 'hover:bg-emerald-700',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900/50',
    ring: 'focus:ring-emerald-500/20 focus:border-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/20',
    lightText: 'text-emerald-700 dark:text-emerald-400',
  },
  indigo: {
    bg: 'bg-indigo-600',
    hoverBg: 'hover:bg-indigo-700',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-900/50',
    ring: 'focus:ring-indigo-500/20 focus:border-indigo-500',
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/20',
    lightText: 'text-indigo-700 dark:text-indigo-400',
  },
  rose: {
    bg: 'bg-rose-600',
    hoverBg: 'hover:bg-rose-700',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-100 dark:border-rose-900/50',
    ring: 'focus:ring-rose-500/20 focus:border-rose-500',
    lightBg: 'bg-rose-50 dark:bg-rose-950/20',
    lightText: 'text-rose-700 dark:text-rose-400',
  },
  amber: {
    bg: 'bg-amber-600',
    hoverBg: 'hover:bg-amber-700',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900/50',
    ring: 'focus:ring-amber-500/20 focus:border-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/20',
    lightText: 'text-amber-700 dark:text-amber-400',
  },
  purple: {
    bg: 'bg-purple-600',
    hoverBg: 'hover:bg-purple-700',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-900/50',
    ring: 'focus:ring-purple-500/20 focus:border-purple-500',
    lightBg: 'bg-purple-50 dark:bg-purple-950/20',
    lightText: 'text-purple-700 dark:text-purple-400',
  }
};

export default function CustomerMenu({ restaurantSlug, tableId, isTakeaway: isTakeawayProp = false, isReservation: isReservationProp = false }: CustomerMenuProps) {
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [planSpec, setPlanSpec] = useState<PlanEntitlementSpec | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [activeMergeGroup, setActiveMergeGroup] = useState<any | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Computed flags for reservation & takeaway (works either via route prop OR scanning table named Reservation/Takeaway)
  const isReservation = isReservationProp || (table?.name?.toLowerCase() === 'reservation');
  const isTakeaway = isTakeawayProp || (table?.name?.toLowerCase() === 'takeaway');
  
  // Takeaway States
  const [arrivalMinutes, setArrivalMinutes] = useState<number>(10);
  const [takeawayNotes, setTakeawayNotes] = useState<string>('');
  const [takeawayPaymentCompleted, setTakeawayPaymentCompleted] = useState<boolean>(false);
  
  // Reservation States
  const [reservationDate, setReservationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reservationTime, setReservationTime] = useState<string>('19:30');
  const [reservationGuests, setReservationGuests] = useState<number>(2);
  const [reservationName, setReservationName] = useState<string>('');
  const [reservationPhone, setReservationPhone] = useState<string>('');
  const [reservationPaymentCompleted, setReservationPaymentCompleted] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [stockMap, setStockMap] = useState<Record<string, { status: string; maxServings: number; isAvailable: boolean; isLowStock: boolean; outOfStockReasons: string[]; lowStockReasons: string[] }>>({});

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState('');

  useEffect(() => {
    if (!idempotencyKey) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, []);

  // Cart animation trigger
  const [cartBouncing, setCartBouncing] = useState(false);

  // Removed useEffect-based cart syncing to prevent race conditions

  // Item Detail Modal
  const [detailedItem, setDetailedItem] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [detailQty, setDetailQty] = useState(1);

  useEffect(() => {
    if (detailedItem && detailedItem.has_variants && detailedItem.variants && detailedItem.variants.length > 0) {
      setSelectedVariant(detailedItem.variants[0]);
    } else {
      setSelectedVariant(null);
    }
  }, [detailedItem]);

  // Notification Banners (No alert() calls)
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [staleCartNotice, setStaleCartNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 5000);
  };

  // Call Staff States
  const [callLoading, setCallLoading] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] = useState<CustomerRequest | null>(null);

  // Active Placed Order Tracking ID
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  // Offers & Promo Carousel State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);

  // Auto-play effect for offer banners slideshow
  useEffect(() => {
    if (offers.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % offers.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [offers]);

  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  // Network Recovery & Offline Auto-Sync Effect
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      setIsOffline(false);
      showToast("Network restored! Syncing offline orders...");

      if (!restaurant?.id) return;
      const queueKey = `smartdine_offline_orders_${restaurant.id}`;
      try {
        const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
        if (queue.length === 0) return;

        const remainingQueue: any[] = [];
        for (const item of queue) {
          try {
            const res = await fetch('/api/customer/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            });
            const data = await res.json();
            if (data.success && data.order) {
              sessionStorage.setItem(`smartdine_latest_order_${restaurant.id}`, data.order.id);
              localStorage.setItem(`smartdine_latest_order_${restaurant.id}`, data.order.id);
              setActiveOrderId(data.order.id);
            } else {
              remainingQueue.push(item);
            }
          } catch (err) {
            remainingQueue.push(item);
          }
        }
        localStorage.setItem(queueKey, JSON.stringify(remainingQueue));
        if (remainingQueue.length === 0) {
          showToast("All offline orders successfully synced!");
        }
      } catch (e) {}
    };

    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [restaurant?.id]);

  // Fresh QR Session Isolation & History Boundary Setup
  useEffect(() => {
    if (typeof window === 'undefined' || !restaurantSlug) return;
    try {
      const prevSlug = sessionStorage.getItem('smartdine_active_restaurant_slug');
      if (prevSlug && prevSlug !== restaurantSlug) {
        // Clear any previous restaurant transient order references
        sessionStorage.removeItem('smartdine_latest_order_id');
        localStorage.removeItem('smartdine_latest_order_id');
      }
      sessionStorage.setItem('smartdine_active_restaurant_slug', restaurantSlug);

      // Establish clean history boundary for this restaurant QR session
      window.history.replaceState({ smartdineRestaurant: restaurantSlug, isRoot: true }, '', window.location.href);
      window.history.pushState({ smartdineRestaurant: restaurantSlug, page: 'menu' }, '', window.location.href);
    } catch (e) {}
  }, [restaurantSlug]);

  // Prevent Cross-Restaurant Back Navigation & Handle Back Button Gracefully
  useEffect(() => {
    if (typeof window === 'undefined' || !restaurantSlug) return;

    const handlePopState = (e: PopStateEvent) => {
      // If modal or cart drawer is open, close drawer first and keep user on menu
      if (cartOpen) {
        setCartOpen(false);
        window.history.pushState({ smartdineRestaurant: restaurantSlug, page: 'menu' }, '', window.location.href);
        return;
      }
      if (detailedItem) {
        setDetailedItem(null);
        window.history.pushState({ smartdineRestaurant: restaurantSlug, page: 'menu' }, '', window.location.href);
        return;
      }
      if (searchQuery) {
        setSearchQuery('');
        window.history.pushState({ smartdineRestaurant: restaurantSlug, page: 'menu' }, '', window.location.href);
        return;
      }

      // Check if trying to navigate to a state belonging to a previous restaurant
      const state = e.state;
      if (!state || state.smartdineRestaurant !== restaurantSlug) {
        // Lock to current restaurant root, preventing cross-restaurant reopening
        window.history.replaceState({ smartdineRestaurant: restaurantSlug, isRoot: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [restaurantSlug, cartOpen, detailedItem, searchQuery]);

  // Load Active Order strictly scoped to THIS RESTAURANT
  useEffect(() => {
    if (!restaurant?.id) return;
    try {
      const restKey = `smartdine_latest_order_${restaurant.id}`;
      const savedId = sessionStorage.getItem(restKey) || localStorage.getItem(restKey);
      if (savedId) {
        db.getOrderById(savedId).then(o => {
          if (o && o.restaurant_id === restaurant.id && o.status !== 'completed' && o.status !== 'cancelled') {
            setActiveOrderId(savedId);
          } else {
            sessionStorage.removeItem(restKey);
            localStorage.removeItem(restKey);
            setActiveOrderId(null);
          }
        }).catch(() => {
          setActiveOrderId(null);
        });
      } else {
        setActiveOrderId(null);
      }
    } catch (e) {}
  }, [restaurant?.id]);

  // Load active request strictly scoped to this restaurant + table
  useEffect(() => {
    if (!restaurant?.id || !tableId) return;
    const reqKey = `smartdine_active_req_${restaurant.id}_${tableId}`;
    const savedReqStr = sessionStorage.getItem(reqKey);
    if (savedReqStr) {
      try {
        const savedReq = JSON.parse(savedReqStr) as CustomerRequest;
        supabase.from('customer_requests').select('*').eq('id', savedReq.id).then(({ data }) => {
          if (data && data.length > 0 && data[0].status !== 'completed') {
            setActiveRequest(data[0] as CustomerRequest);
          } else {
            sessionStorage.removeItem(reqKey);
          }
        });
      } catch (e) {
        sessionStorage.removeItem(reqKey);
      }
    }
  }, [restaurant?.id, tableId]);

  // Sync activeRequest to restaurant-scoped sessionStorage
  useEffect(() => {
    if (!restaurant?.id || !tableId) return;
    const reqKey = `smartdine_active_req_${restaurant.id}_${tableId}`;
    if (activeRequest) {
      sessionStorage.setItem(reqKey, JSON.stringify(activeRequest));
    } else {
      sessionStorage.removeItem(reqKey);
    }
  }, [activeRequest, restaurant?.id, tableId]);

  // Realtime subscription for customer request changes
  useEffect(() => {
    if (!activeRequest?.id) return;

    console.log(`Subscribing to realtime updates for customer request: ${activeRequest.id}`);
    const channel = supabase
      .channel(`customer_request_tracking_${activeRequest.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'customer_requests',
          filter: `id=eq.${activeRequest.id}`
        },
        (payload) => {
          console.log('Customer Request status update payload received:', payload.new);
          const updated = payload.new as CustomerRequest;
          setActiveRequest(updated);

          // Auto-clear notification if it becomes completed
          if (updated.status === 'completed') {
            setTimeout(() => {
              setActiveRequest(null);
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRequest?.id]);

  // Top Selling Items State
  const [topSellingItems, setTopSellingItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const rest = await db.getRestaurantBySlug(restaurantSlug);
        if (!rest) {
          setLoading(false);
          return;
        }
        setRestaurant(rest);

        const planId = (rest.subscription_plan || 'starter').toLowerCase();

        // PHASE 1: Fast Parallel Fetch of Core Menu Data
        const [cats, rawItems, tbls, fetchedOffers, planRes] = await Promise.all([
          db.getCategories(rest.id).catch(() => [] as Category[]),
          db.getMenuItems(rest.id).catch(() => [] as MenuItem[]),
          db.getTables(rest.id).catch(() => [] as Table[]),
          db.getOffers(rest.id).catch(() => [] as Offer[]),
          Promise.resolve(supabase.from('pricing_plans').select('*').eq('id', planId).maybeSingle())
        ]);

        const spec = parsePlanSpec(planRes.data || { id: planId });
        setPlanSpec(spec);

        // Table Resolution
        if (isReservation) {
          let tbl = tbls.find((t: Table) => t.name === 'Reservation');
          if (!tbl) {
            try { tbl = await db.createTable(rest.id, 'Reservation'); } catch (e) {}
          }
          if (tbl) setTable(tbl);
        } else if (isTakeaway) {
          let tbl = tbls.find((t: Table) => t.name === 'Takeaway');
          if (!tbl) {
            try { tbl = await db.createTable(rest.id, 'Takeaway'); } catch (e) {}
          }
          if (tbl) setTable(tbl);
        } else if (tableId) {
          const targetId = tableId.trim();
          const targetLower = targetId.toLowerCase();
          const matchedTbl = tbls.find((t: Table) => t.id === targetId) ||
                             tbls.find((t: Table) => (t as any).slug === targetId) ||
                             tbls.find((t: Table) => t.name?.toLowerCase() === targetLower) ||
                             tbls.find((t: Table) => t.name?.toLowerCase().replace(/\s+/g, '-') === targetLower) ||
                             tbls[0];
          if (matchedTbl) setTable(matchedTbl);
        } else if (tbls.length > 0) {
          setTable(tbls[0]);
        }

        setCategories(cats);
        setSelectedCatId('all');

        const availableItems = rawItems.filter((i: MenuItem) => i.is_available);
        setMenuItems(availableItems);
        setOffers(fetchedOffers.filter((o: Offer) => o.is_active));

        // INSTANT RENDER: Unblock loading screen immediately for sub-300ms menu paint!
        setLoading(false);

        // Cart Sync
        const savedCart = sessionStorage.getItem(`smartdine_cart_${rest.id}`);
        if (savedCart) {
          try {
            const parsedCart = JSON.parse(savedCart);
            const validCart: CartItem[] = [];
            let hasStaleItems = false;

            for (const c of parsedCart) {
              const mItem = availableItems.find((i: MenuItem) => i.id === (c.menuItem?.id || c.menuItemId));
              if (!mItem) {
                hasStaleItems = true;
                continue;
              }

              let finalVariantId = c.variantId;
              let finalVariantName = c.variantName;
              let finalPrice = c.price !== undefined && c.price !== null ? c.price : mItem.price;

              if (mItem.has_variants && mItem.variants && mItem.variants.length > 0) {
                const vMatch = mItem.variants.find((v: any) => 
                  (c.variantId && v.id === c.variantId) || 
                  (c.variantName && v.name.toLowerCase() === c.variantName.toLowerCase())
                );
                if (!vMatch || vMatch.is_available === false) {
                  hasStaleItems = true;
                  continue;
                }
                finalVariantId = vMatch.id;
                finalVariantName = vMatch.name;
                finalPrice = Number(vMatch.price);
              } else if (c.variantName) {
                hasStaleItems = true;
                continue;
              }

              validCart.push({
                menuItem: mItem,
                variantId: finalVariantId,
                variantName: finalVariantName,
                price: finalPrice,
                quantity: c.quantity || 1,
                notes: (c.notes || '').includes('[CANCELLED]') ? '' : (c.notes || '').trim()
              });
            }

            setCart(validCart);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem(`smartdine_cart_${rest.id}`, JSON.stringify(validCart));
            }

            if (hasStaleItems) {
              setStaleCartNotice(validCart.length > 0 
                ? "Some items in your cart are no longer available and were removed."
                : "Your cart items are no longer available. Please add items from the current menu.");
            }
          } catch (e) {
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem(`smartdine_cart_${rest.id}`);
            }
          }
        }

        // PHASE 2: Deferred Background Hydration (Stock Map & Top Selling Items)
        setTimeout(async () => {
          try {
            const { getRestaurantMenuStockMap } = await import('@/lib/inventoryEngine');
            const sMap = await getRestaurantMenuStockMap(rest.id);
            if (sMap?.menuStockMap) setStockMap(sMap.menuStockMap);
          } catch (e) {}

          try {
            const topItems = await db.getTopSellingItems(rest.id);
            setTopSellingItems(topItems);
          } catch (e) {}

          if (tableId && !isReservation && !isTakeaway) {
            try {
              const activeMerge = await db.getActiveMergeGroupForTable(rest.id, tableId);
              if (activeMerge) setActiveMergeGroup(activeMerge.group);
            } catch (e) {}
          }
        }, 50);

      } catch (err) {
        console.error('[CustomerMenu] loadData error:', err);
        setLoading(false);
      }
    }
    loadData();

    // Subscribe to real-time inventory, table states, and restaurant setting changes
    let invChannel: any = null;
    db.getRestaurantBySlug(restaurantSlug).then(r => {
      if (!r) return;
      invChannel = supabase
        .channel(`cust_menu_stock_${r.id}_${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `restaurant_id=eq.${r.id}` }, async () => {
          try {
            const { getRestaurantMenuStockMap } = await import('@/lib/inventoryEngine');
            const sMap = await getRestaurantMenuStockMap(r.id);
            if (sMap?.menuStockMap) setStockMap(sMap.menuStockMap);
          } catch (e) {}
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants', filter: `id=eq.${r.id}` }, async () => {
          try {
            const freshRest = await db.getRestaurantById(r.id);
            if (freshRest) {
              setRestaurant(freshRest);
              const tbls = await db.getTables(r.id);
              if (table) {
                const updatedTbl = tbls.find(t => t.id === table.id);
                if (updatedTbl) setTable(updatedTbl);
              }
            }
          } catch (e) {}
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tables', filter: `restaurant_id=eq.${r.id}` }, async () => {
          try {
            const tbls = await db.getTables(r.id);
            if (table) {
              const updatedTbl = tbls.find(t => t.id === table.id);
              if (updatedTbl) setTable(updatedTbl);
            }
          } catch (e) {}
        })
        .subscribe();
    });

    return () => {
      if (invChannel) supabase.removeChannel(invChannel);
    };
  }, [restaurantSlug, tableId, isTakeaway, isReservation]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    if (typeof window !== 'undefined' && restaurant) {
      sessionStorage.setItem(`smartdine_cart_${restaurant.id}`, JSON.stringify(newCart));
    }
    // Trigger bounce animation
    setCartBouncing(true);
    setTimeout(() => setCartBouncing(false), 300);
  };

  const isTableDisabled = Boolean(
    !isTakeaway &&
    !isReservation &&
    table &&
    (table.qr_enabled === false || (table as any).occupancy_status === 'inactive' || restaurant?.settings?.table_states?.[table.id]?.qr_enabled === false) &&
    !activeOrderId
  );

  const handleAddToCart = (item: MenuItem, qty = 1, notes = '', variantName?: string, price?: number, variantId?: string) => {
    if (isTableDisabled) {
      showToast('This table is temporarily unavailable.');
      return;
    }

    const cleanNotes = (notes || '').trim();
    if (!idempotencyKey) {
      setIdempotencyKey(crypto.randomUUID());
    }
    const finalPrice = price !== undefined && price !== null ? price : item.price;

    const sInfo = stockMap[item.id];
    if (sInfo && (!sInfo.isAvailable || sInfo.maxServings <= 0)) {
      showToast(`Item "${item.name}" is currently out of stock.`);
      return;
    }

    setCart((currentCart) => {
      const existingIndex = currentCart.findIndex(
        c => c.menuItem.id === item.id && 
             (c.notes || '').trim() === cleanNotes && 
             (c.variantName || '') === (variantName || '') &&
             (c.variantId || '') === (variantId || '')
      );

      const inCartQty = existingIndex > -1 ? currentCart[existingIndex].quantity : 0;
      const maxAllowed = sInfo ? sInfo.maxServings : 9999;

      if (inCartQty + qty > maxAllowed) {
        showToast(`Only ${maxAllowed} available in stock for "${item.name}".`);
        return currentCart;
      }

      let newCart = [...currentCart];
      if (existingIndex > -1) {
        newCart = newCart.map((c, idx) => 
          idx === existingIndex ? { ...c, quantity: c.quantity + qty } : c
        );
      } else {
        newCart.push({ menuItem: item, quantity: qty, notes: cleanNotes, variantName, variantId, price: finalPrice });
      }
      if (typeof window !== 'undefined' && restaurant) {
        sessionStorage.setItem(`smartdine_cart_${restaurant.id}`, JSON.stringify(newCart));
      }
      return newCart;
    });
    setDetailedItem(null);
    setSelectedVariant(null);
    setDetailNotes('');
    setDetailQty(1);
    setCartBouncing(true);
    setTimeout(() => setCartBouncing(false), 300);
  };

  const updateCartQty = (index: number, delta: number) => {
    setCart((currentCart) => {
      if (!currentCart[index]) return currentCart;
      const target = currentCart[index];
      const sInfo = stockMap[target.menuItem.id];
      const maxAllowed = sInfo ? sInfo.maxServings : 9999;

      if (delta > 0 && target.quantity + delta > maxAllowed) {
        showToast(`Only ${maxAllowed} available in stock for "${target.menuItem.name}".`);
        return currentCart;
      }

      let newCart = currentCart.map((c, idx) => 
        idx === index ? { ...c, quantity: c.quantity + delta } : c
      );
      if (newCart[index] && newCart[index].quantity <= 0) {
        newCart = newCart.filter((_, idx) => idx !== index);
      }
      if (typeof window !== 'undefined' && restaurant) {
        sessionStorage.setItem(`smartdine_cart_${restaurant.id}`, JSON.stringify(newCart));
      }
      return newCart;
    });
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const itemP = item.price !== undefined && item.price !== null ? item.price : item.menuItem.price;
      return sum + itemP * item.quantity;
    }, 0);
  };

  const handlePlaceOrder = async () => {
    if (!restaurant) return;
    if (!table) {
      showToast('This QR code is invalid or missing a Table association. Please ask staff for assistance.');
      return;
    }
    const isQRDisabled = Boolean(
      !isTakeaway &&
      !isReservation &&
      table &&
      (table.qr_enabled === false || (table as any).occupancy_status === 'inactive' || restaurant.settings?.table_states?.[table.id]?.qr_enabled === false) &&
      !activeOrderId
    );
    if (isQRDisabled) {
      showToast('This table is temporarily unavailable. Please contact the staff.');
      return;
    }
    if (cart.length === 0) return;

    if (isTakeaway && !takeawayPaymentCompleted) {
      showToast('Please complete the UPI payment before placing a takeaway order.');
      return;
    }
    if (isReservation && !reservationPaymentCompleted) {
      showToast('Please complete the UPI payment to confirm your table reservation.');
      return;
    }

    // Pre-checkout cart validation against fresh DB menu
    const currentAvailableItems = (await db.getMenuItems(restaurant.id)).filter(i => i.is_available);
    const validCart: CartItem[] = [];
    let cartChanged = false;

    for (const c of cart) {
      const mItem = currentAvailableItems.find(i => i.id === c.menuItem.id);
      if (!mItem) {
        cartChanged = true;
        continue;
      }
      let finalVId = c.variantId;
      let finalVName = c.variantName;
      let finalP = c.price !== undefined && c.price !== null ? c.price : mItem.price;

      if (mItem.has_variants && mItem.variants && mItem.variants.length > 0) {
        const vMatch = mItem.variants.find(v => 
          (c.variantId && v.id === c.variantId) || 
          (c.variantName && v.name.toLowerCase() === c.variantName.toLowerCase())
        );
        if (!vMatch || vMatch.is_available === false) {
          cartChanged = true;
          continue;
        }
        finalVId = vMatch.id;
        finalVName = vMatch.name;
        finalP = Number(vMatch.price);
      } else if (c.variantName) {
        cartChanged = true;
        continue;
      }

      validCart.push({
        ...c,
        menuItem: mItem,
        variantId: finalVId,
        variantName: finalVName,
        price: finalP
      });
    }

    if (cartChanged) {
      saveCart(validCart);
      if (validCart.length === 0) {
        setStaleCartNotice("Your cart items are no longer available. Please add items from the current menu.");
        setCartOpen(false);
        return;
      } else {
        setStaleCartNotice("Some items in your cart are no longer available and were removed.");
        return;
      }
    }

    // Real-Time Stock Availability Re-validation before order submission
    for (const c of validCart) {
      const sInfo = stockMap[c.menuItem.id];
      if (sInfo && (!sInfo.isAvailable || sInfo.maxServings <= 0)) {
        showToast(`Item "${c.menuItem.name}" is out of stock. Please remove it from your cart.`);
        return;
      }
      if (sInfo && c.quantity > sInfo.maxServings) {
        showToast(`Only ${sInfo.maxServings} available for "${c.menuItem.name}". Please reduce quantity.`);
        return;
      }
    }

    // OPTIMISTIC UI: Instantly disable button & close cart drawer (<5ms Visual Feedback)
    setOrderPlacing(true);
    setCartOpen(false);

    try {
      const orderPayload = cart.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        notes: item.notes || '',
        variantId: item.variantId,
        variantName: item.variantName,
        price: item.price !== undefined && item.price !== null ? item.price : item.menuItem.price
      }));

      const finalInstructions = isReservation 
        ? `TABLE RESERVATION | Date: ${reservationDate} | Time: ${reservationTime} | Guests: ${reservationGuests}${reservationName ? ` | Name: ${reservationName}` : ''}${reservationPhone ? ` | Contact: ${reservationPhone}` : ''}${specialInstructions ? ` | Notes: ${specialInstructions}` : ''}`
        : specialInstructions;

      let newOrder: any;
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('OFFLINE_NETWORK');
        }

        const res = await fetch('/api/customer/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            tableId: table.id,
            items: orderPayload,
            specialInstructions: finalInstructions,
            orderType: isReservation ? 'reservation' : isTakeaway ? 'takeaway' : 'dine_in',
            customerArrivalMinutes: isTakeaway ? arrivalMinutes : undefined,
            takeawayNotes: isTakeaway ? takeawayNotes : undefined,
            paymentStatus: (isTakeaway || isReservation) ? 'customer_marked_paid' : 'pending',
            idempotencyKey,
            offerCode: appliedOffer?.code,
            discountAmount
          })
        });

        const apiResult = await res.json();
        if (!res.ok || !apiResult.success || !apiResult.order) {
          throw new Error(apiResult.error || 'API order placement returned error');
        }
        newOrder = apiResult.order;
      } catch (apiErr: any) {
        if (apiErr.message === 'OFFLINE_NETWORK' || !navigator.onLine) {
          // OFFLINE RESILIENCE: Save to IndexedDB/localStorage Queue with Idempotency Key
          try {
            const queueKey = `smartdine_offline_orders_${restaurant.id}`;
            const existingQueue = JSON.parse(localStorage.getItem(queueKey) || '[]');
            const duplicateIndex = existingQueue.findIndex((o: any) => o.idempotencyKey === idempotencyKey);
            if (duplicateIndex === -1) {
              existingQueue.push({
                restaurantId: restaurant.id,
                tableId: table.id,
                items: orderPayload,
                specialInstructions: finalInstructions,
                orderType: isReservation ? 'reservation' : isTakeaway ? 'takeaway' : 'dine_in',
                idempotencyKey,
                queuedAt: Date.now()
              });
              localStorage.setItem(queueKey, JSON.stringify(existingQueue));
            }
          } catch (e) {}

          showToast("Network Offline. Order saved safely & will auto-sync when connection restores!");
          saveCart([]);
          setSpecialInstructions('');
          setIdempotencyKey(crypto.randomUUID());
          return;
        }

        console.warn('Fast API order placement fallback to db.createOrder:', apiErr);
        newOrder = await db.createOrder(
          restaurant.id,
          table.id,
          orderPayload,
          finalInstructions,
          isReservation ? 'reservation' : isTakeaway ? 'takeaway' : 'dine_in',
          isTakeaway ? arrivalMinutes : undefined,
          isTakeaway ? takeawayNotes : undefined,
          (isTakeaway || isReservation) ? 'customer_marked_paid' : 'pending',
          idempotencyKey,
          appliedOffer?.code,
          discountAmount
        );
      }

      // Immediate Route Navigation
      router.push(`/order-tracking/${newOrder.id}`);

      // Background Session Cleanup (non-blocking)
      try {
        sessionStorage.setItem(`smartdine_latest_order_${restaurant.id}`, newOrder.id);
        localStorage.setItem(`smartdine_latest_order_${restaurant.id}`, newOrder.id);
        sessionStorage.removeItem('smartdine_latest_order_id');
        localStorage.removeItem('smartdine_latest_order_id');
        setActiveOrderId(newOrder.id);
      } catch (e) {}
      saveCart([]);
      setSpecialInstructions('');
      setIdempotencyKey(crypto.randomUUID());

    } catch (e: any) {
      // ROLLBACK ONLY ON API FAILURE
      setCartOpen(true);
      showToast(e.message || 'Failed to place order. Please try again.');
    } finally {
      setOrderPlacing(false);
    }
  };

  // Call Staff Actions with 12s Timeout & Rollback
  const handleCallStaff = async (type: 'call_waiter' | 'request_bill') => {
    if (!restaurant || !table || callLoading) return;
    setCallLoading(true);

    const prevActiveReq = activeRequest;
    const prevReqSent = requestSent;

    // Immediate Optimistic UI feedback
    setRequestSent(type);
    const optimisticReq: any = {
      id: `opt_${Date.now()}`,
      restaurant_id: restaurant.id,
      table_id: table.id,
      type,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    setActiveRequest(optimisticReq);

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timed out after 12 seconds. Please check your network connection and try again.')), 12000)
      );

      const newRequest: any = await Promise.race([
        db.createCustomerRequest(restaurant.id, table.id, type),
        timeoutPromise
      ]);

      setActiveRequest(newRequest);
      setTimeout(() => setRequestSent(null), 4000);
    } catch (err: any) {
      // Rollback to previous state on timeout/failure
      setActiveRequest(prevActiveReq);
      setRequestSent(prevReqSent);
      showToast(err.message || 'Failed to send request. Please try again.');
    } finally {
      setCallLoading(false);
    }
  };



  // Determine active brand styling properties (fallback to emerald)
  const theme = restaurant?.settings?.theme_color && THEME_MAP[restaurant.settings.theme_color as keyof typeof THEME_MAP] 
    ? THEME_MAP[restaurant.settings.theme_color as keyof typeof THEME_MAP] 
    : THEME_MAP.emerald;

  // SKELETON RENDER ON LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 sticky top-0 z-30">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl animate-shimmer" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded animate-shimmer" />
                <div className="h-3.5 w-16 rounded animate-shimmer" />
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
          <div className="h-12 w-full rounded-2xl animate-shimmer" />
          <div className="flex gap-2 overflow-x-auto">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-9 w-20 rounded-full animate-shimmer shrink-0" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-32 w-full rounded-2xl animate-shimmer" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Restaurant Not Found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">The link you followed seems to be broken. Please scan a valid QR code on your dining table.</p>
        </div>
      </div>
    );
  }

  const isExpired = restaurant ? isSubscriptionExpired(restaurant) : false;

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md animate-pulse">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{restaurant.name}</h2>
          <div className="space-y-2 pt-2">
            <span className="inline-block px-3 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-extrabold text-xs rounded-full">
              Digital Menu Currently Inactive
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
              This restaurant's QR ordering system is offline due to subscription expiry. Please notify restaurant management to activate their subscription.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if Takeaway ordering is disabled
  if (isTakeaway && restaurant.settings && !restaurant.settings.takeaway_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md">
            <AlertCircle className="h-8 w-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Takeaway Ordering Unavailable</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Takeaway ordering is currently unavailable.</p>
        </div>
      </div>
    );
  }

  // Check plan entitlement feature gates
  if (planSpec && planSpec.features.qr_menu === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/30 shadow-md">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{restaurant.name}</h2>
          <div className="space-y-2 pt-2">
            <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 font-extrabold text-xs rounded-full uppercase tracking-wider">
              Digital QR Menu Disabled
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
              Digital QR Menu functionality is currently disabled for this restaurant's plan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isReservation && planSpec && planSpec.features.reservations === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{restaurant.name}</h2>
          <div className="space-y-2 pt-2">
            <span className="inline-block px-3 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 font-extrabold text-xs rounded-full uppercase tracking-wider">
              Table Reservations Disabled
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
              Table Reservation functionality is currently disabled for this restaurant's subscription plan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isTakeaway && planSpec && planSpec.features.takeaway === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md text-center space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          <div className="h-16 w-16 bg-purple-50 dark:bg-purple-950/20 text-purple-600 rounded-2xl flex items-center justify-center mx-auto border border-purple-100 dark:border-purple-900/30 shadow-md">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">{restaurant.name}</h2>
          <div className="space-y-2 pt-2">
            <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-extrabold text-xs rounded-full uppercase tracking-wider">
              Takeaway Ordering Disabled
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-2">
              Takeaway ordering functionality is currently disabled for this restaurant's subscription plan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filters logic
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCatId === 'all' || item.category_id === selectedCatId;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg = !vegOnly || item.is_veg;

    return matchesCategory && matchesSearch && matchesVeg;
  });

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = calculateSubtotal();

  // Calculate Offer Discount
  let discountAmount = 0;
  if (appliedOffer) {
    if (cartSubtotal >= appliedOffer.min_order_amount) {
      if (appliedOffer.discount_type === 'percentage') {
        discountAmount = parseFloat(((cartSubtotal * appliedOffer.discount_value) / 100).toFixed(2));
      } else {
        discountAmount = Math.min(appliedOffer.discount_value, cartSubtotal);
      }
    }
  }

  const taxCalc = calculateOrderTax(cartSubtotal, discountAmount, restaurant?.settings);

  const serviceChargeEnabled = restaurant?.settings?.service_charge_enabled !== false;
  const serviceChargePercentage = serviceChargeEnabled ? (restaurant?.settings?.service_charge_percentage || 0) : 0;

  const serviceCharge = parseFloat(((taxCalc.taxableAmount * serviceChargePercentage) / 100).toFixed(2));

  // Calculate custom charges
  let customChargesTotal = 0;
  const customChargesList = (restaurant?.settings?.custom_charges || [])
    .filter(c => c.enabled === true)
    .map(c => {
      const val = c.type === 'percentage'
        ? parseFloat(((taxCalc.taxableAmount * c.value) / 100).toFixed(2))
        : c.value;
      customChargesTotal += val;
      return { ...c, calculatedValue: val };
    });

  const cartTotal = parseFloat((taxCalc.grandTotal + serviceCharge + customChargesTotal).toFixed(2));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950/40 pb-24 transition-colors">
      {/* Offline Network Banner */}
      {isOffline && (
        <div className="bg-amber-500 text-white text-xs font-semibold py-1.5 px-4 text-center sticky top-0 z-50 flex items-center justify-center gap-2 shadow">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>You are currently offline. Orders will be saved locally & auto-synced on reconnect.</span>
        </div>
      )}

      {/* Cover Banner Image if present */}
      {restaurant.cover_image_url && (
        <div className="w-full h-32 md:h-44 relative shrink-0">
          <img src={restaurant.cover_image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Restaurant Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm shrink-0 sticky top-0 z-30 transition-colors">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name} 
                className="h-11 w-11 rounded-xl object-cover border border-slate-100 dark:border-slate-800 shadow-sm" 
              />
            ) : (
              <div className={`h-11 w-11 rounded-xl ${theme.lightBg} ${theme.text} font-extrabold text-lg flex items-center justify-center shadow-inner`}>
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 dark:text-white text-base md:text-lg leading-tight">{restaurant.name}</h1>
              {isReservation ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30 uppercase">
                  Table Reservation
                </span>
              ) : isTakeaway ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 uppercase">
                  Takeaway
                </span>
              ) : table ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${theme.lightBg} ${theme.lightText} border ${theme.border} uppercase`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {table.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                  View-Only Menu
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 space-y-4">

        {/* Action Bar (Call Waiter & Track Order) below restaurant header & above offer banner */}
        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 px-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            {table && !isTakeaway && planSpec?.features.call_waiter !== false && (
              <button
                onClick={() => handleCallStaff('call_waiter')}
                disabled={callLoading}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                <Bell className="h-4 w-4 text-white animate-bounce" />
                <span>Call Waiter</span>
              </button>
            )}
          </div>

          {activeOrderId && planSpec?.features.live_order_tracking !== false && (
            <Link href={`/order-tracking/${activeOrderId}`}>
              <button className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer animate-pop">
                <ClipboardList className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                <span>Track Order</span>
              </button>
            </Link>
          )}
        </div>
        
        {/* Table Temporarily Unavailable Banner when QR is disabled */}
        {isTableDisabled && (
          <div className="sticky top-2 z-50 bg-rose-600 border border-rose-700 text-white rounded-2xl p-4 flex items-center justify-between gap-3 text-xs md:text-sm font-bold shadow-2xl animate-pop">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
              </div>
              <div>
                <p className="font-extrabold text-sm md:text-base leading-tight">This table is temporarily unavailable.</p>
                <p className="text-[11px] text-rose-100 font-semibold mt-0.5">Ordering is disabled for this table. Please contact the staff.</p>
              </div>
            </div>
            <span className="shrink-0 bg-rose-800 text-[11px] font-black uppercase px-2.5 py-1 rounded-lg border border-rose-500/50">
              Disabled
            </span>
          </div>
        )}

        {/* Call Waiter confirmation alert banner */}
        {requestSent && !activeRequest && (
          <div className="bg-emerald-500 border border-emerald-400 text-white rounded-2xl p-3.5 flex items-center gap-3 text-xs md:text-sm font-bold shadow-lg animate-pop">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              {requestSent === 'call_waiter' ? 'Staff has been notified. A waiter will visit your table shortly!' : 'Bill invoice request sent! Staff will bring the printout.'}
            </div>
          </div>
        )}

        {/* Persistent active Call Waiter request card */}
        {activeRequest && (
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 shadow-lg animate-pop ${
            activeRequest.status === 'pending'
              ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 animate-pulse'
              : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                activeRequest.status === 'pending' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                <Bell className={`h-5 w-5 ${activeRequest.status === 'pending' ? 'animate-bounce' : 'animate-pulse'}`} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs md:text-sm uppercase tracking-wide">
                  {activeRequest.status === 'pending' ? 'Waiter Called' : 'Waiter is on the way'}
                </h4>
                <p className="text-[11px] font-semibold opacity-90 mt-0.5">
                  {activeRequest.status === 'pending' 
                    ? 'Staff has been notified. A waiter will visit your table shortly!' 
                    : 'A waiter has accepted your request and is coming to your table now!'}
                </p>
              </div>
            </div>
            {activeRequest.status === 'pending' && (
              <button
                onClick={async () => {
                  try {
                    await db.resolveCustomerRequest(activeRequest.id);
                    setActiveRequest(null);
                  } catch (e) {}
                }}
                className="text-xs font-bold underline cursor-pointer hover:opacity-80"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        {/* Offer Banners Carousel (Compact & Sleek) */}
        {offers.length > 0 && (
          <div className="relative w-full overflow-hidden rounded-2xl shadow-md border border-slate-200/50 dark:border-slate-800 animate-pop group">
            <div 
              className="flex transition-transform duration-700 ease-in-out w-full"
              style={{ transform: `translateX(-${currentSlideIndex * 100}%)` }}
            >
              {offers.map((off) => (
                <div 
                  key={off.id}
                  className={`w-full min-w-full shrink-0 px-4 py-3 text-white relative overflow-hidden flex items-center justify-between gap-3 min-h-[75px] ${
                    off.banner_url ? '' : `bg-gradient-to-r ${off.bg_gradient || 'from-slate-950 via-purple-950 to-slate-900'}`
                  }`}
                >
                  {off.banner_url && (
                    <div className="absolute inset-0 z-0">
                      <img src={off.banner_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/70 to-transparent" />
                    </div>
                  )}

                  <div className="relative z-10 space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md text-amber-200 border border-white/20">
                        <Sparkles className="h-2.5 w-2.5" /> {off.code}
                      </span>
                      <span className="text-[10px] font-bold text-amber-200 bg-black/40 px-2 py-0.5 rounded-md">
                        {off.min_order_amount > 0 ? `Min ₹${off.min_order_amount}` : 'No Min'}
                      </span>
                    </div>
                    <h3 className="text-xs md:text-sm font-black tracking-tight truncate drop-shadow-sm">{off.title}</h3>
                  </div>

                  <button
                    onClick={() => {
                      setAppliedOffer(off);
                      if (cart.length > 0) {
                        setCartOpen(true);
                      }
                    }}
                    className={`relative z-10 shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-sm cursor-pointer flex items-center gap-1 ${
                      appliedOffer?.id === off.id
                        ? 'bg-emerald-400 text-slate-950 font-extrabold'
                        : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:scale-105'
                    }`}
                  >
                    {appliedOffer?.id === off.id ? '✓ Applied' : 'Apply →'}
                  </button>
                </div>
              ))}
            </div>

            {/* Left & Right Carousel Arrow Buttons */}
            {offers.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev === 0 ? offers.length - 1 : prev - 1))}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/20"
                  aria-label="Previous Slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setCurrentSlideIndex(prev => (prev + 1) % offers.length)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer border border-white/20"
                  aria-label="Next Slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Floating Toast Notification (No Browser Alerts!) */}
        {toastNotice && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs font-extrabold border border-slate-700 animate-bounce">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-400 shrink-0" />
              <span>{toastNotice}</span>
            </div>
            <button onClick={() => setToastNotice(null)} className="p-1 hover:bg-slate-800 rounded-lg cursor-pointer">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        )}

        {/* Stale Cart Warning Banner */}
        {staleCartNotice && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3.5 flex items-start justify-between gap-3 text-amber-800 dark:text-amber-200 text-xs font-bold animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{staleCartNotice}</span>
            </div>
            <button 
              onClick={() => setStaleCartNotice(null)}
              className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-lg text-amber-600 dark:text-amber-400 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Table Inactive / QR Disabled Banner */}
        {table && !isTakeaway && !isReservation && table.qr_enabled === false && !activeOrderId && (
          <div className="bg-slate-900 text-amber-300 border-2 border-amber-500/50 rounded-2xl p-4 flex items-center gap-3 text-xs font-black shadow-lg animate-pulse">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-black text-white">Table Temporarily Inactive</p>
              <p className="text-amber-300 font-semibold mt-0.5">This table is temporarily unavailable. Please contact the staff.</p>
            </div>
          </div>
        )}

        {/* Welcome/Table Prompt if view-only */}
        {!table && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 rounded-2xl p-4 flex items-start gap-3 text-xs leading-relaxed font-semibold">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              You are currently browsing the digital menu. To place order tickets directly to the kitchen, please scan the QR code located on your table.
            </div>
          </div>
        )}

        {/* Table Reservation Input Card */}
        {isReservation && (
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-extrabold text-indigo-950 dark:text-indigo-200 text-sm md:text-base">Reserve Your Table</h3>
                <p className="text-xs text-indigo-600/80 dark:text-indigo-400">Select date, time & number of guests. Pre-order your dishes below (optional).</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">Time</label>
                <input
                  type="time"
                  value={reservationTime}
                  onChange={(e) => setReservationTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">Guests</label>
                <select
                  value={reservationGuests}
                  onChange={(e) => setReservationGuests(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value={1}>1 Guest</option>
                  <option value={2}>2 Guests</option>
                  <option value={4}>4 Guests</option>
                  <option value={6}>6 Guests</option>
                  <option value={8}>8+ Guests</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">Guest Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={reservationName}
                  onChange={(e) => setReservationName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs md:text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">Mobile Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={reservationPhone}
                  onChange={(e) => setReservationPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs md:text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Top Selling Items Section (Appears FIRST, above categories, open by default) */}
        {topSellingItems.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white text-base">Top Selling & Popular Choices</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Most loved dishes ordered by customers</p>
                </div>
              </div>
              <Badge variant="warning" className="font-extrabold text-[10px] uppercase tracking-wider py-1 px-2.5">
                Popular
              </Badge>
            </div>

            <div className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-none shrink-0 -mx-1 px-1">
              {topSellingItems.map((item) => {
                const inCartQty = cart
                  .filter(c => c.menuItem.id === item.id)
                  .reduce((sum, c) => sum + c.quantity, 0);

                return (
                  <div 
                    key={item.id}
                    className="w-48 shrink-0 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-full h-28 relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">
                            <UtensilsCrossed className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-white shadow-md ${item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                          {item.is_veg ? 'VEG' : 'NON-VEG'}
                        </span>
                      </div>
                      <div className="p-3">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-xs line-clamp-1">{item.name}</h4>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          {formatPrice(item.price, restaurant?.settings?.currency)}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 pt-0">
                      {(() => {
                        const hasPortions = Boolean(item.has_variants && item.variants && item.variants.length > 0);
                        if (hasPortions) {
                          return (
                            <button
                              onClick={() => setDetailedItem(item)}
                              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                            >
                              <span>Customize</span>
                            </button>
                          );
                        }
                        if (inCartQty > 0) {
                          return (
                            <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl p-1 px-2 font-bold text-xs">
                              <button
                                onClick={() => {
                                  const idx = cart.findIndex(c => c.menuItem.id === item.id);
                                  if (idx > -1) updateCartQty(idx, -1);
                                }}
                                className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span>{inCartQty}</span>
                              <button
                                onClick={() => handleAddToCart(item, 1)}
                                className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        }
                        if (isTableDisabled) {
                          return (
                            <button
                              disabled
                              className="w-full py-2 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed"
                            >
                              Unavailable
                            </button>
                          );
                        }

                        return (
                          <button
                            onClick={() => handleAddToCart(item, 1)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>ADD</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Veg Toggle - Contrast fixed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 border-t dark:border-slate-800 sm:border-t-0 pt-2.5 sm:pt-0 shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Vegetarian Only</span>
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${
                vegOnly ? 'bg-emerald-500 justify-end' : 'bg-slate-200 dark:bg-slate-800 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 shadow-sm mx-0.5" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 -mx-4 px-4">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border cursor-pointer transition-all ${
              selectedCatId === 'all'
                ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border cursor-pointer transition-all ${
                selectedCatId === cat.id
                  ? `${theme.bg} border-transparent text-white shadow-sm`
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Food Items list */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No dishes found matching your selection.
            </div>
          ) : (
            filteredItems.map(item => {
              const sInfo = stockMap[item.id];
              const isOutOfStock = (sInfo && (!sInfo.isAvailable || sInfo.maxServings <= 0)) || item.is_available === false;
              const isLowStock = sInfo && sInfo.isLowStock && !isOutOfStock;

              return (
              <Card 
                key={item.id} 
                className={`overflow-hidden hover:shadow-md dark:border-slate-800 transition-all duration-300 flex items-stretch min-h-[140px] cursor-pointer hover:scale-101 animate-fade-in ${
                  isOutOfStock ? 'opacity-70 bg-slate-50/60 dark:bg-slate-900/60' : ''
                }`}
                onClick={() => setDetailedItem(item)}
              >
                {/* Details */}
                <div className="flex-1 p-4 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={item.is_veg ? 'veg' : 'non-veg'}>
                        {item.is_veg ? 'Veg' : 'Non-Veg'}
                      </Badge>
                      {isOutOfStock && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                          Out of Stock
                        </span>
                      )}
                      {isLowStock && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30">
                          Only {sInfo.maxServings} left
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-slate-950 dark:text-white text-base">{item.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-extrabold text-slate-950 dark:text-white text-base">{formatPrice(item.price, restaurant.settings.currency)}</span>
                    {table && (() => {
                      if (isOutOfStock) {
                        return (
                          <Button
                            size="sm"
                            disabled
                            className="h-8 shadow-sm bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-extrabold text-xs px-3.5 cursor-not-allowed opacity-60"
                          >
                            Out of Stock
                          </Button>
                        );
                      }

                      const hasPortions = Boolean(item.has_variants && item.variants && item.variants.length > 0);
                      if (hasPortions) {
                        return (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailedItem(item);
                            }}
                            className={`h-8 shadow-sm ${theme.bg} ${theme.hoverBg} text-white cursor-pointer ripple font-extrabold text-xs px-3.5`}
                          >
                            Customize
                          </Button>
                        );
                      }

                      const inCartQty = cart
                        .filter(c => c.menuItem.id === item.id)
                        .reduce((sum, c) => sum + c.quantity, 0);

                      if (inCartQty > 0) {
                        return (
                          <div 
                            onClick={(e) => e.stopPropagation()} 
                            className="flex items-center border border-emerald-600 dark:border-emerald-500 rounded-lg overflow-hidden bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                const idx = cart.findIndex(c => c.menuItem.id === item.id);
                                if (idx > -1) updateCartQty(idx, -1);
                              }}
                              className="px-2 py-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2.5 font-black text-slate-900 dark:text-white">{inCartQty}</span>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item, 1)}
                              className="px-2 py-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      }

                      if (isTableDisabled) {
                        return (
                          <Button
                            size="sm"
                            disabled
                            className="h-8 shadow-sm bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-extrabold text-xs px-2.5 cursor-not-allowed"
                          >
                            Unavailable
                          </Button>
                        );
                      }

                      return (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item, 1);
                          }}
                          className={`h-8 shadow-sm ${theme.bg} ${theme.hoverBg} text-white cursor-pointer ripple font-extrabold text-xs px-3.5`}
                        >
                          Add +
                        </Button>
                      );
                    })()}
                  </div>
                </div>

                {/* Thumbnail Image */}
                {item.image_url && (
                  <div className="w-28 sm:w-36 shrink-0 relative border-l border-slate-100 dark:border-slate-800">
                    <img 
                      src={item.image_url} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </Card>
            );})
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar / Disabled Table Alert Bar */}
      {table && (
        isTableDisabled ? (
          <div className="fixed bottom-0 inset-x-0 bg-rose-600 text-white border-t border-rose-700 shadow-2xl p-4 z-50 animate-slide-up">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertTriangle className="h-5 w-5 text-white animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold leading-tight truncate">Table Temporarily Unavailable</p>
                  <p className="text-[11px] text-rose-100 font-medium truncate">Ordering is currently disabled for this table.</p>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-rose-800 text-white rounded-xl text-xs font-black shrink-0 border border-rose-500/40">
                Disabled
              </span>
            </div>
          </div>
        ) : cart.length > 0 && (
          <div className={`fixed bottom-0 inset-x-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-xl p-4 z-40 ${
            cartBouncing ? 'animate-bounce' : ''
          }`}>
            <div className="max-w-md mx-auto flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Your Order Basket</span>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {cartCount} item{cartCount > 1 ? 's' : ''} • {formatPrice(cartTotal, restaurant.settings.currency)}
                </p>
              </div>
              <Button 
                className={`px-6 gap-2 ${theme.bg} ${theme.hoverBg} text-white cursor-pointer`}
                onClick={() => setCartOpen(true)}
              >
                <ShoppingBag className="h-4.5 w-4.5" />
                View Cart
              </Button>
            </div>
          </div>
        )
      )}

      {/* --- Item Detail & Notes Modal --- */}
      <Dialog
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        title={detailedItem?.name || ''}
        footer={
          table ? (() => {
            const modalStock = detailedItem ? stockMap[detailedItem.id] : null;
            const modalOutOfStock = (modalStock && (!modalStock.isAvailable || modalStock.maxServings <= 0)) || detailedItem?.is_available === false;
            const modalMax = modalStock ? modalStock.maxServings : 9999;

            if (modalOutOfStock) {
              return (
                <div className="w-full">
                  <Button disabled variant="secondary" className="w-full opacity-60 cursor-not-allowed">
                    Currently Out of Stock
                  </Button>
                </div>
              );
            }

            return (
              <div className="flex items-center justify-between w-full">
                {/* Quantity Selector */}
                <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="px-4 text-sm font-black text-slate-950 dark:text-white">{detailQty}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (detailQty + 1 > modalMax) {
                        showToast(`Only ${modalMax} available in stock.`);
                        return;
                      }
                      setDetailQty(detailQty + 1);
                    }}
                    className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <Button 
                  className={`${theme.bg} ${theme.hoverBg} text-white cursor-pointer`}
                  onClick={() => {
                    if (detailedItem) {
                      const price = selectedVariant ? selectedVariant.price : detailedItem.price;
                      const vName = selectedVariant ? selectedVariant.name : undefined;
                      const vId = selectedVariant ? selectedVariant.id : undefined;
                      handleAddToCart(detailedItem, detailQty, detailNotes, vName, price, vId);
                    }
                  }}
                >
                  Add to Cart • {detailedItem ? formatPrice((selectedVariant ? selectedVariant.price : detailedItem.price) * detailQty, restaurant.settings.currency) : ''}
                </Button>
              </div>
            );
          })() : (
            <Button variant="secondary" onClick={() => setDetailedItem(null)} className="w-full cursor-pointer">Close</Button>
          )
        }
      >
        <div className="space-y-4">
          {detailedItem?.image_url && (
            <img 
              src={detailedItem.image_url} 
              alt={detailedItem.name} 
              className="w-full h-48 object-cover rounded-xl border border-slate-100 dark:border-slate-800"
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={detailedItem?.is_veg ? 'veg' : 'non-veg'}>
                {detailedItem?.is_veg ? 'Veg' : 'Non-Veg'}
              </Badge>
              <span className="font-extrabold text-slate-950 dark:text-white text-base">
                {detailedItem ? formatPrice(selectedVariant ? selectedVariant.price : detailedItem.price, restaurant.settings.currency) : ''}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {detailedItem?.description || 'No description available for this dish.'}
            </p>
          </div>

          {/* Portion Choices Selector */}
          {detailedItem?.has_variants && detailedItem.variants && detailedItem.variants.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Choose Portion / Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {detailedItem.variants.map((v) => {
                  const isSelected = selectedVariant?.name === v.name;
                  return (
                    <button
                      key={v.id || v.name}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? `${theme.border} ${theme.lightBg} ring-2 ${theme.ring}`
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{v.name}</div>
                      <div className={`text-xs font-black mt-0.5 ${theme.text}`}>
                        {formatPrice(v.price, restaurant.settings.currency)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {table && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Special Requests / Notes</label>
              <input
                type="text"
                placeholder="e.g. Extra spicy, no mayonnaise, gluten free"
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          )}
        </div>
      </Dialog>

      {/* --- Cart Bottom Sheet Modal --- */}
      <Dialog
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Review Your Basket"
        footer={
          (() => {
            const isQRDisabled = Boolean(
              !isTakeaway &&
              !isReservation &&
              table &&
              (table.qr_enabled === false || (table as any).occupancy_status === 'inactive' || restaurant?.settings?.table_states?.[table.id]?.qr_enabled === false) &&
              !activeOrderId
            );

            return (
              <div className="flex flex-col gap-3 w-full">
                {isQRDisabled && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl p-3 flex items-center gap-2.5 text-rose-800 dark:text-rose-200 text-xs font-bold">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>This table is temporarily unavailable. Please contact the staff.</span>
                  </div>
                )}
                <Button 
                  className={`w-full py-3 text-base font-extrabold cursor-pointer ${
                    (isTakeaway && !takeawayPaymentCompleted) || isQRDisabled
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800'
                      : theme.bg + ' ' + theme.hoverBg + ' text-white'
                  }`}
                  onClick={handlePlaceOrder}
                  isLoading={orderPlacing}
                  disabled={(isTakeaway && !takeawayPaymentCompleted) || isQRDisabled}
                >
                  {isQRDisabled
                    ? 'Table Temporarily Unavailable'
                    : isReservation
                    ? `Confirm Table Reservation • ${formatPrice(cartTotal, restaurant.settings.currency)}`
                    : isTakeaway
                    ? `Pay ${formatPrice(cartTotal, restaurant.settings.currency)} & Place Order`
                    : `Place Order ticket • ${formatPrice(cartTotal, restaurant.settings.currency)}`}
                </Button>
              </div>
            );
          })()
        }
      >
        <div className="space-y-5 animate-slide-up">
          {/* Cart Items list */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 max-h-[30vh] overflow-y-auto">
            {cart.map((item, idx) => {
              const itemP = item.price !== undefined && item.price !== null ? item.price : item.menuItem.price;
              return (
                <div key={`${item.menuItem.id}-${item.variantName || 'base'}-${idx}`} className="p-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs md:text-sm truncate">
                      {item.menuItem.name}
                    </p>
                    {item.variantName && (
                      <span className="inline-block text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md mt-0.5">
                        {item.variantName}
                      </span>
                    )}
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {formatPrice(itemP, restaurant.settings.currency)} × {item.quantity}
                    </p>
                    {(() => {
                      const cleanNote = (item.notes || '').trim();
                      if (!cleanNote || cleanNote.includes('[CANCELLED]')) return null;
                      return (
                        <span className="inline-block text-[9px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded font-semibold mt-1">
                          Note: {cleanNote}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-extrabold text-slate-900 dark:text-white text-xs md:text-sm">
                      {formatPrice(itemP * item.quantity, restaurant.settings.currency)}
                    </span>
                  
                  {/* Qty edit */}
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, -1)}
                      className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-black text-slate-950 dark:text-white">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, 1)}
                      className="px-2 py-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>

          {/* Cooking Instructions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Chef Special Instructions</label>
            <textarea
              placeholder="e.g. Please bring all food together. Keep drinks cold."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3.5 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[60px]"
            />
          </div>

          {/* Takeaway Arrival & Notes */}
          {isTakeaway && (
            <div className="space-y-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estimated Arrival Time</label>
                <select
                  value={arrivalMinutes}
                  onChange={(e) => setArrivalMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                >
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={20}>20 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Takeaway Arrival Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Package sauces separately, I'll arrive in a red car"
                  value={takeawayNotes}
                  onChange={(e) => setTakeawayNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Professional Warning message */}
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-3.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400 leading-relaxed">
                Please complete payment before placing a takeaway order.
                If you prefer to pay at the restaurant, kindly visit the restaurant and place your order in person.
              </div>

              {/* UPI prepaid billing card */}
              {restaurant.settings.payment_enabled && restaurant.settings.upi_id ? (
                <div className="border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Prepaid UPI Transfer</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-[9px] font-black border border-purple-100 dark:border-purple-900/30 uppercase">
                      Prepaid Only
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-lg">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold">UPI NAME</p>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{restaurant.settings.upi_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold">UPI ID</p>
                      <p className="text-xs font-mono font-black text-slate-800 dark:text-white mt-0.5">{restaurant.settings.upi_id}</p>
                    </div>
                  </div>

                  <a
                    href={`upi://pay?pa=${encodeURIComponent(restaurant.settings.upi_id || '')}&pn=${encodeURIComponent(restaurant.settings.upi_name || restaurant.name)}&am=${cartTotal}&cu=INR`}
                    onClick={() => setTakeawayPaymentCompleted(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay {formatPrice(cartTotal, restaurant.settings.currency)} Now
                  </a>
                  
                  <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={takeawayPaymentCompleted}
                      onChange={(e) => setTakeawayPaymentCompleted(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-350 text-purple-600 focus:ring-purple-500/20 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-500 leading-tight">
                      I have completed the UPI payment transfer of {formatPrice(cartTotal, restaurant.settings.currency)}
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4 text-xs font-bold text-rose-700 dark:text-rose-400">
                  Online payment is currently not configured for this restaurant. Please contact restaurant staff to pay in person.
                </div>
              )}
            </div>
          )}

          {/* Reservation Payment Section */}
          {isReservation && (
            <div className="space-y-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400 leading-relaxed">
                Please complete UPI payment to confirm your table reservation and pre-ordered dishes.
              </div>

              {restaurant.settings.payment_enabled && restaurant.settings.upi_id ? (
                <div className="border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reservation Payment</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 text-[9px] font-black border border-indigo-100 dark:border-indigo-900/30 uppercase">
                      Required
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-3 rounded-lg">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold">UPI NAME</p>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{restaurant.settings.upi_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-bold">UPI ID</p>
                      <p className="text-xs font-mono font-black text-slate-800 dark:text-white mt-0.5">{restaurant.settings.upi_id}</p>
                    </div>
                  </div>

                  <a
                    href={`upi://pay?pa=${encodeURIComponent(restaurant.settings.upi_id || '')}&pn=${encodeURIComponent(restaurant.settings.upi_name || restaurant.name)}&am=${cartTotal}&cu=INR`}
                    onClick={() => setReservationPaymentCompleted(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay {formatPrice(cartTotal, restaurant.settings.currency)} Now
                  </a>
                  
                  <label className="flex items-start gap-2.5 pt-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={reservationPaymentCompleted}
                      onChange={(e) => setReservationPaymentCompleted(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-350 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-500 leading-tight">
                      I have completed the UPI payment transfer of {formatPrice(cartTotal, restaurant.settings.currency)}
                    </span>
                  </label>
                </div>
              ) : (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-4 text-xs font-bold text-rose-700 dark:text-rose-400">
                  Online payment is currently not configured for this restaurant. Please contact restaurant staff to pay in person.
                </div>
              )}
            </div>
          )}

          {/* Apply Promo Code / Offers Section */}
          {offers.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Apply Available Offer
              </label>
              <div className="space-y-2">
                {offers.map(off => {
                  const isEligible = cartSubtotal >= off.min_order_amount;
                  const isApplied = appliedOffer?.id === off.id;

                  return (
                    <div 
                      key={off.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isApplied 
                          ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800' 
                          : isEligible 
                          ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800' 
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-900 opacity-65'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-[11px] text-slate-900 dark:text-white uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200/50">
                            {off.code}
                          </span>
                          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {off.discount_type === 'percentage' ? `${off.discount_value}% OFF` : `₹${off.discount_value} OFF`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {off.title} {off.min_order_amount > 0 ? `(Min order ₹${off.min_order_amount})` : ''}
                        </p>
                      </div>

                      {isApplied ? (
                        <button
                          onClick={() => setAppliedOffer(null)}
                          className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer underline"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => setAppliedOffer(off)}
                          disabled={!isEligible}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isEligible 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' 
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isEligible ? 'Apply' : `Add ₹${(off.min_order_amount - cartSubtotal).toFixed(0)} more`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pricing Summary */}
          <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span>Subtotal</span>
              <span>{formatPrice(taxCalc.subtotal, restaurant.settings.currency)}</span>
            </div>
            {appliedOffer && taxCalc.discountTotal > 0 && (
              <div className="flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span>Discount ({appliedOffer.code})</span>
                <span>-{formatPrice(taxCalc.discountTotal, restaurant.settings.currency)}</span>
              </div>
            )}
            {taxCalc.discountTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold border-t border-slate-100 dark:border-slate-800/60 pt-1">
                <span>Taxable Amount</span>
                <span>{formatPrice(taxCalc.taxableAmount, restaurant.settings.currency)}</span>
              </div>
            )}
            {taxCalc.taxTypeSnapshot === 'cgst_sgst' && taxCalc.taxTotal > 0 && (
              <>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>CGST ({taxCalc.cgstPercentage}%)</span>
                  <span>{formatPrice(taxCalc.cgstAmount, restaurant.settings.currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  <span>SGST ({taxCalc.sgstPercentage}%)</span>
                  <span>{formatPrice(taxCalc.sgstAmount, restaurant.settings.currency)}</span>
                </div>
              </>
            )}
            {taxCalc.taxTypeSnapshot === 'igst' && taxCalc.taxTotal > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>IGST ({taxCalc.igstPercentage}%)</span>
                <span>{formatPrice(taxCalc.igstAmount, restaurant.settings.currency)}</span>
              </div>
            )}
            {serviceChargeEnabled && serviceCharge > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Service Charge ({restaurant.settings.service_charge_percentage}%)</span>
                <span>{formatPrice(serviceCharge, restaurant.settings.currency)}</span>
              </div>
            )}
            {customChargesList.map(charge => (
              <div key={charge.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>{charge.name}</span>
                <span>{formatPrice(charge.calculatedValue, restaurant.settings.currency)}</span>
              </div>
            ))}
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm md:text-base">
              <span>Grand Total</span>
              <span>{formatPrice(cartTotal, restaurant.settings.currency)}</span>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
