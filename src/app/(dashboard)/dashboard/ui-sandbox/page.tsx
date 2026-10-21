'use client';

import { useState, useMemo, useCallback } from 'react';
import { 
  Bell, CheckCircle2, AlertCircle, Plus, Minus, 
  ShoppingBag, Sparkles, UtensilsCrossed, ShieldAlert,
  ArrowRight, Users, QrCode, Tag, Check, ExternalLink, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';

export default function UISandboxPrototypePage() {
  // 1. useState hooks
  const [activeTab, setActiveTab] = useState<'menu' | 'waiter' | 'tables' | 'login' | 'cart'>('menu');
  const [demoVegOnly, setDemoVegOnly] = useState(false);
  const [demoCartQty, setDemoCartQty] = useState<Record<string, number>>({ 'dish-1': 1 });
  const [demoSelectedPortion, setDemoSelectedPortion] = useState<Record<string, string>>({ 'dish-1': 'Full' });
  const [demoWaiterState, setDemoWaiterState] = useState<'idle' | 'calling' | 'accepted'>('idle');
  const [demoTimer, setDemoTimer] = useState(45);
  const [selectedTables, setSelectedTables] = useState<string[]>(['T-1', 'T-2']);
  const [unmergeModalOpen, setUnmergeModalOpen] = useState(false);
  const [loginErrorVisible, setLoginErrorVisible] = useState(true);

  // 2. useMemo hooks
  const sampleDishes = useMemo(() => [
    {
      id: 'dish-1',
      name: 'Paneer Butter Masala (Rich Cashew Gravy)',
      category: 'Main Course',
      price: 240,
      isVeg: true,
      description: 'Slow-cooked fresh cottage cheese cubes in aromatic buttery tomato cream gravy with roasted fenugreek leaves.',
      image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
      hasRecipe: true,
      inStock: true,
      portions: [
        { name: 'Half', price: 150 },
        { name: 'Full', price: 240 }
      ]
    },
    {
      id: 'dish-2',
      name: 'Special Papad (Fried / Roasted with Chutney Platter)',
      category: 'Starters',
      price: 60,
      isVeg: true,
      description: 'Crisp urad dal papad topped with diced onions, tomatoes, fresh coriander, and tangy chaat masala spices.',
      image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
      hasRecipe: false, // Notice: No recipe mapped, but remains 100% available per user rule!
      inStock: true,
      portions: []
    },
    {
      id: 'dish-3',
      name: 'Murg Dum Biryani (Hyderabadi Style Handi)',
      category: 'Biryani',
      price: 320,
      isVeg: false,
      description: 'Layered aromatic aged basmati rice infused with saffron, caramelized onions, and marinated tender chicken pieces.',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
      hasRecipe: true,
      inStock: true,
      portions: [
        { name: 'Regular', price: 320 },
        { name: 'Family Pack', price: 620 }
      ]
    }
  ], []);

  const sampleTables = useMemo(() => [
    { id: 'T-1', name: 'Table 1', capacity: 4, status: 'Occupied', group: 'Family Group (T1+T2)' },
    { id: 'T-2', name: 'Table 2', capacity: 4, status: 'Occupied', group: 'Family Group (T1+T2)' },
    { id: 'T-3', name: 'Table 3', capacity: 2, status: 'Available', group: null },
    { id: 'T-4', name: 'Table 4', capacity: 6, status: 'Available', group: null },
  ], []);

  // 3. useCallback hooks
  const handleUpdateQty = useCallback((dishId: string, delta: number) => {
    setDemoCartQty(prev => {
      const current = prev[dishId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[dishId];
        return copy;
      }
      return { ...prev, [dishId]: next };
    });
  }, []);

  const handleToggleTable = useCallback((tableId: string) => {
    setSelectedTables(prev => 
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    );
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>CleverOps Modern UI Sandbox Prototype</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Interactive UI Prototype Showcase
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mt-1 leading-relaxed">
            Test and preview the modernized Swiggy/Zomato class components, zero-stacking Call Waiter, 2-line wrapped dish cards, and modern confirmation dialogs in an isolated sandbox.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-white/10 text-white border-white/20 text-xs px-3 py-1 font-bold">
            React 19 & Tailwind v4
          </Badge>
          <Badge className="bg-emerald-500 text-white border-none text-xs px-3 py-1 font-black">
            Frozen Engine: 0 Diff
          </Badge>
        </div>
      </div>

      {/* Sandbox Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'menu', label: '1. Modern Customer Menu' },
          { id: 'waiter', label: '2. Call Waiter Action' },
          { id: 'tables', label: '3. Table Merge Dialog' },
          { id: 'login', label: '4. Login Error Feedback' },
          { id: 'cart', label: '5. Slide-up Cart Drawer' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Modern Customer Menu */}
      {activeTab === 'menu' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                Modern Dish Cards (No Truncation & Portion Selector)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Notice: Dish #2 has NO recipe, yet remains 100% available per your strict business rule.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={demoVegOnly}
                onChange={(e) => setDemoVegOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Veg Only Filter</span>
            </label>
          </div>

          <div className="grid gap-4">
            {sampleDishes
              .filter(d => !demoVegOnly || d.isVeg)
              .map(dish => {
                const qty = demoCartQty[dish.id] || 0;
                const portion = demoSelectedPortion[dish.id] || (dish.portions[0]?.name || 'Base');
                const price = dish.portions.find(p => p.name === portion)?.price || dish.price;

                return (
                  <Card key={dish.id} className="p-4 flex flex-col sm:flex-row gap-4 hover:shadow-lg transition-all border border-slate-200/70 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${dish.isVeg ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950' : 'bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-950'}`} />
                        <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                          {dish.category}
                        </span>
                        {!dish.hasRecipe && (
                          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
                            Unmapped (Always In-Stock)
                          </span>
                        )}
                      </div>

                      {/* 2-line title wrapping, no truncation */}
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg leading-snug line-clamp-2">
                        {dish.name}
                      </h4>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {dish.description}
                      </p>

                      {/* Portion Selector Pills if variants exist */}
                      {dish.portions.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase">Portion:</span>
                          {dish.portions.map(p => (
                            <button
                              key={p.name}
                              onClick={() => setDemoSelectedPortion(prev => ({ ...prev, [dish.id]: p.name }))}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                portion === p.name
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {p.name} (₹{p.price})
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="pt-2">
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          ₹{price}
                        </span>
                      </div>
                    </div>

                    {/* Image & Interactive Add Button */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0">
                      <div className="h-28 w-28 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-slate-800">
                        <img src={dish.image} alt={dish.name} className="h-full w-full object-cover" />
                      </div>

                      {qty === 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateQty(dish.id, 1)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 rounded-xl shadow-md cursor-pointer active:scale-95 transition-all"
                        >
                          <Plus className="h-4 w-4 mr-1" /> ADD
                        </Button>
                      ) : (
                        <div className="flex items-center bg-emerald-600 text-white rounded-xl shadow-md overflow-hidden font-extrabold text-xs">
                          <button
                            onClick={() => handleUpdateQty(dish.id, -1)}
                            className="px-3 py-1.5 hover:bg-emerald-700 transition-colors cursor-pointer active:scale-90"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-2 font-black text-sm">{qty}</span>
                          <button
                            onClick={() => handleUpdateQty(dish.id, 1)}
                            className="px-3 py-1.5 hover:bg-emerald-700 transition-colors cursor-pointer active:scale-90"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab 2: Call Waiter Action */}
      {activeTab === 'waiter' && (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Dynamic Call Waiter (Zero Stacking Glitch)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              When the customer calls the waiter, the orange button transforms into the active live card. No duplicate buttons appear stacked above each other.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              {demoWaiterState === 'idle' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Action Bar:</span>
                  <button
                    onClick={() => {
                      setDemoWaiterState('calling');
                      setDemoTimer(45);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Bell className="h-4 w-4 animate-bounce" />
                    <span>Call Waiter</span>
                  </button>
                </div>
              )}

              {demoWaiterState === 'calling' && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-4 shadow-sm animate-pop">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                      <Bell className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-blue-950 dark:text-blue-200 uppercase tracking-wide">
                        Waiter Calling... ({demoTimer}s)
                      </h4>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold mt-0.5">
                        Staff has been notified on their smart watch / phone.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDemoWaiterState('accepted')}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      Simulate Accept
                    </button>
                    <button
                      onClick={() => setDemoWaiterState('idle')}
                      className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {demoWaiterState === 'accepted' && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-4 shadow-sm animate-pop">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 uppercase tracking-wide">
                        Waiter is on the way!
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                        Staff Rahul Sharma has accepted and is walking to Table 1.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDemoWaiterState('idle')}
                    className="px-3 py-1 bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Table Merge Modern Dialog */}
      {activeTab === 'tables' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Table Layout & Merge Management
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select 2 or more tables to merge. Unmerge now uses modern Tailwind dialog instead of raw browser confirm.
                </p>
              </div>

              {selectedTables.length >= 2 && (
                <Button
                  size="sm"
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold"
                >
                  <Users className="h-4 w-4 mr-1.5" /> Merge ({selectedTables.length}) Tables
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {sampleTables.map(t => {
                const isSelected = selectedTables.includes(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTable(t.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900 dark:text-white">{t.name}</span>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${t.status === 'Occupied' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className="text-[10px] font-bold text-slate-500">{t.status}</span>
                    </div>
                    {t.group && (
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                        {t.group}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Simulated Merged Group Card with modern Unmerge button */}
            <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300 tracking-wider">
                  Active Merged Group
                </span>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Family Group (Table 1 + Table 2)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">8 seats combined • 1 shared bill</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setUnmergeModalOpen(true)}
                className="text-rose-600 hover:bg-rose-50 border-rose-200 font-bold text-xs"
              >
                Unmerge Group
              </Button>
            </div>
          </div>

          {/* Modern Unmerge Dialog Prototype */}
          <Dialog
            isOpen={unmergeModalOpen}
            onClose={() => setUnmergeModalOpen(false)}
            title="Unmerge Table Group"
          >
            <div className="space-y-4 pt-1">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to unmerge <strong className="text-slate-900 dark:text-white font-bold">Family Group (Table 1 + Table 2)</strong>?
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                Existing active orders will remain under this group until settled. Future QR scans will open individual table dining sessions.
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setUnmergeModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setUnmergeModalOpen(false)}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                >
                  Unmerge Tables
                </Button>
              </div>
            </div>
          </Dialog>
        </div>
      )}

      {/* Tab 4: Login Error Feedback */}
      {activeTab === 'login' && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white">
                Modern Login Error Feedback Demo
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Notice how the prominent alert sits directly above the button, with red field highlight, eliminating the &ldquo;kuch nahi aaya&rdquo; complaint!
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value="owner@cleverops.in"
                  readOnly
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  PASSWORD
                </label>
                <input
                  type="password"
                  value="wrong_password_123"
                  readOnly
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 dark:text-white transition-all ${
                    loginErrorVisible
                      ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20 ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                />
              </div>

              {loginErrorVisible && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-400 dark:border-rose-800 text-rose-800 dark:text-rose-200 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-md animate-bounce">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  <span className="flex-1 leading-snug">
                    Email ya Password galat hai. Kripya dobara check karein.
                  </span>
                </div>
              )}

              <Button
                type="button"
                onClick={() => setLoginErrorVisible(!loginErrorVisible)}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold h-11 text-sm shadow-md"
              >
                Sign In (Click to toggle error)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Slide-up Cart Drawer Prototype */}
      {activeTab === 'cart' && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <h3 className="font-black text-lg text-slate-900 dark:text-white">
              Slide-up Cart Summary Drawer
            </h3>
            <p className="text-xs text-slate-500">
              Clear itemization, applied promo coupon, 5% GST calculation, and prominent tactile Checkout CTA.
            </p>

            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="line-clamp-1">Paneer Butter Masala (Full) x1</span>
                <span>₹240.00</span>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="line-clamp-1">Special Papad Platter x2</span>
                <span>₹120.00</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span>₹360.00</span>
                </div>
                <div className="flex items-center justify-between text-emerald-600 font-bold">
                  <span>Promo (FLAT20)</span>
                  <span>-₹72.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>GST (5%)</span>
                  <span>₹14.40</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-sm font-black text-slate-900 dark:text-white">
                  <span>Total Amount</span>
                  <span>₹302.40</span>
                </div>
              </div>

              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-11 text-sm shadow-md mt-2">
                Place Order • ₹302.40
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
