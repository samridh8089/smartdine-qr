'use client';

import { useState, useRef, useMemo, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MockBanner from '@/components/shared/MockBanner';
import {
  UtensilsCrossed,
  Sparkles,
  Check,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  Coffee,
  Wine,
  ChefHat,
  Cake,
  Hotel,
  MapPin,
  Store,
  Phone,
  Mail,
  Lock,
  User,
  QrCode,
  AlertCircle
} from 'lucide-react';

const ESTABLISHMENT_TYPES = [
  { label: 'Restaurant', icon: UtensilsCrossed },
  { label: 'Cafe', icon: Coffee },
  { label: 'Bar & Pub', icon: Wine },
  { label: 'Cloud Kitchen', icon: ChefHat },
  { label: 'Bakery', icon: Cake },
  { label: 'Hotel & Dining', icon: Hotel },
];

const DEFAULT_PLANS = {
  trial: {
    id: 'trial',
    name: '3-Day Full Access Trial (₹3)',
    monthlyPrice: 3,
    yearlyPrice: 3,
    badge: '72-HR TRIAL',
    tagline: '100% all features unlocked for 3 days • No auto-debit',
    features: [
      'Interactive Digital QR Menu & Table Ordering',
      'Real-time Multi-KDS Kitchen Display with Timers',
      'Raw Material Inventory & Auto-Deductions',
      'AI Recipe Costing & Food Margin Intelligence',
      'Shift Cash Closing & Petty Cash Vouchers',
      'Staff Attendance, PIN Clock-in & Automated Payroll',
      'GST Billing, Thermal Printing & Dynamic UPI QR'
    ]
  },
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    badge: 'ESSENTIAL',
    tagline: 'Ideal for small cafes & food outlets',
    features: [
      'Interactive Digital QR Menu',
      'Table-side ordering (Scan to Order)',
      'Basic Kitchen Display (KDS)',
      'Billing & GST Compliant Invoices',
      'Daily Revenue & Order Reports'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    badge: 'MOST POPULAR',
    tagline: 'Best for busy restaurants & quick-service cafes',
    features: [
      'Everything in Starter Plan',
      'Real-time Multi-KDS Display',
      'Staff Role Management (Waiters, Chefs, Cashier)',
      'Live Table Floor Map & Occupancy',
      'Raw Material & Inventory Consumption',
      'WhatsApp Digital Receipts'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    badge: 'BEST VALUE',
    tagline: 'Full enterprise automation for high-volume dining',
    features: [
      'Everything in Pro Plan',
      'Automated Low-Stock Alerts & Recipe Engine',
      'Customer CRM & Loyalty Points System',
      'Multi-Counter Billing & Split Invoices',
      'Advanced Daily P&L & COGS Analytics',
      'Dedicated 24x7 Account Manager'
    ]
  }
};

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. All useState hooks
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string>('');

  // Step 2: OTP
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSessionId, setOtpSessionId] = useState<string>('');
  const [otpTimer, setOtpTimer] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Step 3: Restaurant
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [slug, setSlug] = useState<string>('');
  const [establishmentType, setEstablishmentType] = useState<string>('Restaurant');
  const [city, setCity] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [gstNumber, setGstNumber] = useState<string>('');
  const [fssaiNumber, setFssaiNumber] = useState<string>('');

  // Step 4: Plan
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'premium' | 'custom' | 'trial'>('starter');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [dpdpConsent, setDpdpConsent] = useState<boolean>(false);
  const [plansData, setPlansData] = useState<any>(DEFAULT_PLANS);

  // General states
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isProcessingPay, setIsProcessingPay] = useState<boolean>(false);
  const [provisionedData, setProvisionedData] = useState<any>(null);

  // 2. All useRef hooks
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. All useMemo hooks
  const activePrice = useMemo(() => {
    if (selectedPlan === 'trial') return 3;
    const planObj = plansData[selectedPlan] || DEFAULT_PLANS[selectedPlan as keyof typeof DEFAULT_PLANS];
    if (!planObj) return 499;
    return billingInterval === 'yearly' ? planObj.yearlyPrice : planObj.monthlyPrice;
  }, [plansData, selectedPlan, billingInterval]);

  // 4. All useCallback hooks
  const handleRestaurantNameChange = useCallback((val: string) => {
    setRestaurantName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(autoSlug);
  }, []);

  const loadRazorpayScript = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      if (typeof window !== 'undefined' && (window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  // 5. All useEffect hooks
  useEffect(() => {
    const plan = searchParams.get('plan');
    const interval = searchParams.get('interval');
    const lang = searchParams.get('lang');
    if (lang === 'en' || lang === 'hi') {
      localStorage.setItem('language', lang);
    }
    if (plan) {
      const p = plan.toLowerCase().trim();
      if (p === 'trial' || p === 'trial_3_days') {
        setSelectedPlan('trial');
      } else if (['starter', 'pro', 'premium', 'custom'].includes(p)) {
        setSelectedPlan(p as any);
      }
    }
    if (interval && ['monthly', 'yearly'].includes(interval)) {
      setBillingInterval(interval as any);
    }

    // Redirect logged-in restaurant owners to billing upgrade
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('restaurant_id')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: prof }) => {
            if (prof?.restaurant_id) {
              const targetPlanName = plan || 'pro';
              const targetInterval = interval || 'yearly';
              router.replace(`/dashboard/billing?plan=${targetPlanName}&interval=${targetInterval}&checkout=true`);
            }
          });
      }
    });

    // Fetch live plans from database
    supabase.from('pricing_plans').select('*').then(({ data: dbPlans }) => {
      if (dbPlans && dbPlans.length > 0) {
        const updated = { ...DEFAULT_PLANS };
        dbPlans.forEach((p: any) => {
          const pid = (p.id || '').toLowerCase();
          const rawFeatures = Array.isArray(p.features) ? p.features : [];
          const cleanFeatures = rawFeatures.filter((f: any) => typeof f === 'string' && !f.startsWith('__SPECS__'));
          (updated as any)[pid] = {
            id: pid,
            name: p.name || pid,
            monthlyPrice: Number(p.price_monthly) || 0,
            yearlyPrice: Number(p.price_yearly) || (Number(p.price_monthly) * 10),
            badge: pid === 'pro' ? 'MOST POPULAR' : pid === 'starter' ? 'ESSENTIAL' : 'BEST VALUE',
            tagline: p.description || '',
            features: cleanFeatures.length > 0 ? cleanFeatures : (DEFAULT_PLANS as any)[pid]?.features || [],
            plan_type: p.plan_type || (pid === 'custom' ? 'custom' : 'standard')
          };
        });
        setPlansData(updated);
      }
    });
  }, [searchParams, router]);

  // OTP Countdown timer
  useEffect(() => {
    if (currentStep === 2 && otpTimer > 0) {
      timerRef.current = setTimeout(() => setOtpTimer((t) => t - 1), 1000);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [currentStep, otpTimer]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const cd = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(cd);
    }
  }, [resendCooldown]);

  // ─── STEP 1: OWNER DETAILS SUBMIT ───────────────────────────────────────────
  const handleOwnerDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit phone number.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if email already registered with a restaurant
      const checkRes = await fetch('/api/auth/check-email-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });
      const checkData = await checkRes.json();

      if (checkData.exists) {
        setErrorMsg('An active restaurant is already linked to this email address. Please sign in instead.');
        setLoading(false);
        return;
      }

      // 2. Dispatch 8-digit OTP
      const otpRes = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          type: 'owner_email',
          recipientName: cleanName
        })
      });
      const otpData = await otpRes.json();

      if (!otpRes.ok || !otpData.success) {
        throw new Error(otpData.error || 'Failed to send verification code.');
      }

      if (otpData.sessionId) {
        setOtpSessionId(otpData.sessionId);
      }

      setOtpTimer(300);
      setResendCooldown(30);
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error initiating verification. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 2: VERIFY OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setErrorMsg('Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          emailOtp: cleanOtp,
          sessionId: otpSessionId,
          type: 'owner_email'
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.newSessionId) {
          setOtpSessionId(data.newSessionId);
        }
        throw new Error(data.error || 'Invalid or expired OTP. Please try again.');
      }

      setCurrentStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setErrorMsg('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          type: 'owner_email',
          recipientName: cleanName
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resend code');
      }
      if (data.sessionId) {
        setOtpSessionId(data.sessionId);
      }
      setOtpTimer(300);
      setResendCooldown(30);
    } catch (e: any) {
      setErrorMsg(e.message || 'Could not resend OTP right now.');
    }
  };

  // ─── STEP 3: RESTAURANT SETUP SUBMIT ─────────────────────────────────────────
  const handleRestaurantSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!restaurantName.trim()) {
      setErrorMsg('Please enter your restaurant name.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter your city.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter the full restaurant address.');
      return;
    }
    setCurrentStep(4);
  };

  // ─── STEP 4: PROCEED TO PAYMENT ─────────────────────────────────────────────
  const handleProceedToPayment = async () => {
    if (isProcessingPay) return;
    if (!dpdpConsent) {
      setErrorMsg('Please accept the Terms of Service & DPDP Act consent to proceed.');
      return;
    }

    if (selectedPlan === 'custom') {
      window.location.href = 'tel:8949266064';
      return;
    }

    setIsProcessingPay(true);
    setErrorMsg('');

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();
      const cleanName = fullName.trim();
      const cleanRestName = restaurantName.trim();
      const cleanSlug = slug.trim() || cleanRestName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Create real Razorpay order on server
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: activePrice,
          plan: selectedPlan === 'trial' ? 'trial_3_days' : selectedPlan,
          isTrial: selectedPlan === 'trial',
          restaurantName: cleanRestName,
          email: cleanEmail,
          billingInterval,
          isUpgrade: false,
          fullName: cleanName,
          phone: cleanPhone,
          password,
          restaurantType: establishmentType,
          city,
          address,
          slug: cleanSlug
        })
      });

      const orderData = await orderRes.json();

      if (orderData?.code === 'RESTAURANT_ALREADY_EXISTS') {
        throw new Error(`This email already owns restaurant: "${orderData.existingRestaurant?.name || cleanRestName}". Please sign in.`);
      }

      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway.');
      }

      const activeOrderId = orderData.order_id;
      const activeKey = orderData.keyId || orderData.key || 'rzp_live_TsAPJepoDRq53D';
      const amountInPaise = Math.round(activePrice * 100);

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: activeKey,
        amount: amountInPaise,
        currency: 'INR',
        name: 'CleverOps',
        description: `${selectedPlan.toUpperCase()} Plan Activation (${cleanRestName})`,
        image: '/logo.png',
        order_id: activeOrderId,
        handler: async function (response: any) {
          setIsProcessingPay(true);
          try {
            // Provision Restaurant & Owner account
            const provRes = await fetch('/api/auth/onboarding-provision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName: cleanName,
                email: cleanEmail,
                phone: cleanPhone,
                password,
                restaurantName: cleanRestName,
                restaurantType: establishmentType,
                city,
                address,
                gstNumber,
                fssaiNumber,
                slug: cleanSlug,
                plan: selectedPlan === 'trial' ? 'trial_3_days' : selectedPlan,
                isTrial: selectedPlan === 'trial',
                billingInterval,
                dpdpConsent: true,
                paymentDetails: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount: activePrice
                }
              })
            });

            const provData = await provRes.json();

            if (!provRes.ok || provData.error) {
              console.warn('[Onboarding Provision Warning]:', provData.error);
            }

            // Automatic sign-in to dashboard
            await supabase.auth.signInWithPassword({ email: cleanEmail, password });

            setProvisionedData({
              restaurant: provData.restaurant || { name: cleanRestName, slug: cleanSlug },
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id
            });
            setCurrentStep(5);
          } catch (provErr: any) {
            console.error('[Provision Exception]:', provErr);
            setProvisionedData({
              restaurant: { name: cleanRestName, slug: cleanSlug },
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id
            });
            setCurrentStep(5);
          } finally {
            setIsProcessingPay(false);
          }
        },
        prefill: {
          name: cleanName,
          email: cleanEmail,
          contact: cleanPhone
        },
        theme: {
          color: '#059669'
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPay(false);
          }
        }
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not launch payment gateway.');
      setIsProcessingPay(false);
    }
  };

  const steps = [
    { num: 1, label: 'Owner' },
    { num: 2, label: 'OTP' },
    { num: 3, label: 'Restaurant' },
    { num: 4, label: 'Plan' },
    { num: 5, label: 'Done' }
  ];

  return (
    <div className="w-full">
      {/* Step Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {steps.map((s, idx) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isDone
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-950/60'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : s.num}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] font-bold ${
                      isCurrent
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isDone
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 transition-all ${
                      currentStep > s.num ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 1: OWNER DETAILS
      ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <form onSubmit={handleOwnerDetailsSubmit} className="space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              Owner Details
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter primary owner credentials for login and security verification
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Kumar Sharma"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Owner Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Referral / Agent Code <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="e.g. AGENT100"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Continue to OTP Verification</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 2: OTP VERIFICATION
      ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 text-center">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Verify Email Address
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              We have dispatched an 8-digit verification code to: <br />
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{email}</strong>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 text-center mb-2">
              Enter 8-Digit Verification Code
            </label>
            <input
              type="text"
              maxLength={8}
              autoFocus
              required
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••••"
              className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Code expires in:{' '}
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button
              type="button"
              disabled={resendCooldown > 0}
              onClick={handleResendOtp}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-40 cursor-pointer"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="w-1/3 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Change Email
            </button>

            <button
              type="submit"
              disabled={loading || otpCode.length < 4}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify & Proceed to Restaurant Setup</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 3: RESTAURANT SETUP
      ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <form onSubmit={handleRestaurantSetupSubmit} className="space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              Restaurant Setup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure dining establishment details & digital menu QR slug
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Restaurant Name *
            </label>
            <input
              type="text"
              required
              value={restaurantName}
              onChange={(e) => handleRestaurantNameChange(e.target.value)}
              placeholder="e.g. Royal Haveli Restaurant"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Auto Slug & QR Preview */}
          <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-medium mb-1">
              <span>Auto-Generated QR Slug:</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{slug || 'yourrestaurant'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold pt-1 border-t border-emerald-100 dark:border-emerald-900/40">
              <QrCode className="h-3.5 w-3.5 text-emerald-600" />
              <span>Future Customer QR: <strong className="font-mono">cleverops.in/m/{slug || 'yourrestaurant'}</strong></span>
            </div>
          </div>

          {/* Establishment Type Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Establishment Type *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ESTABLISHMENT_TYPES.map((t) => {
                const IconComponent = t.icon;
                const isSelected = establishmentType === t.label;
                return (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setEstablishmentType(t.label)}
                    className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai / Jaipur / Delhi"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Full Restaurant Address *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Shop 12, Main Market Road"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                placeholder="27ABCDE1234F1Z5"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                FSSAI License <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={fssaiNumber}
                onChange={(e) => setFssaiNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="14-digit FSSAI number"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-1/4 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            <button
              type="submit"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
            >
              <span>Continue to Plan Selection</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 4: PLAN SELECTION & PAYMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Select SaaS Plan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Choose the best package for your dining operations
              </p>
            </div>

            {/* Monthly / Yearly Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  billingInterval === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  billingInterval === 'yearly'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Yearly
                <span className="text-[10px] bg-amber-400 text-slate-900 px-1 py-0.2 rounded font-extrabold">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="space-y-3">
            {Object.values(plansData).map((p: any) => {
              const isSelected = selectedPlan === p.id;
              const isCustom = p.id === 'custom' || p.plan_type === 'custom';
              const price = billingInterval === 'yearly' ? (p.yearlyPrice || p.monthlyPrice * 10) : p.monthlyPrice;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900 dark:text-white capitalize">
                          {p.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.tagline}
                      </p>
                    </div>

                    <div className="text-right">
                      {isCustom ? (
                        <span className="text-sm font-bold text-sky-600">Custom</span>
                      ) : (
                        <div>
                          <span className="text-lg font-black text-slate-900 dark:text-white">
                            ₹{price}
                          </span>
                          <span className="text-xs text-slate-400">/{billingInterval === 'yearly' ? 'yr' : 'mo'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && p.features && (
                    <ul className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900/40 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {p.features.slice(0, 4).map((f: string, i: number) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>

          {/* DPDP Act 2023 & Terms Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 dark:text-slate-400 select-none leading-relaxed">
              <input
                type="checkbox"
                required
                checked={dpdpConsent}
                onChange={(e) => setDpdpConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <span>
                I agree to CleverOps&apos;s{' '}
                <Link href="/terms" target="_blank" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy-policy" target="_blank" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Privacy Policy
                </Link>
                , and provide lawful consent under India&apos;s <strong>DPDP Act 2023</strong> to process restaurant, billing, and staff order data.
              </span>
            </label>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="w-1/4 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>

            {selectedPlan === 'custom' ? (
              <a
                href="tel:8949266064"
                className="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
              >
                <Phone className="h-4 w-4" />
                <span>Talk to Sales — 8949266064</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleProceedToPayment}
                disabled={isProcessingPay || !dpdpConsent}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
              >
                {isProcessingPay ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Opening Razorpay Secure Gateway...</span>
                  </div>
                ) : (
                  <>
                    <span>Proceed to Razorpay Checkout (₹{activePrice})</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 5: SUCCESS / ACTIVATION CELEBRATION
      ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 5 && (
        <div className="py-6 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Restaurant Successfully Activated!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Your {selectedPlan.toUpperCase()} Plan subscription is live.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Restaurant:</span>
              <span className="text-slate-900 dark:text-white font-bold">
                {provisionedData?.restaurant?.name || restaurantName}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Payment ID:</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {provisionedData?.paymentId || 'pay_verified'}
              </span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Order ID:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {provisionedData?.orderId || 'ord_live'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Open Restaurant Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SignInLink() {
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang');
  return (
    <Link
      href={lang ? `/login?lang=${lang}` : '/login'}
      className="font-bold text-emerald-600 hover:text-emerald-500 transition-colors"
    >
      Sign in to existing account
    </Link>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <MockBanner />

      <div className="flex-1 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-xl">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-white shadow-md border border-slate-200/80 flex items-center justify-center p-2.5">
              <img src="/logo.png" alt="CleverOps Logo" className="h-full w-full object-contain" />
            </div>
          </div>
          <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Restaurant Account
          </h2>
          <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            CleverOps Onboarding & Activation · Or{' '}
            <Suspense fallback={<span>sign in</span>}>
              <SignInLink />
            </Suspense>
          </p>
        </div>

        <div className="mt-6 sm:mx-auto w-full sm:max-w-xl">
          <div className="bg-white dark:bg-slate-900 py-7 px-5 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl sm:px-8">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <SignupContent />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
