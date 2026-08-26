import Link from 'next/link';
import Footer from '@/components/Footer';
import { ArrowLeft, UtensilsCrossed, Sparkles, ChefHat, QrCode, ShieldCheck, Zap, Users } from 'lucide-react';

export const metadata = {
  title: 'About Us | CleverOps',
  description: 'Empowering restaurants across India with next-generation QR ordering, Kitchen KDS, POS, and instant staff calling.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        <Link href="/" className="font-extrabold text-lg text-slate-900 dark:text-white">
          CleverOps
        </Link>
        <Link href="/contact" className="text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors">
          Contact Us
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 md:px-12 py-12 space-y-12">
        
        {/* Hero Banner */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase">
            <Sparkles className="h-4 w-4" />
            Our Story & Mission
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Revolutionizing Restaurant Operations Across India
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
            CleverOps (cleverops.in) was built with a single goal: to eliminate long ordering wait times, reduce kitchen order errors, and empower restaurants with a seamless digital dining experience.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <QrCode className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Contactless QR Ordering</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Customers scan a unique QR code on their dining table to view rich digital menus with photos, place multi-batch orders, and request waiter assistance.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ChefHat className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Realtime Kitchen KDS</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Kitchen staff receive instant cooking tickets, batch breakdown, and realtime order updates that display continuously until tickets are accepted.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl space-y-3 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Smart Waiter App</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Waiters get instant alerts on mobile when food is ready to serve or when customers call for bill payments.
            </p>
          </div>

        </div>

        {/* Commitment Box */}
        <div className="bg-slate-900 text-white rounded-2xl p-8 md:p-10 space-y-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-black">Our Commitment to Quality & Support</h2>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
            We back our software with our 3-4 working days SLA technical resolution money-back guarantee, 24x7 customer support, and Razorpay verified billing.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Link href="/signup">
              <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg transition-all cursor-pointer">
                Start Free Trial Now
              </button>
            </Link>
            <Link href="/contact">
              <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-6 py-3 rounded-xl text-sm border border-slate-700 transition-all cursor-pointer">
                Contact Sales
              </button>
            </Link>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
