import Link from 'next/link';
import Footer from '@/components/Footer';
import { ShieldCheck, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock, Mail, Phone } from 'lucide-react';

export const metadata = {
  title: 'Cancellation & Refund Policy | CleverOps',
  description: 'Understand the cancellation and 100% full money-back guarantee policy for CleverOps subscription plans.',
};

export default function RefundPolicyPage() {
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
            <RefreshCw className="h-4 w-4" />
            Fair & Transparent Policy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Cancellation & Refund Policy
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto">
            At CleverOps (cleverops.in), we are committed to delivering top-tier reliability for your restaurant operations. Read our explicit refund and technical resolution guarantees below.
          </p>
        </div>

        {/* Highlight Guarantee Box */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Our 3-4 Working Days Technical Resolution & Full Money-Back Guarantee
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">
                100% Satisfaction SLA Commitment
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            If any technical problem, platform bug, or system failure occurs in the CleverOps software that prevents your restaurant from utilizing your active subscription, and our engineering team is <span className="font-extrabold text-slate-900 dark:text-white underline decoration-emerald-500 decoration-2">unable to resolve the issue within 3 to 4 working days</span> from the time it is formally reported, <span className="font-extrabold text-emerald-600 dark:text-emerald-400">a 100% full money refund will be issued back to your original payment method</span> without any penalty or hassle.
          </p>
        </div>

        {/* Policy Detail Sections */}
        <div className="space-y-8 text-sm text-slate-600 dark:text-slate-300">
          
          {/* Section 1: Refund Eligibility */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              1. Refund Eligibility Criteria
            </h2>
            <p className="leading-relaxed">
              Refund requests are valid and processed under the following scenarios:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-300">
              <li>
                <strong>Unresolved Technical Issues (SLA Clause):</strong> As stated above, if a core software problem or bug reported by your restaurant is not resolved within <strong>3 to 4 working days</strong>, you are eligible for a 100% full refund.
              </li>
              <li>
                <strong>Duplicate Charges:</strong> If your bank account or card was charged twice due to a payment gateway error during subscription checkout.
              </li>
              <li>
                <strong>Accidental Renewal:</strong> Requests made within 24 hours of an automatic subscription renewal before system utilization.
              </li>
            </ul>
          </section>

          {/* Section 2: Non-Refundable Circumstances */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              2. Non-Refundable Conditions
            </h2>
            <p className="leading-relaxed">
              Refunds will not be issued in the following instances:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-300">
              <li>Change of mind after 4 working days of active usage without any technical software fault.</li>
              <li>Third-party hardware failure (e.g. internet disconnection at restaurant, damaged thermal printer, or damaged tablet/smartphone).</li>
              <li>Violation of CleverOps Terms of Service resulting in account suspension.</li>
            </ul>
          </section>

          {/* Section 3: How Refund Process Works */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              3. Refund Processing Timeline
            </h2>
            <p className="leading-relaxed">
              Once a refund request is approved under our 3-4 working days SLA policy or duplicate payment check:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-slate-700 dark:text-slate-300">
              <li><strong>Processing Time:</strong> Refunds are initiated within <strong>24 to 48 hours</strong> of approval.</li>
              <li><strong>Credit Timeline:</strong> It takes <strong>5 to 7 working days</strong> for the refunded amount to reflect in your original bank account, UPI ID, or Credit/Debit Card through our payment gateway partner (Razorpay).</li>
            </ul>
          </section>

          {/* Section 4: Subscription Cancellation */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-amber-500" />
              4. Subscription Cancellation Procedure
            </h2>
            <p className="leading-relaxed">
              You can cancel your subscription at any time from your Billing Dashboard (<code className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">/dashboard/billing</code>). Upon cancellation, your account will remain active until the end of the current paid billing cycle.
            </p>
          </section>

          {/* Section 5: How to Claim a Refund */}
          <section className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              5. How to File a Technical Bug Report or Claim Refund
            </h2>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              To report a software issue or claim a refund under our 3-4 working days SLA guarantee, please send an email with your registered Restaurant Name, Email ID, and issue details to:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a 
                href="mailto:dsoni1281@gmail.com?subject=Refund%20/%20Technical%20Issue%20Claim" 
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-md transition-all"
              >
                <Mail className="h-4 w-4" /> Email: dsoni1281@gmail.com
              </a>
              <a 
                href="tel:+917742054535" 
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-lg transition-all"
              >
                <Phone className="h-4 w-4 text-emerald-500" /> Phone: +91 77420 54535
              </a>
            </div>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
}
