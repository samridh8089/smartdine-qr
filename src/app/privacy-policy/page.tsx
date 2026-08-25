import Link from 'next/link';
import Footer from '@/components/Footer';
import { ShieldCheck, ArrowLeft, Lock, Eye, Database, Server, UserCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | CleverOps',
  description: 'Privacy Policy and data protection details for CleverOps software.',
};

export default function PrivacyPolicyPage() {
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
          Contact Support
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 md:px-12 py-12 space-y-8">
        
        {/* Banner Title */}
        <div className="space-y-4 text-center border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wide uppercase">
            <Lock className="h-4 w-4" />
            Data Protection & Security
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            Last Updated: July 2026. CleverOps (cleverops.in) is committed to keeping your restaurant data, customer records, and system security completely private and confidential.
          </p>
        </div>

        {/* Policy Content */}
        <div className="space-y-8 text-sm text-slate-600 dark:text-slate-300">
          
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              1. Information We Collect
            </h2>
            <p className="leading-relaxed">
              When you register and use CleverOps, we collect essential operational data required to deliver QR ordering services:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-300">
              <li><strong>Account & Business Data:</strong> Restaurant name, owner name, business email address, phone number, and physical address.</li>
              <li><strong>Operational Data:</strong> Menu items, prices, table numbers, QR codes, and sales records.</li>
              <li><strong>Transactional Data:</strong> Payment order IDs processed via Razorpay. We <em>never</em> store raw credit card numbers or UPI PINs on our servers.</li>
            </ul>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              2. How We Use Your Data
            </h2>
            <p className="leading-relaxed">
              We use the collected information strictly for restaurant software operations:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-300">
              <li>Generating live digital menus and QR tickets for dining tables.</li>
              <li>Realtime synchronization between Kitchen KDS and Waiter Calling App.</li>
              <li>Processing subscription plan upgrades via Razorpay.</li>
              <li>Sending essential system alerts and technical support updates.</li>
            </ul>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              3. Data Security & Storage
            </h2>
            <p className="leading-relaxed">
              Your restaurant data is protected with enterprise-grade security protocols:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-300">
              <li>All web traffic is encrypted end-to-end via <strong>HTTPS / TLS 1.3 SSL Encryption</strong>.</li>
              <li>Database access is enforced using <strong>Supabase Row Level Security (RLS)</strong> so no unauthorized third party can view your sales logs.</li>
              <li>We perform automated daily database backups to prevent data loss.</li>
            </ul>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-500" />
              4. No Third-Party Data Selling
            </h2>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              CleverOps does <strong>NOT sell, rent, trade, or monetize</strong> your restaurant information or your customers' dining data to any third-party marketing agencies. Data is strictly utilized for your software experience.
            </p>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
}
