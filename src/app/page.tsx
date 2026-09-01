'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  QrCode, ClipboardList, ChefHat, BarChart3, 
  CreditCard, Smartphone, Check, Sparkles, Menu, X, 
  Play, Clock, ChevronDown, ChevronUp, AlertTriangle, 
  HelpCircle, ArrowRight, ShieldCheck, Zap, Laptop, Users, Receipt, Package,
  Star, Activity, Lock, FileText, XCircle, CheckCircle2, RefreshCw, Layers
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
  const [activePreviewTab, setActivePreviewTab] = useState<'owner' | 'kitchen' | 'waiter' | 'cashier'>('owner');
  const [activeFaqIndex, setActiveFaqIndex] = useState<number | null>(null);

  // Efficiency Calculator State (5 to 50 tables, 20 to 500 orders/day)
  const [calcTables, setCalcTables] = useState<number>(16);
  const [calcDailyOrders, setCalcDailyOrders] = useState<number>(120);

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

  const faqs = [
    {
      q: 'Kya CleverOps chalane ke liye laptop ya computer chahiye?',
      a: 'Bilkul nahi. Aap aur aapka staff poora CleverOps apne regular smartphone ya kisi purane Android tablet se chala sakte hain.'
    },
    {
      q: 'Existing Android phone chalega?',
      a: 'Haan! CleverOps ek lightweight cloud-native app hai. Kisi bhi basic Android phone ya iPhone par smooth chalta hai.'
    },
    {
      q: 'Waiter aur Kitchen alag alag login kar sakte hain?',
      a: 'Haan, CleverOps me role-based access hai. Waiter ko sirf table orders aur service requests dikhenge, Kitchen ko live KDS tickets, aur Owner ko poora control.'
    },
    {
      q: 'Inventory aur recipe costing kaise track hoti hai?',
      a: 'Menu item banate waqt ingredients link ho jate hain. Har order par inventory automatically deduct hoti hai aur live ingredient rate ke hisaab se costing update hoti hai.'
    },
    {
      q: 'Item khatam hone par dish automatically hide ho jati hai?',
      a: 'Haan! Jaise hi kisi ingredient ka stock khatam hota hai, customer ke QR menu se wo dish automatically hide ho jati hai taaki order confusion na ho. Refill hote hi wapas aa jati hai.'
    },
    {
      q: '₹3 ke trial me kya kya milega?',
      a: 'Poore 3 din ke liye sabhi Pro/Premium features 100% unlocked milenge: QR Ordering, Live KDS, Inventory, AI Menu, AI Recipes aur Reports. Koi hidden charge nahi.'
    }
  ];

  const showcaseFeatures = [
    {
      icon: QrCode,
      title: 'QR Ordering',
      desc: 'Table par instant digital menu. Zero wait time, direct order placing without app installation.',
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      icon: ChefHat,
      title: 'Live KDS',
      desc: 'Dedicated kitchen display screen with color-coded tickets and real-time preparation timers.',
      color: 'bg-amber-50 text-amber-600'
    },
    {
      icon: Package,
      title: 'Inventory',
      desc: 'Automatic raw material deduction on every order. Low stock alerts before you run out.',
      color: 'bg-blue-50 text-blue-600'
    },
    {
      icon: Sparkles,
      title: 'AI Recipe',
      desc: 'Calculates exact ingredient proportions, standard cooking instructions, and per-dish base cost.',
      color: 'bg-purple-50 text-purple-600'
    },
    {
      icon: Smartphone,
      title: 'AI Menu',
      desc: 'Generates high-converting dish descriptions and automated category structuring in seconds.',
      color: 'bg-indigo-50 text-indigo-600'
    },
    {
      icon: Receipt,
      title: 'Billing & GST',
      desc: 'Subtotal, customizable GST, thermal receipt printouts, and dynamic UPI QR checkout.',
      color: 'bg-emerald-50 text-emerald-600'
    },
    {
      icon: BarChart3,
      title: 'Reports & Analytics',
      desc: 'Daily sales, food cost margin tracking, and top selling leaderboard right on your mobile.',
      color: 'bg-teal-50 text-teal-600'
    }
  ];

  return (
    <div className="bg-white text-slate-900 min-h-screen flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20 md:pb-0 overflow-x-hidden">
      
      {/* Header / Navbar - Light Premium Sticky Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 py-3.5 px-4 sm:px-8 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
        <Link href="/" className="flex items-center gap-3" aria-label="CleverOps Home">
          <img src="/logo.png" alt="CleverOps Restaurant Operating System Logo" className="h-9 w-auto object-contain" />
          <span className="font-black text-base sm:text-lg tracking-tight text-slate-900">CleverOps</span>
        </Link>

        {/* Desktop menu actions */}
        <nav aria-label="Desktop Navigation" className="hidden md:flex items-center gap-6">
          <a href="#preview" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Preview</a>
          <a href="#why-us" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">No Hardware</a>
          <a href="#profit-intelligence" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Smart Costing</a>
          <a href="#roles" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Demo Videos</a>
          <a href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">Pricing</a>
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-950 transition-colors">
            Sign In
          </Link>
          <Link href="/signup?plan=trial">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-xs shadow-emerald-600/20 transition-all cursor-pointer">
              Start 3-Day Trial for ₹3
            </button>
          </Link>
        </nav>

        {/* Mobile Header Buttons */}
        <div className="flex md:hidden items-center gap-2">
          <Link href="/signup?plan=trial">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-xs min-h-[38px]">
              Trial ₹3
            </button>
          </Link>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navbar overlay */}
        {mobileMenuOpen && (
          <nav aria-label="Mobile Navigation" className="absolute top-14 left-0 w-full bg-white border-b border-slate-200 flex flex-col p-6 space-y-4 shadow-xl z-20 md:hidden animate-pop">
            <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Product Preview</a>
            <a href="#why-us" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">No Hardware Needed</a>
            <a href="#profit-intelligence" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Smart Costing</a>
            <a href="#roles" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Demo Videos</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">Pricing</a>
            <div className="h-px bg-slate-100 my-1" />
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-semibold text-slate-700">
              Sign In
            </Link>
            <Link href="/signup?plan=trial" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl text-sm font-bold shadow-xs min-h-[48px]">
                Start 3-Day Trial for ₹3
              </button>
            </Link>
          </nav>
        )}
      </header>

      <main className="flex-1">

      {/* 1. Hero Section (Highest Impact) */}
      <section className="px-4 sm:px-8 md:px-12 pt-6 pb-6 sm:pt-14 sm:pb-14 md:pt-18 md:pb-16 max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-emerald-800">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>AI-Powered Restaurant Operating System</span>
        </div>
        
        {/* Headline */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-snug sm:leading-[1.15]">
          Restaurant ka har kaam. <span className="text-emerald-600">Ek hi App se.</span>
        </h1>
        
        {/* Subheadline */}
        <p className="text-xs sm:text-base md:text-lg text-slate-600 max-w-xl sm:max-w-2xl mx-auto leading-relaxed">
          Order se lekar Kitchen, Inventory, AI Recipe Costing, Billing aur Reports tak sab kuch ek hi app me. Laptop ya alag machine ki zarurat nahi.
        </p>
        
        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3 pt-1 w-full max-w-xs sm:max-w-none mx-auto">
          <Link href="/signup?plan=trial" className="w-full sm:w-auto">
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl text-sm md:text-base font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer min-h-[48px] flex items-center justify-center gap-2">
              <span>Start 3-Day Trial for ₹3</span>
            </button>
          </Link>
          <a href="#roles" className="w-full sm:w-auto">
            <button className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-6 py-3.5 rounded-xl text-sm md:text-base font-semibold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[48px]">
              <Play className="h-4 w-4 fill-slate-700 text-slate-700" />
              <span>Watch Live Demo</span>
            </button>
          </a>
        </div>

        {/* Microcopy */}
        <div className="space-y-0.5 pt-0.5">
          <p className="text-xs sm:text-sm text-slate-700 font-bold">
            Razorpay se sirf ₹3 pay karo. 3 din sab features unlock.
          </p>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
            No Laptop Required • No Extra Hardware • Setup in Minutes
          </p>
        </div>

        {/* 4 Hero Trust Pills — "Built for Restaurant Owners" */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 shadow-2xs">
            <Laptop className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>No Laptop Required</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 shadow-2xs">
            <Users className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Built for Restaurant Owners</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 shadow-2xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Razorpay Secure</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 shadow-2xs">
            <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>5 Minute Setup</span>
          </div>
        </div>

        {/* What You Get — 2 Rows x 3 Chips */}
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

      {/* Trust Strip */}
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

      {/* 2. Dashboard Preview Section (Authentic Snapshot, Clearly Labeled Demo) */}
      <section id="preview" className="px-4 sm:px-6 md:px-12 py-8 sm:py-14 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6 scroll-mt-16">
        <div className="text-center space-y-1 sm:space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold text-slate-700">
            <Layers className="h-3 w-3 text-emerald-600" />
            <span>Same App • Different Role</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">Your Restaurant in One Screen</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">Tap each role to see how CleverOps runs front-of-house and kitchen operations live</p>
        </div>

        {/* 4 Role Tab Switcher */}
        <div className="flex justify-center w-full px-1">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto max-w-full scrollbar-none">
            <button
              onClick={() => setActivePreviewTab('owner')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'owner'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Owner
            </button>
            <button
              onClick={() => setActivePreviewTab('kitchen')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'kitchen'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kitchen Display
            </button>
            <button
              onClick={() => setActivePreviewTab('waiter')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'waiter'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Waiter
            </button>
            <button
              onClick={() => setActivePreviewTab('cashier')}
              className={`px-3.5 sm:px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[38px] ${
                activePreviewTab === 'cashier'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cashier
            </button>
          </div>
        </div>

        {/* Role Explanation Subtitle */}
        <div className="text-center">
          {activePreviewTab === 'owner' && (
            <p className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 py-1.5 px-4 rounded-full inline-block">
              📱 Owner: Sales, inventory aur staff ek hi screen se manage karo.
            </p>
          )}
          {activePreviewTab === 'kitchen' && (
            <p className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 py-1.5 px-4 rounded-full inline-block">
              🍳 Kitchen: Live order queue bina kisi confusion ke.
            </p>
          )}
          {activePreviewTab === 'waiter' && (
            <p className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 py-1.5 px-4 rounded-full inline-block">
              🛎️ Waiter: Table requests aur bill instantly receive karo.
            </p>
          )}
          {activePreviewTab === 'cashier' && (
            <p className="text-xs sm:text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200/80 py-1.5 px-4 rounded-full inline-block">
              💳 Cashier: UPI aur receipt 2 taps me.
            </p>
          )}
        </div>

        {/* Authentic UI Snapshot Container — Clearly Marked as Demo Preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-6 shadow-sm w-full transition-all duration-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Demo Dashboard Preview</span>
            <span className="text-[10px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Sample Restaurant Data
            </span>
          </div>

          {/* Owner Tab */}
          {activePreviewTab === 'owner' && (
            <div className="space-y-3 sm:space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Today's Sales</p>
                  <p className="text-lg font-black text-slate-900">₹24,850</p>
                  <p className="text-[10px] text-emerald-600 font-bold">↑ 18% (Demo)</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Active Tables</p>
                  <p className="text-lg font-black text-slate-900">12 / 16</p>
                  <p className="text-[10px] text-slate-500">75% Occupancy</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Pending Bills</p>
                  <p className="text-lg font-black text-slate-900">₹3,890</p>
                  <p className="text-[10px] text-slate-500">3 tables checkout</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Kitchen Queue</p>
                  <p className="text-lg font-black text-slate-900">4 Orders</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Avg 6 min prep</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-0.5">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase">Staff Online</p>
                  <p className="text-lg font-black text-slate-900">5 Active</p>
                  <p className="text-[10px] text-slate-500">All roles synced</p>
                </div>
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-0.5">
                  <p className="text-[10px] font-semibold text-amber-800 uppercase">Low Stock</p>
                  <p className="text-lg font-black text-amber-900">3 Items</p>
                  <p className="text-[10px] text-amber-700 font-bold">Alert Triggered</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-semibold text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Low Stock Alert: Basmati Rice (3.2 kg remaining)</span>
                </div>
                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">Action Required</span>
              </div>
            </div>
          )}

          {/* Kitchen Display Tab */}
          {activePreviewTab === 'kitchen' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 animate-fade-in">
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-amber-900">
                  <span>Table 04 • Batch #1</span>
                  <span className="bg-amber-100 px-2 py-0.5 rounded text-[10px]">NEW ORDER</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">2x Paneer Tikka • 1x Garlic Naan</p>
                <p className="text-[10px] text-slate-500">Chef Note: Less spicy, butter on side</p>
              </div>
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 sm:p-3.5 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                  <span>Table 09 • Batch #2</span>
                  <span className="bg-blue-100 px-2 py-0.5 rounded text-[10px]">PREPARING</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">1x Dal Makhani • 2x Roti</p>
                <p className="text-[10px] text-slate-500">Timer: 6 min elapsed</p>
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

          {/* Waiter Tab */}
          {activePreviewTab === 'waiter' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs animate-fade-in">
              <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-purple-900">
                  <span>Table 03 • Table Call</span>
                  <span className="bg-purple-100 px-2 py-0.5 rounded text-[10px]">URGENT</span>
                </div>
                <p className="text-slate-700 font-medium">Customer requested water & extra cutlery</p>
                <p className="text-[10px] text-slate-500">Notification: 1 min ago</p>
              </div>
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-emerald-900">
                  <span>Table 12 • Bill Request</span>
                  <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px]">₹1,450</span>
                </div>
                <p className="text-slate-700 font-medium">Customer ready to settle check</p>
                <p className="text-[10px] text-emerald-700 font-bold">Forwarded to Cashier</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>Table 07 • Served Items</span>
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px]">3 ITEMS SERVED</span>
                </div>
                <p className="text-slate-700 font-medium">2x Cold Coffee • 1x Cheese Pizza</p>
                <button className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded w-full mt-1">
                  + Punch Add-on Item
                </button>
              </div>
            </div>
          )}

          {/* Cashier Tab */}
          {activePreviewTab === 'cashier' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>Table 12 • UPI Payment</span>
                  <span className="text-emerald-600 font-extrabold text-sm">₹1,450</span>
                </div>
                <p className="text-slate-600">Subtotal: ₹1,380 + GST: ₹70</p>
                <div className="bg-emerald-600 text-white font-bold text-center py-1.5 rounded text-[11px]">
                  Instant UPI QR Generated
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>Table 05 • Printed Receipt</span>
                  <span className="text-slate-900 font-bold">₹2,100</span>
                </div>
                <p className="text-slate-600">Payment received via UPI</p>
                <div className="bg-slate-100 border border-slate-200 text-slate-700 font-bold text-center py-1.5 rounded text-[11px]">
                  Thermal 3-Inch Receipt Printed
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-3.5 space-y-1.5">
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span>Today's Collection</span>
                  <span className="text-slate-900 font-bold">₹24,850 Total</span>
                </div>
                <p className="text-slate-600">UPI: ₹18,400 • Cash: ₹6,450</p>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-center py-1.5 rounded text-[11px]">
                  Day Cash Register Synced
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Dedicated "No Laptop Required" Objection Remover Section */}
      <section id="why-us" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Jo phone chalana aata hai, CleverOps bhi chal jayega.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              Kisi mehengi POS machine, computer ya printer setup ki zarurat nahi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-2xs">
              <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Smartphone className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Purana Android phone chalega</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Aapka aur aapke staff ka regular phone hi kaafi hai. Koi extra hardware kharidne ki zarurat nahi.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-2xs">
              <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Laptop className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">Alag POS machine nahi chahiye</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                ₹30,000 se ₹50,000 ka bulky hardware expense bachega. Direct cloud-native web app.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-2 shadow-2xs">
              <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">5 minute me staff seekh jayega</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                WhatsApp jaisa simple aur intuitive layout. Kisi training ya technical knowledge ki zarurat nahi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Restaurant Reality Section ("Restaurant Band Hone Ke Baad...") */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Restaurant band hone ke baad bhi owner ka kaam khatam nahi hota.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              Din bhar ki bhag-daud ke baad kaghaz ke bills aur hisaab-kitab ka bojh — dekhiye CleverOps kaise poora process automate karta hai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Column 1: Without CleverOps */}
            <div className="bg-slate-50/80 border border-red-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-red-100">
                <span className="text-base font-black text-red-900">Without CleverOps</span>
                <span className="text-[11px] font-extrabold uppercase text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                  Manual & Frustrating
                </span>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Orders ka hisaab alag</strong>
                    <p className="text-slate-500 text-xs">Kaghaz ke parcho aur slips ko jodte-jodte raat ke 12 baj jate hain.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Kitchen se baar baar puchna</strong>
                    <p className="text-slate-500 text-xs">Kaunsa order late hua, chef ne kya banaya, accountability zero hoti hai.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Stock kab khatam hua pata nahi</strong>
                    <p className="text-slate-500 text-xs">Subah dukan kholte hi achanak pata chalta hai paneer ya butter khatam hai.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Dish ki asli costing nahi dikhti</strong>
                    <p className="text-slate-500 text-xs">Market me rate badhne par pata nahi chalta kaunsi dish loss me bik rahi hai.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Staff coordination me time waste</strong>
                    <p className="text-slate-500 text-xs">Waiter, kitchen aur billing counter ke beech aapsi chikhna-chillana.</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Column 2: With CleverOps */}
            <div className="bg-white border border-emerald-300 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs ring-1 ring-emerald-500/20">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <span className="text-base font-black text-emerald-950">With CleverOps</span>
                <span className="text-[11px] font-extrabold uppercase text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  100% Automated
                </span>
              </div>
              <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Sab orders live</strong>
                    <p className="text-slate-600 text-xs">Customer QR scan karke order kare, kitchen aur counter par turant sync.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Kitchen automatically sync</strong>
                    <p className="text-slate-600 text-xs">Live KDS tickets with timers — chef ko har order ki exact details clear.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Low stock alert</strong>
                    <p className="text-slate-600 text-xs">Stock khatam hone se pehle Owner ke mobile par automatic alert notification.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Dish costing automatically update</strong>
                    <p className="text-slate-600 text-xs">Daily ingredient prices update karte hi har dish ka live profit margin ready.</p>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Ek dashboard me poora restaurant</strong>
                    <p className="text-slate-600 text-xs">10:30 PM hote hi closing sales, items sold aur inventory report 1-tap me ready.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Smart Costing & Food Cost Intelligence Section (Inventory USP) */}
      <section id="profit-intelligence" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Aaj Tamatar mehenga hua. Kal Oil. Par aapki dish ki asli costing kitni badli?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              Shayad aapne kabhi calculate nahi kiya. CleverOps har recipe ki real costing automatically track karta hai.
            </p>
          </div>

          {/* Highlight Impact Callout */}
          <div className="bg-white border border-emerald-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-2 shadow-2xs text-center">
            <span className="inline-block text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
              Food Cost Intelligence
            </span>
            <p className="text-sm sm:text-base font-black text-slate-900 leading-relaxed">
              Tamatar ₹30 se ₹70 ho gaya? Oil mehenga ho gaya? Cheese ka rate badal gaya?
            </p>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              CleverOps automatically dish ki recipe costing update karega aur live profit margin dikhayega.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Card 1: Live Cost Tracking */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Live Cost Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ingredient ka rate badalte hi recipe costing update. Har rate change ka live calculation.
              </p>
            </div>

            {/* Card 2: Low Stock Alert */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Low Stock Alert</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inventory kam hote hi Owner aur Manager ko alert. Stock khatam hone se pehle notification.
              </p>
            </div>

            {/* Card 3: Auto Menu Hide */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Auto Menu Hide</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Item khatam? Dish customer menu se automatically hide taaki waiter ko "nahi hai" na bolna pade.
              </p>
            </div>

            {/* Card 4: Auto Return */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Auto Return</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Refill karte hi dish wapas menu me aa jaye bina kisi manual settings ya click ke.
              </p>
            </div>

            {/* Card 5: Margin Visibility */}
            <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-1.5 shadow-2xs sm:col-span-2 lg:col-span-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Margin Visibility</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Kaunsi dish profit de rahi hai aur kaunsi loss me ja rahi hai — real-time gross margin report mobile par dekhein.
              </p>
            </div>
          </div>

          <div className="text-center bg-emerald-50/80 border border-emerald-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-2xs">
            <p className="text-xs sm:text-sm font-bold text-emerald-950">
              Refill hote hi dish automatically menu me wapas aa jayegi.
            </p>
          </div>
        </div>
      </section>

      {/* 6. Real 6-Step Daily Workflow Timeline */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Subah se Raat tak — CleverOps Poora Din Kaise Handle Karta Hai
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              Kitchen se lekar billing aur closing reports tak — bina kisi confusion ke smooth operations
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Step 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 font-black text-xs px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
                <span>9:00 AM</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Restaurant Open</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Store check aur low stock alerts. Turant pata chal jata hai aaj market se kya raw material mangwana hai.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 font-black text-xs px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                <span>11:30 AM</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">QR Orders Start</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customers table par baithe hi QR code scan karke order punch karte hain. Zero waiter dependency.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 font-black text-xs px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span>1:00 PM</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Kitchen Auto-Sync</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lunch rush me kitchen display screen par color-coded tickets chalte hain with prep timers aur chef notes.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-800 font-black text-xs px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
                <span>4:00 PM</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Low Stock Alert</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Koi ingredient khatam hone laga to Owner ko auto-alert milta hai aur dish menu se automatically hide ho jati hai.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 font-black text-xs px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-indigo-600" />
                <span>8:30 PM</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Rush Hour Handled</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dinner rush me fast table turnover, instant UPI QR payment aur 3-inch thermal billing counter par smooth.
              </p>
            </div>

            {/* Step 6 */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 space-y-2 shadow-2xs">
              <div className="inline-flex items-center gap-1.5 bg-slate-900 text-white font-black text-xs px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>10:30 PM</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Reports Automatically Ready</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Day closing hote hi total revenue, item sales, consumption aur net profit margins mobile dashboard par ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Believable Demo Videos Section (45 sec Demo Cards) */}
      <section id="roles" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 max-w-5xl mx-auto w-full space-y-4 sm:space-y-8 scroll-mt-16 bg-slate-50 border-b border-slate-200/80">
        <div className="text-center space-y-1 sm:space-y-2">
          <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            Dekho CleverOps Asli Restaurant Me Kaise Kaam Karta Hai
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
            Watch how owners, kitchen staff and waiters use CleverOps in real restaurants.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Card 1: Owner App (45 sec Demo) */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors relative">
              <div className="h-11 w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 tracking-wide">Owner App (45 sec Demo)</span>
              <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">0:45</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                Real Owner Dashboard
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Owner App Demo</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Sales, Reports aur Inventory management live.
              </p>
            </div>
          </div>

          {/* Card 2: Kitchen Display (45 sec Demo) */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors relative">
              <div className="h-11 w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 tracking-wide">Kitchen Display (45 sec Demo)</span>
              <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">0:45</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                Live Kitchen Workflow
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Kitchen Display Demo</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Live order tickets aur kitchen workflow live.
              </p>
            </div>
          </div>

          {/* Card 3: Waiter App (45 sec Demo) */}
          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4">
            <div className="aspect-[16/9] bg-slate-50 border border-slate-200/80 rounded-xl flex flex-col items-center justify-center gap-2 p-4 text-center group cursor-pointer hover:bg-slate-100/60 transition-colors relative">
              <div className="h-11 w-11 bg-white rounded-full flex items-center justify-center shadow-xs border border-slate-200 group-hover:scale-105 transition-transform">
                <Play className="h-4 w-4 fill-emerald-600 text-emerald-600 ml-0.5" />
              </div>
              <span className="text-[11px] font-bold text-slate-700 tracking-wide">Waiter App (45 sec Demo)</span>
              <span className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">0:45</span>
            </div>
            <div>
              <div className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-1 border border-emerald-200/60">
                Waiter Service Flow
              </div>
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Waiter App Demo</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Table requests, quick punch aur billing live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Feature Showcase Carousel (Scrollable Mobile) */}
      <section id="features" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-10">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Feature Showcase
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              Swipe karke dekhiye restaurant operating system ke sabhi powerful features
            </p>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-4 md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-6 md:pb-0 scrollbar-none">
            {showcaseFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div 
                  key={idx} 
                  className="min-w-[260px] sm:min-w-[280px] md:min-w-0 snap-center bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className={`h-10 w-10 ${feat.color} rounded-xl flex items-center justify-center shadow-inner`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-base">{feat.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {feat.desc}
                    </p>
                  </div>
                  <div className="pt-2 flex items-center gap-1 text-emerald-700 text-xs font-bold">
                    <span>100% Unlocked in ₹3 Trial</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9. Case Studies & Stories Section (Honest Placeholder) */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-14 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-full shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Customer Stories & Case Studies Coming Soon</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-lg mx-auto">
            CleverOps restaurants aur cafes ke operations ko transform kar raha hai. Real verified customer reviews jaldi publish honge.
          </p>
        </div>
      </section>

      {/* 10. Traditional POS Comparison Matrix */}
      <section id="comparison" className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-white border-b border-slate-200/80 scroll-mt-16">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Traditional POS vs CleverOps
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              Factual comparison based on real restaurant operations
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-100">
            {/* Table Header */}
            <div className="grid grid-cols-3 bg-slate-100/80 p-3 sm:p-4 text-xs sm:text-sm font-bold">
              <div className="text-slate-600">Feature</div>
              <div className="text-slate-500">Traditional POS</div>
              <div className="text-emerald-700 flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>CleverOps</span>
              </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">QR Ordering</div>
              <div className="text-slate-500">Partial</div>
              <div className="text-emerald-700 font-bold">Yes</div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">Live Kitchen (KDS)</div>
              <div className="text-slate-500">Limited / Add-on</div>
              <div className="text-emerald-700 font-bold">Yes</div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">Inventory & Stock</div>
              <div className="text-slate-500">Extra Software</div>
              <div className="text-emerald-700 font-bold">Included</div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">Recipe Costing</div>
              <div className="text-slate-500">Manual</div>
              <div className="text-emerald-700 font-bold">Automatic</div>
            </div>

            {/* Row 5 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">Low Stock Alerts</div>
              <div className="text-slate-500">No</div>
              <div className="text-emerald-700 font-bold">Yes</div>
            </div>

            {/* Row 6 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">Auto Menu Hide</div>
              <div className="text-slate-500">No</div>
              <div className="text-emerald-700 font-bold">Yes</div>
            </div>

            {/* Row 7 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">One App for All Roles</div>
              <div className="text-slate-500">No</div>
              <div className="text-emerald-700 font-bold">Yes</div>
            </div>

            {/* Row 8 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">Owner Reports</div>
              <div className="text-slate-500">Basic</div>
              <div className="text-emerald-700 font-bold">Live on Mobile</div>
            </div>

            {/* Row 9 */}
            <div className="grid grid-cols-3 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="font-semibold text-slate-800">Hardware Required</div>
              <div className="text-slate-500">Often Yes (Costly)</div>
              <div className="text-emerald-700 font-bold">No (Phone is enough)</div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQ Accordion Section */}
      <section className="px-4 sm:px-6 md:px-12 py-8 sm:py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-8">
          <div className="text-center space-y-1 sm:space-y-2">
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xl mx-auto">
              Restaurant owners ke aam sawal aur unke seedhe jawab
            </p>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-slate-200 rounded-xl overflow-hidden bg-white transition-colors"
              >
                <button
                  onClick={() => setActiveFaqIndex(activeFaqIndex === idx ? null : idx)}
                  className="w-full text-left p-4 sm:p-5 flex justify-between items-center gap-4 cursor-pointer font-bold text-slate-900 text-xs sm:text-sm min-h-[48px]"
                >
                  <span>{faq.q}</span>
                  {activeFaqIndex === idx ? (
                    <ChevronUp className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {activeFaqIndex === idx && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-2 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. ₹3 Conversion Strip (Consistent Wording) */}
      <section className="px-4 sm:px-8 md:px-12 pt-12 sm:pt-16 max-w-5xl mx-auto w-full">
        <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-5 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-center sm:text-left">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Zero Risk Trial</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900">
              Sirf ₹3 me 3 din ke liye sab features unlock.
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Razorpay secure checkout. Koi hidden charge ya setup fees nahi.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto shrink-0">
            <Link href="/signup?plan=trial" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer min-h-[48px]">
                Start 3-Day Trial for ₹3
              </button>
            </Link>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Razorpay Secure</span>
            </div>
          </div>
        </div>
      </section>

      {/* 13. Pricing Comparison Matrix Section */}
      <section id="pricing" className="px-4 sm:px-8 md:px-12 py-10 sm:py-16 max-w-6xl mx-auto space-y-10 scroll-mt-16">
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
              <Card key={plan.id} className="flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:scale-101 animate-fade-in bg-white border border-slate-200">
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
                      <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all cursor-pointer hover:scale-102 min-h-[48px]">
                        Get Started
                      </button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 14. Trust Footer Badges */}
        <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <RefreshCw className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Cancel Anytime</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>GST Invoice</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Razorpay Secure</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-bold text-slate-700 shadow-2xs text-center">
            <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Cloud Backup</span>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <Footer />

      {/* 15. Sticky Mobile CTA Floating Bar (Consistent 100% Identical Wording) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-2.5 px-4 flex items-center justify-between shadow-lg md:hidden">
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-900">3-Day Trial for ₹3</span>
          <span className="text-[10px] text-slate-500 font-medium">Razorpay se sirf ₹3 pay karo</span>
        </div>
        <Link href="/signup?plan=trial">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/20 cursor-pointer min-h-[44px]">
            Start 3-Day Trial for ₹3
          </button>
        </Link>
      </div>

    </div>
  );
}
