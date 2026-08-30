'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import MockBanner from '@/components/shared/MockBanner';
import { UtensilsCrossed, Sparkles } from 'lucide-react';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Selected Plan from URL params
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'premium' | 'trial'>('starter');
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  const isTrialMode = selectedPlan === 'trial';

  useEffect(() => {
    const plan = searchParams.get('plan');
    const interval = searchParams.get('interval');
    if (plan && ['starter', 'pro', 'premium', 'trial'].includes(plan)) {
      setSelectedPlan(plan as any);
    }
    if (interval && ['monthly', 'yearly'].includes(interval)) {
      setBillingInterval(interval as any);
    }
  }, [searchParams]);

  const handleRestaurantNameChange = (val: string) => {
    setRestaurantName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    setSlug(autoSlug);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
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
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const targetPlan = isTrialMode ? 'starter' : selectedPlan;

    // ─── TRIAL MODE: AUTO-PROVISION 3-DAY TRIAL ────────────────────────────────
    if (isTrialMode) {
      try {
        const res = await fetch('/api/auth/onboarding-provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName,
            email,
            phone,
            password,
            restaurantName,
            slug,
            plan: 'starter',
            billingInterval,
            paymentDetails: { isDemo: true, razorpay_payment_id: `trial_${Date.now()}`, razorpay_order_id: `ord_trial_${Date.now()}`, amount: 0 }
          })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to create trial account');
        }

        await supabase.auth.signInWithPassword({ email, password });
        router.push('/dashboard');
        return;
      } catch (trialErr: any) {
        setError(trialErr.message || 'Trial registration failed');
        setLoading(false);
        return;
      }
    }

    // ─── PAID PLAN: FETCH LIVE PRICING FROM SUPABASE PRICING_PLANS DB TABLE ───
    let amount = 999;
    try {
      const { data: dbPlan } = await supabase.from('pricing_plans').select('*').eq('id', targetPlan).maybeSingle();
      
      if (dbPlan?.plan_type === 'custom' || dbPlan?.id === 'custom' || targetPlan === ('custom' as any)) {
        window.location.href = 'tel:8949266064';
        setLoading(false);
        return;
      }

      if (dbPlan) {
        amount = billingInterval === 'yearly' 
          ? (Number(dbPlan.price_yearly) || Number(dbPlan.price_monthly) * 10)
          : Number(dbPlan.price_monthly);
      } else {
        const fallbackPrices: Record<string, { monthly: number; yearly: number }> = {
          starter: { monthly: 499, yearly: 4990 },
          pro: { monthly: 999, yearly: 9990 },
          premium: { monthly: 1999, yearly: 19990 }
        };
        amount = billingInterval === 'yearly' ? fallbackPrices[targetPlan]?.yearly || 9990 : fallbackPrices[targetPlan]?.monthly || 999;
      }
    } catch (planFetchErr) {
      console.warn('[Signup] DB plan fetch warning:', planFetchErr);
    }

    try {
      // 1. Create Razorpay Order
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          plan: targetPlan,
          restaurantName,
          billingInterval
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || orderData.error) {
        throw new Error(orderData.error || 'Could not initialize payment order');
      }

      // 2. Load SDK
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error('Razorpay Checkout could not be loaded. Please check internet connection.');
      }

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId || 'rzp_live_TK1Nbl3mJiENjR',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'CleverOps',
        description: `Restaurant Onboarding - ${targetPlan.toUpperCase()} Plan`,
        image: '/logo.png',
        order_id: orderData.order_id || orderData.orderId,
        handler: async function (response: any) {
          try {
            // 4. Verify Signature & Provision Restaurant on Backend
            const provisionRes = await fetch('/api/auth/onboarding-provision', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fullName,
                email,
                phone,
                password,
                restaurantName,
                slug,
                plan: targetPlan,
                billingInterval,
                paymentDetails: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  amount
                }
              })
            });

            const provData = await provisionRes.json();
            if (!provisionRes.ok || provData.error) {
              setError(provData.error || 'Payment verification failed on server.');
              setLoading(false);
              return;
            }

            // 5. Sign In & Redirect to Dashboard
            await supabase.auth.signInWithPassword({ email, password });
            router.push('/dashboard');
          } catch (e: any) {
            setError(e.message || 'Onboarding error after payment');
            setLoading(false);
          }
        },
        prefill: {
          name: fullName,
          email: email,
          contact: phone
        },
        theme: {
          color: '#059669'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.open();
    } catch (payErr: any) {
      console.error('[Web Signup Error]:', payErr);
      setError(payErr.message || 'Payment initiation failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSignup} method="POST" autoComplete="off">
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      )}

      {/* Show pre-selected plan badge */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-400">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Selected Plan: <span className="capitalize">{selectedPlan}</span> ({billingInterval})</span>
        </div>
        <Link href="/#pricing" className="underline hover:text-emerald-900 dark:hover:text-emerald-300">Change</Link>
      </div>

      <Input
        label="Full Name"
        type="text"
        required
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="John Doe"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Email address"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <Input
          label="Phone Number"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="e.g. +91 99999 88888"
        />
      </div>

      <Input
        label="Password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
      />

      <Input
        label="Restaurant Name"
        type="text"
        required
        value={restaurantName}
        onChange={(e) => handleRestaurantNameChange(e.target.value)}
        placeholder="The Bistro Cafe"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Menu URL Slug
        </label>
        <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 overflow-hidden bg-slate-50 dark:bg-slate-900">
          <span className="inline-flex items-center px-3 text-slate-400 dark:text-slate-500 text-xs md:text-sm select-none border-r border-slate-200 dark:border-slate-800">
            cleverops.in/m/
          </span>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
            className="block flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-none outline-none"
            placeholder="bistro-cafe"
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          This is the URL your customers will scan to access the digital menu.
        </p>
      </div>

      <Button type="submit" className="w-full cursor-pointer" isLoading={loading}>
        Proceed to Payment & Activate
      </Button>
    </form>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <MockBanner />
      
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto w-full sm:max-w-md">
          <div className="flex justify-center">
            <img src="/logo.png" alt="CleverOps Logo" className="h-14 w-auto object-contain drop-shadow-md" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Register & Activate Restaurant
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
            Or{' '}
            <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
              sign in to your existing account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto w-full sm:max-w-md">
          <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-100 dark:border-slate-800 shadow-xl rounded-2xl sm:px-10">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }>
              <SignupForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
