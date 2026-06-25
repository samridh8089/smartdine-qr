import Link from 'next/link';
import { 
  UtensilsCrossed, QrCode, ClipboardList, ChefHat, BarChart3, 
  CreditCard, Smartphone, CheckCircle, Sparkles, ShieldCheck
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans">
      
      {/* Header / Navbar */}
      <nav className="bg-white border-b border-slate-100 py-4 px-6 md:px-12 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">SmartDine QR</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-slate-950 transition-colors">
            Sign In
          </Link>
          <Link href="/signup">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-emerald-600/10 transition-all hover:scale-102">
              Start Free Trial
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 md:px-12 py-16 md:py-24 text-center max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
          <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
          The Future of Dine-in Ordering
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
          Modernize Your Dining Room with <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">QR Menu Ordering</span>
        </h1>
        <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Increase table turnover, eliminate orders error, and reduce staff pressure. SmartDine QR is a multi-tenant ordering platform designed specifically for fast-casual restaurants, bars, and bistros.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/signup" className="w-full sm:w-auto">
            <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-2xl text-base font-extrabold shadow-lg shadow-emerald-600/10 transition-all hover:scale-102">
              Create Restaurant Account
            </button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <button className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-8 py-3.5 rounded-2xl text-base font-extrabold shadow-sm transition-all hover:scale-102">
              Explore Demo Presets
            </button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="px-6 md:px-12 py-16 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Core Modules Inside SmartDine</h2>
            <p className="text-sm text-slate-400 font-semibold uppercase">Everything you need to automate order processes</p>
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
                Dedicated card-board screen for cooks. Color-coded ticket lanes and live audio bell alerts ensure new orders are processed immediately. Track step timelines from preparation to serving.
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

            <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shadow-inner">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg">Reports & Analytics</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
                Review daily, weekly, and monthly sales. Visual SVG bar charts trace transactions. Spot your top selling dishes on the Leaderboard and configure settings for peak efficiency.
              </p>
            </div>

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

      {/* CTA Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-6 md:px-12 border-t border-slate-800 text-center shrink-0">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-center">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
          </div>
          <p className="text-slate-200 text-sm font-extrabold">SmartDine QR SaaS Ordering System</p>
          <p className="text-xs text-slate-500">© 2026 SmartDine Inc. All rights reserved. Powered by Next.js & Supabase.</p>
        </div>
      </footer>

    </div>
  );
}
