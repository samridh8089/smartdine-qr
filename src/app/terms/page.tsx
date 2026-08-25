import Link from 'next/link';
import Footer from '@/components/Footer';
import { ShieldCheck, ArrowLeft, FileText, Scale, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service & Disclaimer | CleverOps',
  description: 'Terms and conditions governing the use of CleverOps QR ordering system and SaaS software.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
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
            <FileText className="h-4 w-4" />
            Terms of Service & Usage
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Terms of Service & Disclaimer
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            By accessing or using cleverops.in or CleverOps Mobile applications, you agree to be bound by these terms.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 text-sm text-slate-600 dark:text-slate-300">
          
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              1. Software License & Account Responsibility
            </h2>
            <p className="leading-relaxed">
              CleverOps grants registered restaurant owners a non-exclusive, subscription-based license to utilize our QR ordering, Kitchen KDS, POS, and Waiter calling features. You are responsible for maintaining the confidentiality of your staff login credentials.
            </p>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-500" />
              2. Subscription Billing & Razorpay Payments
            </h2>
            <p className="leading-relaxed">
              Subscription fees for Monthly or Yearly SaaS plans are billed via our Razorpay payment gateway integration. Billing intervals, plan tier limits (number of tables and menu items), and pricing are detailed on our Billing page.
            </p>
          </section>

          <section id="disclaimer" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              3. Service Disclaimer & Technical Guarantee SLA
            </h2>
            <p className="leading-relaxed">
              While CleverOps strives for 99.9% platform availability, service access is dependent on active internet connection at your restaurant premises.
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-lg text-slate-800 dark:text-slate-200 font-medium">
              <strong>Technical Resolution SLA:</strong> As outlined in our Refund Policy, if a core software bug occurs and our engineering team cannot resolve it within 3 to 4 working days, a 100% full money refund will be issued.
            </div>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              4. Governing Law
            </h2>
            <p className="leading-relaxed">
              These terms shall be governed by and construed in accordance with the laws of India, under the jurisdiction of courts in New Delhi.
            </p>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
}
