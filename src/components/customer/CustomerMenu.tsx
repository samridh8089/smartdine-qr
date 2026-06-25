'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Restaurant, Category, MenuItem, Table } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { 
  ShoppingBag, Search, Compass, Info, X, Plus, 
  Minus, AlertCircle, CheckCircle2, ChevronRight, HelpCircle,
  Bell, CreditCard, Sparkles
} from 'lucide-react';

interface CustomerMenuProps {
  restaurantSlug: string;
  tableId?: string;
}

interface CartItem {
  menuItem: MenuItem;
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

export default function CustomerMenu({ restaurantSlug, tableId }: CustomerMenuProps) {
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);

  // Cart animation trigger
  const [cartBouncing, setCartBouncing] = useState(false);

  // Item Detail Modal
  const [detailedItem, setDetailedItem] = useState<MenuItem | null>(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [detailQty, setDetailQty] = useState(1);

  // Call Staff States
  const [callLoading, setCallLoading] = useState(false);
  const [requestSent, setRequestSent] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const rest = await db.getRestaurantBySlug(restaurantSlug);
      if (!rest) {
        setLoading(false);
        return;
      }
      setRestaurant(rest);

      if (tableId) {
        const tbls = await db.getTables(rest.id);
        const tbl = tbls.find(t => t.id === tableId);
        if (tbl) setTable(tbl);
      }

      const cats = await db.getCategories(rest.id);
      setCategories(cats);
      // Requirement 14: Default category is always 'All Items'
      setSelectedCatId('all');

      const items = (await db.getMenuItems(rest.id)).filter(i => i.is_available);
      setMenuItems(items);

      setLoading(false);

      const savedCart = sessionStorage.getItem(`smartdine_cart_${rest.id}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    }
    loadData();
  }, [restaurantSlug, tableId]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    if (restaurant) {
      sessionStorage.setItem(`smartdine_cart_${restaurant.id}`, JSON.stringify(newCart));
    }
    // Trigger bounce animation
    setCartBouncing(true);
    setTimeout(() => setCartBouncing(false), 300);
  };

  const handleAddToCart = (item: MenuItem, qty = 1, notes = '') => {
    const existingIndex = cart.findIndex(c => c.menuItem.id === item.id && c.notes === notes);
    let newCart = [...cart];

    if (existingIndex > -1) {
      newCart[existingIndex].quantity += qty;
    } else {
      newCart.push({ menuItem: item, quantity: qty, notes });
    }

    saveCart(newCart);
    setDetailedItem(null);
    setDetailNotes('');
    setDetailQty(1);
  };

  const updateCartQty = (index: number, delta: number) => {
    let newCart = [...cart];
    newCart[index].quantity += delta;
    
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    }

    saveCart(newCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    if (!restaurant) return;
    if (!table) {
      alert('This QR code is invalid or missing a Table association. Please ask staff for assistance.');
      return;
    }
    if (cart.length === 0) return;

    setOrderPlacing(true);

    try {
      const orderPayload = cart.map(item => ({
        menuItemId: item.menuItem.id,
        quantity: item.quantity,
        notes: item.notes
      }));

      const newOrder = await db.createOrder(
        restaurant.id,
        table.id,
        orderPayload,
        specialInstructions
      );

      saveCart([]);
      setSpecialInstructions('');
      setCartOpen(false);

      // Redirect to Order Tracking screen
      router.push(`/order-tracking/${newOrder.id}`);
    } catch (e: any) {
      alert(e.message || 'Failed to place order');
    } finally {
      setOrderPlacing(false);
    }
  };

  // Call Staff Actions
  const handleCallStaff = async (type: 'call_waiter' | 'request_bill') => {
    if (!restaurant || !table) return;
    setCallLoading(true);
    try {
      await db.createCustomerRequest(restaurant.id, table.id, type);
      setRequestSent(type);
      setTimeout(() => setRequestSent(null), 4000);
    } catch (err: any) {
      alert('Failed to send request: ' + err.message);
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
  const gst = parseFloat(((cartSubtotal * (restaurant.settings.gst_percentage || 0)) / 100).toFixed(2));
  const serviceCharge = parseFloat(((cartSubtotal * (restaurant.settings.service_charge_percentage || 0)) / 100).toFixed(2));
  const cartTotal = parseFloat((cartSubtotal + gst + serviceCharge).toFixed(2));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950/40 pb-24 transition-colors">
      {/* Cover Banner Image if present */}
      {restaurant.cover_image_url && (
        <div className="w-full h-32 md:h-44 relative shrink-0">
          <img src={restaurant.cover_image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Restaurant Banner Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shadow-sm shrink-0 sticky top-0 z-30 transition-colors">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name} 
                className="h-12 w-12 rounded-xl object-cover border border-slate-100 dark:border-slate-800 shadow-sm" 
              />
            ) : (
              <div className={`h-12 w-12 rounded-xl ${theme.lightBg} ${theme.text} font-extrabold text-lg flex items-center justify-center shadow-inner`}>
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 dark:text-white text-base md:text-lg">{restaurant.name}</h1>
              {table ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${theme.lightBg} ${theme.lightText} border ${theme.border} mt-1 uppercase`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {table.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-855 text-slate-500 mt-1 uppercase">
                  View-Only Menu
                </span>
              )}
            </div>
          </div>

          {/* Call waiter & Bill action keys (Staff Portal Caller) */}
          {table && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCallStaff('call_waiter')}
                disabled={callLoading}
                className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
                title="Call Waiter"
              >
                <Bell className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => handleCallStaff('request_bill')}
                disabled={callLoading}
                className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer"
                title="Request Bill Receipt"
              >
                <CreditCard className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Body content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Call Waiter confirmation alert banner */}
        {requestSent && (
          <div className="bg-emerald-500 border border-emerald-400 text-white rounded-2xl p-4 flex items-center gap-3 text-xs md:text-sm font-bold shadow-lg animate-pop">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              {requestSent === 'call_waiter' ? 'Staff has been notified. A waiter will visit your table shortly!' : 'Bill invoice request sent! Staff will bring the printout.'}
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
            filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="overflow-hidden hover:shadow-md dark:border-slate-800 transition-all duration-300 flex items-stretch min-h-[140px] cursor-pointer hover:scale-101 animate-fade-in"
                onClick={() => setDetailedItem(item)}
              >
                {/* Details */}
                <div className="flex-1 p-4 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={item.is_veg ? 'veg' : 'non-veg'}>
                        {item.is_veg ? 'Veg' : 'Non-Veg'}
                      </Badge>
                    </div>
                    <h3 className="font-extrabold text-slate-950 dark:text-white text-base">{item.name}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-extrabold text-slate-950 dark:text-white text-base">{formatPrice(item.price, restaurant.settings.currency)}</span>
                    {table && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(item, 1);
                        }}
                        className={`h-8 shadow-sm ${theme.bg} ${theme.hoverBg} text-white cursor-pointer ripple`}
                      >
                        Add +
                      </Button>
                    )}
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
            ))
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {table && cart.length > 0 && (
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
      )}

      {/* --- Item Detail & Notes Modal --- */}
      <Dialog
        isOpen={!!detailedItem}
        onClose={() => setDetailedItem(null)}
        title={detailedItem?.name || ''}
        footer={
          table ? (
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
                  onClick={() => setDetailQty(detailQty + 1)}
                  className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button 
                className={`${theme.bg} ${theme.hoverBg} text-white cursor-pointer`}
                onClick={() => detailedItem && handleAddToCart(detailedItem, detailQty, detailNotes)}
              >
                Add to Cart • {detailedItem ? formatPrice(detailedItem.price * detailQty, restaurant.settings.currency) : ''}
              </Button>
            </div>
          ) : (
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
              <span className="font-extrabold text-slate-950 dark:text-white text-base">{detailedItem ? formatPrice(detailedItem.price, restaurant.settings.currency) : ''}</span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              {detailedItem?.description || 'No description available for this dish.'}
            </p>
          </div>

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
          <div className="flex flex-col gap-3 w-full">
            <Button 
              className={`w-full py-3 text-base font-extrabold cursor-pointer ${theme.bg} ${theme.hoverBg} text-white`}
              onClick={handlePlaceOrder}
              isLoading={orderPlacing}
            >
              Place Order ticket • {formatPrice(cartTotal, restaurant.settings.currency)}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 animate-slide-up">
          {/* Cart Items list */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 max-h-[30vh] overflow-y-auto">
            {cart.map((item, idx) => (
              <div key={`${item.menuItem.id}-${idx}`} className="p-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-xs md:text-sm truncate">{item.menuItem.name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatPrice(item.menuItem.price, restaurant.settings.currency)} each</p>
                  {item.notes && (
                    <span className="inline-block text-[9px] text-rose-500 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 px-1.5 py-0.5 rounded font-semibold mt-1">
                      Note: {item.notes}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-extrabold text-slate-900 dark:text-white text-xs md:text-sm">
                    {formatPrice(item.menuItem.price * item.quantity, restaurant.settings.currency)}
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
            ))}
          </div>

          {/* Cooking Instructions */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Chef Special Instructions</label>
            <textarea
              placeholder="e.g. Please bring all food together. Keep drinks cold."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3.5 py-2 text-xs md:text-sm bg-white dark:bg-slate-955 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-h-[60px]"
            />
          </div>

          {/* Pricing Summary */}
          <div className="bg-slate-50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span>Basket Subtotal</span>
              <span>{formatPrice(cartSubtotal, restaurant.settings.currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
              <span>GST ({restaurant.settings.gst_percentage}%)</span>
              <span>{formatPrice(gst, restaurant.settings.currency)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                <span>Service Charge ({restaurant.settings.service_charge_percentage}%)</span>
                <span>{formatPrice(serviceCharge, restaurant.settings.currency)}</span>
              </div>
            )}
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm md:text-base">
              <span>Final Estimate</span>
              <span>{formatPrice(cartTotal, restaurant.settings.currency)}</span>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
