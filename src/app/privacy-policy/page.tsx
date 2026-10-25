import Link from 'next/link';
import Footer from '@/components/Footer';
import { 
  ShieldCheck, ArrowLeft, Lock, Eye, Database, Server, UserCheck, 
  FileText, Mail, MapPin, Clock, AlertCircle, CheckCircle2, Trash2 
} from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | CleverOps (DPDP Act 2023 Compliant)',
  description: 'Official Privacy Policy and Data Protection practices of CleverOps in strict compliance with India\'s Digital Personal Data Protection Act, 2023 (DPDP Act) and DPDP Rules.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-20 shadow-xs">
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
            DPDP Act 2023 & DPDP Rules (2025–2026) Compliant
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Last Updated: October 2026. CleverOps (<strong>cleverops.in</strong>) operates in complete compliance with India&apos;s <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong> and the notified <strong>DPDP Rules (2025–2026)</strong> issued by MeitY.
          </p>
        </div>

        {/* Regulatory Summary Card */}
        <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>DPDP Statutory Notice & Processing Roles</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Under India&apos;s DPDP Act:
          </p>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc list-inside pl-2">
            <li><strong>The Restaurant</strong> acts as the primary <em>Data Fiduciary</em> for dining customers and outlet operations.</li>
            <li><strong>CleverOps</strong> acts as a certified <em>Data Processor</em> on behalf of the restaurant, and as a <em>Data Fiduciary</em> for restaurant owner accounts, staff logins, and cloud service billing.</li>
            <li><strong>You (The User / Diner / Staff)</strong> are the <em>Data Principal</em> with statutory rights to access, rectify, and erase your personal data.</li>
          </ul>
        </div>

        {/* Policy Content */}
        <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
          
          {/* Section 1: Itemized Categories */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              1. Itemized Categories of Personal Data Collected (Section 5)
            </h2>
            <p className="leading-relaxed text-xs sm:text-sm">
              In accordance with Section 5 of the DPDP Act, we only collect digital personal data that is strictly necessary for restaurant operations and digital order fulfillment:
            </p>
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">A. Restaurant Owners & Managers</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Full name, business email address, mobile phone number, hashed password, restaurant name, postal address, GSTIN, FSSAI registration, and active device identifiers.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">B. Dining Customers & Guests (QR Menu, Billing & Loyalty)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Customer name, mobile number, table number, and itemized food order logs. This data is collected to fulfill digital table orders, generate digital GST invoices, track loyalty reward points, and deliver exclusive dining offers, seasonal discounts, and festival coupons from the restaurant and CleverOps network. Viewing digital menus does <em>not</em> mandate entering a phone number.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">C. Restaurant Staff & Employees (Attendo HR)</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Staff name, mobile number, role, shift timings, attendance timestamps, and <strong>facial selfie photos</strong> captured solely to verify physical presence upon punching in/out. Selfies are securely retained and automatically pruned according to data retention schedules.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-1">D. Payment & Transaction Records</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Payment transaction IDs and settlement statuses processed via <strong>Razorpay</strong>. CleverOps <em>never</em> collects, processes, or stores raw credit/debit card numbers, CVVs, or UPI PINs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Purpose Limitation & Unbundled Consent */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              2. Purpose Limitation & Unbundled Consent (Section 6)
            </h2>
            <p className="leading-relaxed text-xs sm:text-sm">
              We abide strictly by the principle of Purpose Limitation. Your personal data is processed solely for specified, lawful business purposes:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li>Transmitting live order tickets from QR table menus to Kitchen Display Systems (KDS).</li>
              <li>Generating compliant digital GST bills, dual-tender split receipts, and downloadable invoices.</li>
              <li>Sending transactional order updates and digital receipts directly via WhatsApp or SMS.</li>
              <li><strong>Promotional Marketing, Offers & Loyalty:</strong> Sending curated festival offers, special discounts, new dish announcements, loyalty coupons, and re-engagement promotions from the dining restaurant and CleverOps platform via WhatsApp, SMS, or Email.</li>
              <li>Verifying staff shifts, attendance punctuality, and payroll calculations.</li>
              <li>Preventing software abuse and unauthorized multi-device access through active session security.</li>
            </ul>
            <div className="mt-3 p-3 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
              <strong>Promotional Offers & Consent Notice:</strong> By placing an order and providing contact details, customers consent to receiving transactional order notices as well as exclusive dining offers, discounts, and reward coupons from the restaurant and CleverOps. Under DPDP Rules 2026, customers retain the autonomous right to opt-out or unsubscribe from promotional marketing anytime by replying &ldquo;STOP&rdquo; on WhatsApp or emailing our Grievance Officer.
            </div>
          </section>

          {/* Section 3: Data Principal Rights */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-500" />
              3. Rights of Data Principals (DPDP Chapter III)
            </h2>
            <p className="leading-relaxed text-xs sm:text-sm">
              Under Sections 11, 12, 13, and 14 of the DPDP Act 2023, you hold the following statutory rights regarding your personal data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Right to Access (Sec. 11)
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Request a complete summary of your personal data processed by CleverOps.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Trash2 className="h-4 w-4 text-rose-500" /> Right to Erasure / Forgot (Sec. 12)
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Request deletion or anonymization of your contact number and dining history once the purpose is served.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-500" /> Right to Correction (Sec. 12)
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  Correct inaccurate, misleading, or outdated personal or profile details.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-purple-500" /> Right to Grievance (Sec. 13)
                </span>
                <p className="text-slate-500 dark:text-slate-400">
                  File a privacy complaint directly with our designated Grievance Officer.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <a
                href="mailto:deepak.soni19492@gmail.com?subject=DPDP%20Data%20Principal%20Request%20-%20CleverOps&body=Dear%20Grievance%20Officer%2C%0A%0AI%20am%20exercising%20my%20rights%20under%20the%20DPDP%20Act%202023.%0A%0ARequest%20Type%20(Access%20%2F%20Correction%20%2F%20Erasure)%3A%20%0AMy%20Registered%20Phone%20%2F%20Email%3A%20%0ARestaurant%20Name%20(if%20applicable)%3A%20%0ADetails%3A%20"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition shadow-xs"
              >
                <Mail className="h-4 w-4" /> Exercise DPDP Rights (Email Officer)
              </a>
              <span className="text-[11px] text-slate-400">
                Statutory resolution time: Within 30 calendar days.
              </span>
            </div>
          </section>

          {/* Section 4: Security Safeguards & 72-Hour Breach Reporting */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              4. Security Safeguards & 72-Hour Breach Protocol (Section 8)
            </h2>
            <p className="leading-relaxed text-xs sm:text-sm">
              We implement reasonable technical and organizational safeguards in accordance with Section 8(5) of the DPDP Act:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li><strong>Transport Security:</strong> All client, POS, and API traffic is encrypted using <strong>HTTPS / TLS 1.3</strong>.</li>
              <li><strong>Isolation:</strong> Multi-tenant databases are strictly segregated using <strong>Row Level Security (RLS)</strong> policies, preventing cross-restaurant data access.</li>
              <li><strong>Cryptographic Protection:</strong> User passwords are encrypted with industry-standard bcrypt cryptographic hashing.</li>
              <li><strong>Breach Notification:</strong> In the improbable event of a personal data breach, CleverOps commits to notifying the <strong>Data Protection Board of India (DPBI)</strong> and affected Data Principals within <strong>72 hours</strong> of confirmation, detailing the nature of the event and corrective actions taken.</li>
            </ul>
          </section>

          {/* Section 5: Data Retention & Automated Pruning */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              5. Data Retention & Erasure Policy (Section 8(7))
            </h2>
            <p className="leading-relaxed text-xs sm:text-sm">
              Under Section 8(7), personal data is retained only as long as required for satisfying the purpose of processing or compliance with applicable tax/accounting laws:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              <li><strong>Dining & Order Logs:</strong> Maintained for the active operational period of the restaurant and tax compliance.</li>
              <li><strong>Staff Attendance Selfies:</strong> Automatically pruned and permanently deleted periodically after verification.</li>
              <li><strong>Cancelled Sessions:</strong> Revoked device sessions and tokens are purged immediately upon session invalidation.</li>
            </ul>
          </section>

          {/* Section 6: Statutory Grievance Redressal Officer */}
          <section className="bg-slate-900 text-white dark:bg-slate-800/80 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-md">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              <ShieldCheck className="h-4 w-4" /> Mandatory Statutory Disclosure (DPDP Rules 2026)
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              6. Data Protection & Grievance Redressal Officer
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              If you have inquiries, complaints, or wish to exercise your rights under the Digital Personal Data Protection Act, please contact our designated Grievance Officer:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Officer Name & Designation</span>
                <span className="font-extrabold text-white text-sm">Deepak Kumar Soni</span>
                <span className="text-slate-300 block text-[11px]">Data Protection & Grievance Officer</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Privacy Email & Phone</span>
                <a href="mailto:deepak.soni19492@gmail.com" className="font-extrabold text-emerald-400 hover:underline text-sm block">
                  deepak.soni19492@gmail.com
                </a>
                <a href="tel:+917742054535" className="text-slate-300 hover:text-white block text-[11px]">
                  Direct: +91 77420 54535
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Registered Address</span>
                <span className="font-bold text-white block">CleverOps Technologies</span>
                <span className="text-slate-300 block text-[11px] leading-relaxed">
                  214, 2nd Floor, Riddhi Siddhi Complex, Madhuban, Udaipur, Rajasthan - 313001
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/80 dark:bg-slate-900/80 border border-slate-700/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Statutory Resolution Timeline</span>
                <span className="font-bold text-emerald-400 block">Within 30 Calendar Days</span>
                <span className="text-slate-300 block text-[11px]">Formal written resolution acknowledgement</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 pt-2">
              If a grievance is not resolved to your satisfaction within 30 days, Data Principals possess the statutory right to approach the <strong>Data Protection Board of India (DPBI)</strong> in accordance with Section 13(3) of the Act.
            </p>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
}
