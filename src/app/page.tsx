'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UtensilsCrossed, QrCode, ClipboardList, ChefHat, BarChart3, 
  CreditCard, Smartphone, Check, Sparkles, ShieldCheck, Menu, X, Zap,
  Play, Laptop, Monitor, Layers, Users, BookOpen, Clock, ArrowRight, Receipt, Package
} from 'lucide-react';

import { db, PricingPlan } from '@/lib/db';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Footer from '@/components/Footer';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<'overview' | 'kds' | 'inventory' | 'reports'>('overview');

  useEffect(() => {
    // Redirect auth error hash fragments from landing homepage to /login or /forgot-password
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('error=')) {
      console.warn('[LandingPage] Auth hash error detected on landing page. Forwarding to /login...');
      window.location.href = `/login${window.location.hash}`;
      return;
    }

    async function loadPricing() {
      const plans = await db.getPricingPlans();
      setPricingPlans(plans);
    }
    loadPricing();
  }, []);

  const planDescriptions: Record<string, string> = {
    starter: 'Ideal for small cafes or pop-up bistros testing QR ordering.',
    pro: 'Perfect for standard restaurants looking to optimize workflows.',
    premium: 'Best for large multi-room dining lounges and high volume outlets.'
  };

  return (
    <div className="bg-white text-slate-900 min-h-screen flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Header / Navbar - Light Premium Sticky Bar */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 py-3.5 px-6 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="CleverOps Logo" className="h-9 w-auto object-contain" />
          <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">CleverOps</span>
        </Link>

        {/* Desktop menu actions */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#preview" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Preview</a>
          <a href="#roles" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Roles</a>
          <a href="#why-us" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Why CleverOps</a>
          <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Features</a>
          <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Pricing</a>
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">
            Sign In
          </Link>
          <Link href="/signup?plan=trial">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer">
              Start for ₹3
            </button>
          </Link>
        </div>

        {/* Mobile Header Buttons */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/signup?plan=trial">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs">
              Trial ₹3
            </button>
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navbar overlay */}
        {mobileMenuOpen && (
          <div className="absolute top-14 left-0 w-full bg-white border-b border-slate-200 flex flex-col p-6 space-y-4 shadow-xl z-20 md:hidden animate-pop">
            <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Product Preview</a>
            <a href="#roles" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">See Roles in Action</a>
            <a href="#why-us" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Why CleverOps</a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Pricing</a>
            <div className="h-px bg-slate-100 my-1" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">
              Sign In
            </Link>
            <Link href="/signup?plan=trial" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs">
                Start 3-Day Trial for ₹3
              </button>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section — Problem-First, Light Premium */}
      <section className="px-4 sm:px-8 md:px-12 pt-6 pb-6 sm:pt-14 sm:pb-14 md:pt-18 md:pb-16 max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-emerald-800">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>AI-Powered Restaurant Operating System</span>
        </div>
        
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-snug sm:leading-[1.15]">
          Restaurant ka har kaam. <span className="text-emerald-600">Ek hi App se.</span>
        </h1>
        
        <p className="text-xs sm:text-base md:text-lg text-slate-600 max-w-xl sm:max-w-2xl mx-auto leading-relaxed">
          Orders, KDS, Inventory, AI Recipe, AI Menu, Billing aur Reports — sab kuch ek hi simple app me.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1 w-full max-w-xs sm:max-w-none mx-auto">
          <Link href="/signup?plan=trial" className="w-full sm:w-auto">
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm md:text-base font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer">
              Start 3-Day Trial for ₹3
            </button>
          </Link>
          <a href="#roles" className="w-full sm:w-auto">
            <button className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-6 py-3 rounded-xl text-sm md:text-base font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2">
              <Play className="h-4 w-4 fill-slate-700 text-slate-700" />
              <span>Watch Live Demo</span>
            </button>
          </a>
        </div>

        <div className="space-y-0.5 pt-0.5">
          <p className="text-xs sm:text-sm text-slate-700 font-bold">
            Razorpay se sirf ₹3 pay karo. 3 din sab features unlock.
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            No Laptop Required • No Extra Hardware • Setup in Minutes
          </p>
        </div>

        {/* What You Get — 2 Rows x 3 Chips with Taller Pills */}
        <div className="pt-1 grid grid-cols-3 gap-1.5 sm:gap-2 max-w-xl mx-auto">
          <span className="h-9 sm:h-auto inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs text-center">
            QR Ordering
          </span>
          <span className="h-9 sm:h-auto inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs text-center">
            Live KDS
          </span>
          <span className="h-9 sm:h-auto inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs text-center">
            Inventory
          </span>
          <span className="h-9 sm:h-auto inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs text-center">
            AI Recipe
          </span>
          <span className="h-9 sm:h-auto inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs text-center">
            AI Menu
          </span>
          <span className="h-9 sm:h-auto inline-flex items-center justify-center px-2.5 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs text-center">
            Billing
          </span>
        </div>
      </section>

      {/* Trust Strip — Factual Architecture Capabilities */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-3 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-x-4 sm:gap-x-8 gap-y-2 text-[11px] sm:text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>No Laptop Required</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Multi-Device Sync</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Live Kitchen Updates</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Multi-Role Access</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1 justify-center">
            <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Zero Commission</span>
          </div>
        </div>
      </section>

      {/* Product Preview — "Your Restaurant in One Screen" */}
      <section id="preview" className="px-4 sm:px-6 md:px-12 py-8 sm:py-14 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6 scroll-mt-16">
        <div className="text-center space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">Your Restaurant in One Screen</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">Unified real-time visibility across front-of-house and kitchen operations</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center w-full px-1">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setActivePreviewTab('overview')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activePreviewTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActivePreviewTab('kds')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activePreviewTab === 'kds'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kitchen Display
            </button>
            <button
              onClick={() => setActivePreviewTab('inventory')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activePreviewTab === 'inventory'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inventory
            </button>
            <button
              onClick={() => setActivePreviewTab('reports')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activePreviewTab === 'reports'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reports
            </button>
          </div>
        </div>

        {/* Authentic UI Preview Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-sm w-full">
          {activePreviewTab === 'overview' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-0.5 sm:space-y-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Sales</p>
                  <p className="text-xl font-black text-slate-900">₹24,850</p>
                  <p className="text-[11px] text-emerald-600 font-bold">↑ 18% vs yesterday</p>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-0.5 sm:space-y-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Orders</p>
                  <p className="text-xl font-black text-slate-900">7 Live</p>
                  <p className="text-[11px] text-slate-500 font-medium">3 preparing • 4 served</p>
                </div>
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-100 space-y-0.5 sm:space-y-1">
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Table Status</p>
                  <p className="text-xl font-black text-slate-900">12 / 16</p>
                  <p className="text-[11px] text-slate-500 font-medium">75% occupancy</p>
                </div>
              </div>
            </div>
          )}

          {activePreviewTab === 'kds' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                  <span>Table 04 • Batch #1</span>
                  <span className="bg-amber-100 px-2 py-0.5 rounded text-[10px]">NEW</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">2x Paneer Tikka • 1x Garlic Naan</p>
                <p className="text-[10px] text-slate-500">Less spicy, butter on side</p>
              </div>
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                  <span>Table 09 • Batch #2</span>
                  <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">PREPARING</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">1x Dal Makhani • 2x Roti</p>
                <p className="text-[10px] text-slate-500">Prep time: 6 min elapsed</p>
              </div>
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-emerald-900">
                  <span>Table 02 • Batch #1</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px]">READY</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">1x Veg Biryani • 1x Raita</p>
                <p className="text-[10px] text-emerald-700 font-bold">Waiter notified to pick up</p>
              </div>
            </div>
          )}

          {activePreviewTab === 'inventory' && (
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">Paneer (Fresh Dairy)</span>
                <span className="text-slate-600 font-medium">8.5 kg in stock</span>
                <span className="text-emerald-600 font-bold">Adequate</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-amber-50/70 rounded-lg border border-amber-200">
                <span className="font-semibold text-slate-800">Basmati Rice (Premium)</span>
                <span className="text-slate-600 font-medium">3.2 kg remaining</span>
                <span className="text-amber-700 font-bold">Reorder Soon</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="font-semibold text-slate-800">Fresh Cream</span>
                <span className="text-slate-600 font-medium">4.0 Litres</span>
                <span className="text-emerald-600 font-bold">Adequate</span>
              </div>
            </div>
          )}

          {activePreviewTab === 'reports' && (
            <div className="space-y-2.5 sm:space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500 font-medium border-b border-slate-100 pb-2">
                <span>Top Selling Dish</span>
                <span>Portions Sold</span>
                <span>Revenue</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                <span>1. Special Butter Paneer</span>
                <span className="text-slate-600">42 orders</span>
                <span className="text-slate-900">₹14,280</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                <span>2. Hyderabadi Dum Biryani</span>
                <span className="text-slate-600">38 orders</span>
                <span className="text-slate-900">₹12,160</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-800">
                <span>3. Garlic Butter Naan</span>
                <span className="text-slate-600">65 orders</span>
                <span className="text-slate-900">₹5,200</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Why Owners Choose CleverOps — 4 Cards (Clean Stripe/Notion Style) */}
      <section id="why-us" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-y border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">Why Owners Choose CleverOps</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">Built to run reliably without costly overheads or complex setups</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">No Laptop Required</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Restaurant ka poora system phone se chalao
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">No Extra Hardware</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Purana Android phone bhi chalega
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">One App for Every Role</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Owner, Manager, Waiter, KDS aur Cashier alag login
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Easy to Use</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                5 minute me staff seekh jayega
              </p>
            </div>
          </div>

          {/* One App for Every Role Badges Highlight */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center space-y-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <span className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg">Owner</span>
              <span className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg">Manager</span>
              <span className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg">Waiter</span>
              <span className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg">Kitchen</span>
              <span className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg">Cashier</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl mx-auto leading-relaxed">
              Sab log ek hi CleverOps app use karte hain. Har role ko sirf uska kaam dikhega.
            </p>
          </div>
        </div>
      </section>

      {/* Smart Costing & Inventory Section */}
      <section id="profit-intelligence" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Roz ki Mahangai se kitna nuksan ho raha hai, pata hai?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              Tamatar ₹30 se ₹70 ho gaya, Cheese mehengi ho gayi, Oil ka rate badal gaya. Aksar restaurant owner ko exact profit loss pata hi nahi chalta.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Live Ingredient Cost Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Har ingredient ke rate change ka live update aur automatic recipe costing.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Automatic Dish Profit Update</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dish ki actual costing aur real margin turant pata chalega.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Low Stock Alerts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stock khatam hone se pehle Owner aur Manager ko highlight alert.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 sm:space-y-2 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Auto Hide Out-of-Stock Dishes</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Item khatam hone par customer unavailable dish order hi nahi kar payega.
              </p>
            </div>
          </div>

          {/* Refill automatic highlight */}
          <div className="text-center bg-emerald-50/80 border border-emerald-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-2xs">
            <p className="text-xs sm:text-sm font-bold text-emerald-950">
              Refill hote hi dish automatically menu me wapas aa jayegi.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Strip (Premium Minimal White Design) */}
      <section id="comparison" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Traditional System vs CleverOps
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              See why modern restaurant owners switch to an all-in-one operating platform
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
            {/* Table Header */}
            <div className="grid grid-cols-2 bg-slate-50 p-3 sm:p-4 text-xs sm:text-sm font-bold">
              <div className="text-slate-500">Normal Restaurant</div>
              <div className="text-emerald-700 flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" />
                <span>CleverOps</span>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-2 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="text-slate-500 font-medium pr-2">Andaze se costing</div>
              <div className="text-slate-900 font-bold">Live costing</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="text-slate-500 font-medium pr-2">Manual stock check</div>
              <div className="text-slate-900 font-bold">Automatic alerts</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-2 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="text-slate-500 font-medium pr-2">Out-of-stock confusion</div>
              <div className="text-slate-900 font-bold">Auto-hide menu</div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-2 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="text-slate-500 font-medium pr-2">Alag systems</div>
              <div className="text-slate-900 font-bold">One app for every role</div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Placeholder Section — 16:9 Ratio */}
      <section id="roles" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 max-w-5xl mx-auto w-full space-y-4 sm:space-y-8 scroll-mt-16">
        <div className="text-center space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Dekho CleverOps asli restaurant me kaise kaam karta hai
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            Watch how owners, kitchen staff and waiters use CleverOps in real restaurants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Owner App Demo */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors">
              <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wide uppercase">Video Coming Soon</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                Real Owner Dashboard
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Owner App Demo</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Dashboard, live reports and restaurant management.
              </p>
            </div>
          </div>

          {/* Card 2: Kitchen Display Demo */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors">
              <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wide uppercase">Video Coming Soon</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                Live Kitchen Workflow
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Kitchen Display Demo</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Live orders, tickets and kitchen workflow.
              </p>
            </div>
          </div>

          {/* Card 3: Waiter App Demo */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors">
              <div className="h-10 w-10 sm:h-11 sm:w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wide uppercase">Video Coming Soon</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                Waiter Service Flow
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Waiter App Demo</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Table orders and service management.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="px-6 md:px-12 py-16 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Core Modules Inside CleverOps</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase">Everything you need to automate order processes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                <QrCode className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Table QR Code Engine</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                Generate unlimited table assets. Dynamic canvas generator automatically creates QR codes pointing to restaurant tables. Print individually or download as PNGs.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Instant Customer Cart</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                Mobile-first ordering menu. Customers add food items, include custom notes, write special instructions to the chef, and check order estimations instantly without app downloads.
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
                <ChefHat className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Kitchen Display System (KDS)</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                Dedicated card-board screen for cooks. Color-coded ticket lanes and live updates ensure new orders are processed immediately. Track step timelines from preparation to serving.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shadow-inner">
                <ClipboardList className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Billing & Invoice System</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                Automatic receipts calculations. Subtotal, configurable GST, optional service charges automatically added. Includes thermal-receipt styling window for easy physical printouts.
              </p>
            </div>

            <Link href="/analytics" className="block space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shadow-inner">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Reports & Analytics</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                Review daily, weekly, and monthly sales. Visual SVG bar charts trace transactions. Spot your top selling dishes on the Leaderboard and configure settings for peak efficiency.
              </p>
            </Link>

            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-slate-200 text-slate-700 rounded-xl flex items-center justify-center shadow-inner">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Multi-Tenant SaaS Limits</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                Subscription tiers (Starter, Pro, Premium) limit items and tables. Super Admin control panel tracks active tenants, platform MRR statistics, and enables manual license overrides.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Matrix Section */}
      <section id="pricing" className="px-6 md:px-12 py-16 sm:py-20 max-w-6xl mx-auto space-y-12 scroll-mt-16">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Flexible SaaS Subscription Plans</h2>
            <p className="text-xs sm:text-sm text-slate-400 font-semibold uppercase">Zero order commission. Pay a simple flat recurring subscription.</p>
          </div>

          {/* Pricing Toggle */}
          <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'yearly'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Yearly Billing (10% Off)
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {pricingPlans.map(plan => {
            const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const pricePeriod = billingInterval === 'yearly' ? '/year' : '/month';
            const featuresList = Array.isArray(plan.features) ? plan.features : [];

            return (
              <Card key={plan.id} className="flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:scale-101 animate-fade-in">
                <CardContent className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-xl capitalize">{plan.name} Plan</h3>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{planDescriptions[plan.id]}</p>
                    </div>

                    <div className="flex items-baseline">
                      <span className="text-4xl font-black text-slate-950">{formatPrice(price)}</span>
                      <span className="text-slate-400 text-xs font-semibold">{pricePeriod}</span>
                    </div>

                    <Badge variant="neutral" className="w-full justify-center bg-slate-50 border-slate-100 text-slate-600 font-semibold py-1">
                      {(plan.max_tables ?? 0) >= 9999 && (plan.max_items ?? 0) >= 9999 
                        ? 'Unlimited tables & menu items' 
                        : `Up to ${(plan.max_tables ?? 0) >= 9999 ? 'Unlimited' : (plan.max_tables ?? 0)} tables & ${(plan.max_items ?? 0) >= 9999 ? 'Unlimited' : (plan.max_items ?? 0)} menu items`}
                    </Badge>

                    <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                      {featuresList.map(f => (
                        <li key={f} className="flex items-center gap-2 font-semibold">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    <Link href={`/signup?plan=${plan.id}&interval=${billingInterval}`}>
                      <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all cursor-pointer hover:scale-102">
                        Get Started
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* CTA Footer */}
      <Footer />

    </div>
  );
}
