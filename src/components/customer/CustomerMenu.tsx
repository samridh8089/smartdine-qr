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
  Minus, AlertCircle, CheckCircle2, ChevronRight, HelpCircle
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

export default function CustomerMenu({ restaurantSlug, tableId }: CustomerMenuProps) {
  const router = useRouter();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [vegOnly, setVegOnly] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [orderPlacing, setOrderPlacing] = useState(false);

  // Item Detail Modal
  const [detailedItem, setDetailedItem] = useState<MenuItem | null>(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [detailQty, setDetailQty] = useState(1);

  useEffect(() => {
    async function loadData() {
      // Load restaurant details from slug
      const rest = await db.getRestaurantBySlug(restaurantSlug);
      if (!rest) {
        setLoading(false);
        return;
      }
      setRestaurant(rest);

      // Load table details if tableId provided
      if (tableId) {
        const tbls = await db.getTables(rest.id);
        const tbl = tbls.find(t => t.id === tableId);
        if (tbl) setTable(tbl);
      }

      // Load categories & menu items
      const cats = await db.getCategories(rest.id);
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCatId(cats[0].id);
      }

      const items = (await db.getMenuItems(rest.id)).filter(i => i.is_available);
      setMenuItems(items);

      setLoading(false);

      // Sync cart from sessionStorage if available
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
      // Structure payload for db createOrder
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

      // Clear Cart
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Opening Digital Menu...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 shadow-md">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Restaurant Not Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed">The link you followed seems to be broken. Please scan a valid QR code on your dining table.</p>
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
    <div className="min-h-screen flex flex-col bg-slate-50/50 pb-24">
      {/* Restaurant Banner Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm shrink-0 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <img 
                src={restaurant.logo_url} 
                alt={restaurant.name} 
                className="h-12 w-12 rounded-xl object-cover border border-slate-100 shadow-sm" 
              />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold text-lg flex items-center justify-center shadow-inner">
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-slate-900 text-base md:text-lg">{restaurant.name}</h1>
              {table ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 mt-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {table.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 mt-1">
                  View-Only Menu
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Welcome/Table Prompt if view-only */}
        {!table && (
          <div className="bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4 flex items-start gap-3 text-xs leading-relaxed font-semibold">
            <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              You are currently browsing the digital menu. To place order tickets directly to the kitchen, please scan the QR code located on your table.
            </div>
          </div>
        )}

        {/* Search & Veg Toggle */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2.5 sm:pt-0 shrink-0">
            <span className="text-xs font-bold text-slate-500">Vegetarian Only</span>
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                vegOnly ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0 -mx-4 px-4">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
              selectedCatId === 'all'
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-100'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatId(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                selectedCatId === cat.id
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-600/10'
                  : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Food Items Grouped */}
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No dishes found matching your selection.
            </div>
          ) : (
            filteredItems.map(item => (
              <Card 
                key={item.id} 
                className="overflow-hidden hover:shadow-md transition-shadow duration-300 flex items-stretch min-h-[140px] cursor-pointer"
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
                    <h3 className="font-extrabold text-slate-950 text-base">{item.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-extrabold text-slate-950 text-base">{formatPrice(item.price, restaurant.settings.currency)}</span>
                    {table && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(item, 1);
                        }}
                        className="h-8 shadow-sm"
                      >
                        Add +
                      </Button>
                    )}
                  </div>
                </div>

                {/* Thumbnail Image */}
                {item.image_url && (
                  <div className="w-28 sm:w-36 shrink-0 relative border-l border-slate-100">
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
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 shadow-xl p-4 z-40">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Your Order Basket</span>
              <p className="text-sm font-extrabold text-slate-900">
                {cartCount} item{cartCount > 1 ? 's' : ''} • {formatPrice(cartTotal, restaurant.settings.currency)}
              </p>
            </div>
            <Button 
              className="px-6 gap-2"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              View Cart & Place Order
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
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                  className="px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="px-4 text-sm font-black text-slate-950">{detailQty}</span>
                <button
                  type="button"
                  onClick={() => setDetailQty(detailQty + 1)}
                  className="px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button onClick={() => detailedItem && handleAddToCart(detailedItem, detailQty, detailNotes)}>
                Add to Cart • {detailedItem ? formatPrice(detailedItem.price * detailQty, restaurant.settings.currency) : ''}
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setDetailedItem(null)} className="w-full">Close</Button>
          )
        }
      >
        <div className="space-y-4">
          {detailedItem?.image_url && (
            <img 
              src={detailedItem.image_url} 
              alt={detailedItem.name} 
              className="w-full h-48 object-cover rounded-xl border border-slate-100"
            />
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={detailedItem?.is_veg ? 'veg' : 'non-veg'}>
                {detailedItem?.is_veg ? 'Veg' : 'Non-Veg'}
              </Badge>
              <span className="font-extrabold text-slate-950 text-base">{detailedItem ? formatPrice(detailedItem.price, restaurant.settings.currency) : ''}</span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
              {detailedItem?.description || 'No description available for this dish.'}
            </p>
          </div>

          {table && (
            <div className="border-t border-slate-100 pt-4 space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Special Requests / Notes</label>
              <input
                type="text"
                placeholder="e.g. Extra spicy, no mayonnaise, gluten free"
                value={detailNotes}
                onChange={(e) => setDetailNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              className="w-full py-3 text-base font-extrabold"
              onClick={handlePlaceOrder}
              isLoading={orderPlacing}
            >
              Place Order ticket • {formatPrice(cartTotal, restaurant.settings.currency)}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Cart Items list */}
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white max-h-[30vh] overflow-y-auto">
            {cart.map((item, idx) => (
              <div key={`${item.menuItem.id}-${idx}`} className="p-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-xs md:text-sm truncate">{item.menuItem.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatPrice(item.menuItem.price, restaurant.settings.currency)} each</p>
                  {item.notes && (
                    <span className="inline-block text-[9px] text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded font-semibold mt-1">
                      Note: {item.notes}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-extrabold text-slate-900 text-xs md:text-sm">
                    {formatPrice(item.menuItem.price * item.quantity, restaurant.settings.currency)}
                  </span>
                  
                  {/* Qty edit */}
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, -1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-2 text-xs font-black text-slate-950">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(idx, 1)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100"
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
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Chef Special Instructions</label>
            <textarea
              placeholder="e.g. Please bring all food together. Keep drinks cold."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3.5 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-55 min-h-[60px]"
            />
          </div>

          {/* Pricing Summary */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Basket Subtotal</span>
              <span>{formatPrice(cartSubtotal, restaurant.settings.currency)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>GST ({restaurant.settings.gst_percentage}%)</span>
              <span>{formatPrice(gst, restaurant.settings.currency)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Service Charge ({restaurant.settings.service_charge_percentage}%)</span>
                <span>{formatPrice(serviceCharge, restaurant.settings.currency)}</span>
              </div>
            )}
            <div className="h-px bg-slate-200 my-1" />
            <div className="flex justify-between text-slate-900 font-black text-sm md:text-base">
              <span>Final Estimate</span>
              <span>{formatPrice(cartTotal, restaurant.settings.currency)}</span>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
