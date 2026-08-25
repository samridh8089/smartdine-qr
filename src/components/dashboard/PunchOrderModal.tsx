'use client';

import { useState, useEffect } from 'react';
import { db, MenuItem, Table, Restaurant, Category } from '@/lib/db';
import { calculateBillingTotals } from '@/lib/billingEngine';
import { formatPrice } from '@/lib/utils';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Plus, Minus, Search, Trash2, ShoppingCart, 
  CheckCircle, AlertCircle, Utensils, QrCode, Tag
} from 'lucide-react';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface PunchOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  staffName: string;
  onOrderCreated: () => void;
}

export default function PunchOrderModal({
  isOpen,
  onClose,
  restaurant,
  staffName,
  onOrderCreated
}: PunchOrderModalProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Order Details Form State
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  // Payment Options
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');

  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !restaurant.id) return;

    async function loadData() {
      setLoadingData(true);
      setErrorMsg('');
      try {
        const [tbls, items, cats] = await Promise.all([
          db.getTables(restaurant.id),
          db.getMenuItems(restaurant.id),
          db.getCategories(restaurant.id)
        ]);

        const availableItems = items.filter(i => i.is_available !== false);
        setTables(tbls);
        setMenuItems(availableItems);
        setCategories(cats);

        if (tbls.length > 0) {
          setSelectedTableId(tbls[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load menu/tables:', err);
        setErrorMsg('Failed to load menu items or tables.');
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [isOpen, restaurant.id]);

  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(c => c.menuItem.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.menuItem.id === itemId) {
          const newQty = c.quantity + delta;
          return newQty > 0 ? { ...c, quantity: newQty } : null;
        }
        return c;
      }).filter(Boolean) as CartItem[];
    });
  };

  const handleItemNotesChange = (itemId: string, notes: string) => {
    setCart(prev => prev.map(c => c.menuItem.id === itemId ? { ...c, notes } : c));
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.menuItem.id !== itemId));
  };

  // Calculations using canonical Billing Engine (BUG-B1, BUG-B2)
  const calcResult = calculateBillingTotals({
    items: cart.map(c => ({ price: c.menuItem.price, quantity: c.quantity })),
    gstEnabled: restaurant.settings.gst_enabled !== false,
    gstPercentage: restaurant.settings.gst_percentage || 0,
    serviceChargeEnabled: restaurant.settings.service_charge_enabled !== false,
    serviceChargePercentage: restaurant.settings.service_charge_percentage || 0,
    customCharges: restaurant.settings.custom_charges || []
  });

  const subtotal = calcResult.validSubtotal;
  const gstAmount = calcResult.gstAmount;
  const gstPercentage = restaurant.settings.gst_percentage || 0;
  const serviceChargeAmount = calcResult.serviceChargeAmount;
  const customChargesTotal = calcResult.customChargesTotal;
  const grandTotal = calcResult.grandTotal;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMsg('Please add at least one item to the cart.');
      return;
    }
    if (orderType === 'dine_in' && !selectedTableId) {
      setErrorMsg('Please select a dining table for Dine-in orders.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let targetTableId: string | null = selectedTableId;
      if (orderType === 'takeaway') {
        targetTableId = null;
      }

      const orderItemsPayload = cart.map(c => ({
        menuItemId: c.menuItem.id,
        quantity: c.quantity,
        notes: c.notes || undefined
      }));

      // 1. Create order in DB
      const newOrder = await db.createOrder(
        restaurant.id,
        targetTableId,
        orderItemsPayload,
        specialInstructions.trim() || undefined,
        orderType,
        undefined, // arrival mins
        undefined  // takeaway notes
      );

      // 2. If marked paid immediately by waiter
      if (markPaid && newOrder) {
        await db.updateOrderPaymentStatus(
          newOrder.id,
          'paid',
          staffName || 'Waiter',
          paymentMethod,
          `POS-${Date.now().toString().slice(-6)}`
        );
      }

      // Notify parent & dispatch storage event
      window.dispatchEvent(new Event('storage'));
      onOrderCreated();
      onClose();
      
      // Reset form
      setCart([]);
      setSpecialInstructions('');
      setMarkPaid(false);
    } catch (err: any) {
      console.error('Punch order failed:', err);
      setErrorMsg(err.message || 'Failed to punch order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCat = selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryName = (catId: string) => {
    const found = categories.find(c => c.id === catId);
    return found ? found.name : 'General';
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Punch New Order (Waiter POS)"
      className="max-w-4xl w-full"
    >
      {loadingData ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading menu & table listings...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmitOrder} className="space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Bar: Order Type & Table Selection */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Order Type Toggle */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Order Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                      orderType === 'dine_in'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Utensils className="h-3.5 w-3.5" /> Dine-in Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('takeaway')}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                      orderType === 'takeaway'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Takeaway Counter
                  </button>
                </div>
              </div>

              {/* Table Selector (Only for Dine-in) */}
              {orderType === 'dine_in' && (
                <div className="flex-1 max-w-xs">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Select Dining Table</label>
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    required
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Main Grid: Menu Item Selector (Left) & Cart / Summary (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[420px]">
            
            {/* Left Column: Menu Browser (7 Cols) */}
            <div className="md:col-span-7 flex flex-col space-y-3 border-r-0 md:border-r border-slate-100 dark:border-slate-800 pr-0 md:pr-4">
              {/* Search & Category Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search menu item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('all')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      selectedCategoryId === 'all'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    All Items
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer capitalize ${
                        selectedCategoryId === cat.id
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List Grid */}
              <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2 pr-1">
                {filteredMenuItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                    No available items match your search.
                  </div>
                ) : (
                  filteredMenuItems.map(item => {
                    const cartEntry = cart.find(c => c.menuItem.id === item.id);
                    const inCartQty = cartEntry ? cartEntry.quantity : 0;

                    return (
                      <div
                        key={item.id}
                        className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize">{getCategoryName(item.category_id)} • {formatPrice(item.price, restaurant.settings.currency)}</p>
                        </div>

                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg p-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              className="h-6 w-6 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs hover:bg-slate-100"
                            >
                              -
                            </button>
                            <span className="font-black text-xs text-emerald-700 dark:text-emerald-400 px-1">{inCartQty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              className="h-6 w-6 rounded bg-emerald-600 text-white flex items-center justify-center font-bold text-xs hover:bg-emerald-700"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-xs font-bold gap-1 py-1 px-3 dark:border-slate-700 cursor-pointer"
                            onClick={() => handleAddToCart(item)}
                          >
                            <Plus className="h-3.5 w-3.5 text-emerald-600" /> Add
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Order Summary & Cart (5 Cols) */}
            <div className="md:col-span-5 flex flex-col space-y-4 justify-between bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" /> Order Items ({cart.reduce((s, c) => s + c.quantity, 0)})
                </h4>

                <div className="max-h-[200px] overflow-y-auto space-y-2 divide-y divide-slate-100 dark:divide-slate-800 pr-1">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      Cart is empty. Click "+ Add" on items to punch order.
                    </div>
                  ) : (
                    cart.map(c => (
                      <div key={c.menuItem.id} className="pt-2 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-900 dark:text-white">{c.quantity}x {c.menuItem.name}</span>
                          <div className="flex items-center gap-2">
                            <span>{formatPrice(c.menuItem.price * c.quantity, restaurant.settings.currency)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(c.menuItem.id)}
                              className="text-rose-500 hover:text-rose-700 p-0.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="Note (e.g. No onion / extra spicy)"
                          value={c.notes}
                          onChange={(e) => handleItemNotesChange(c.menuItem.id, e.target.value)}
                          className="w-full text-[10px] px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Special Instructions & Payment Quick Toggle */}
              <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-3">
                <input
                  type="text"
                  placeholder="Special instructions for kitchen..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />

                {/* Mark as Paid Checkbox */}
                <div className="bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markPaid}
                      onChange={(e) => setMarkPaid(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span>Mark as Paid immediately (POS Cash/UPI)</span>
                  </label>

                  {markPaid && (
                    <div className="flex gap-2 pt-1">
                      {(['cash', 'upi', 'card'] as const).map(method => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg border transition-all ${
                            paymentMethod === method
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Totals Breakdown */}
                <div className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatPrice(subtotal, restaurant.settings.currency)}</span>
                  </div>
                  {gstAmount > 0 && (
                    <div className="flex justify-between">
                      <span>GST ({gstPercentage}%):</span>
                      <span>{formatPrice(gstAmount, restaurant.settings.currency)}</span>
                    </div>
                  )}
                  {serviceChargeAmount > 0 && (
                    <div className="flex justify-between">
                      <span>Service Charge:</span>
                      <span>{formatPrice(serviceChargeAmount, restaurant.settings.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-1.5">
                    <span>Total Amount:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{formatPrice(grandTotal, restaurant.settings.currency)}</span>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onClose}
                    className="flex-1 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || cart.length === 0}
                    isLoading={submitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
                  >
                    Punch Order
                  </Button>
                </div>
              </div>

            </div>

          </div>
        </form>
      )}
    </Dialog>
  );
}
