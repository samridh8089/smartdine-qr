'use client';

import { useState, useEffect } from 'react';
import { useRestaurant } from '../../layout';
import { db, Restaurant, PricingPlan, getEffectiveSubscriptionStatus } from '@/lib/db';
import { parsePlanSpec } from '@/lib/entitlements';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  CreditCard, Check, AlertTriangle, Clock, 
  Sparkles, Trash2, ShieldAlert
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { supabase, getActiveUser } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import ResourceUsageCard from '@/components/shared/ResourceUsageCard';

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurant, profile, planSpec, refresh } = useRestaurant();
  const [tablesCount, setTablesCount] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [staffCount, setStaffCount] = useState(1);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [aiMenuUsage, setAiMenuUsage] = useState<{ used: number; limit: number | null }>({ used: 0, limit: planSpec?.ai_limits?.ai_menu_analysis ?? null });
  const [aiRecipeUsage, setAiRecipeUsage] = useState<{ used: number; limit: number | null }>({ used: 0, limit: planSpec?.ai_limits?.ai_recipe_generation ?? null });
  const [loading, setLoading] = useState(true);

  // Billing pricing interval state
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);

  // Deletion state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function loadBilling() {
      let activeRest = restaurant;
      let restId = activeRest?.id;
      let loadedPlans: PricingPlan[] = [];

      try {
        if (!restId) {
          const user = await getActiveUser();
          if (user?.restaurant_id) {
            restId = user.restaurant_id;
            activeRest = await db.getRestaurantById(user.restaurant_id);
          }
        }

        if (restId) {
          // Load counts and AI usage in parallel
          const [tables, items, staffRes, invRes, mUsageRes, rUsageRes, plans] = await Promise.all([
            db.getTables(restId).catch(() => []),
            db.getMenuItems(restId).catch(() => []),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('restaurant_id', restId),
            supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restId),
            fetch(`/api/ai-usage/check?restaurantId=${restId}&featureKey=ai_menu_analysis`).catch(() => null),
            fetch(`/api/ai-usage/check?restaurantId=${restId}&featureKey=ai_recipe_generation`).catch(() => null),
            db.getPricingPlans().catch(() => [])
          ]);

          setTablesCount(tables.length);
          setItemsCount(items.length);
          setStaffCount(staffRes.count || 1);
          setInventoryCount(invRes.count || 0);

          if (mUsageRes && mUsageRes.ok) {
            const mData = await mUsageRes.json();
            setAiMenuUsage({ used: mData.used, limit: mData.limit });
          }
          if (rUsageRes && rUsageRes.ok) {
            const rData = await rUsageRes.json();
            setAiRecipeUsage({ used: rData.used, limit: rData.limit });
          }

          loadedPlans = plans;
          setPricingPlans(plans);
        } else {
          const plans = await db.getPricingPlans().catch(() => []);
          loadedPlans = plans;
          setPricingPlans(plans);
        }
      } catch (e) {
        console.error('Error loading billing info:', e);
      } finally {
        setLoading(false);
      }

      const intervalParam = searchParams.get('interval');
      if (intervalParam && ['monthly', 'yearly'].includes(intervalParam)) {
        setBillingInterval(intervalParam as any);
      } else if (activeRest?.billing_interval) {
        setBillingInterval(activeRest.billing_interval);
      }

      // Auto-open Razorpay Modal if redirected after signup
      const checkoutParam = searchParams.get('checkout');
      const planParam = searchParams.get('plan');
      if (checkoutParam === 'true' && planParam && ['starter', 'pro', 'premium'].includes(planParam)) {
        setTimeout(() => {
          handleUpgradePlan(planParam as any, loadedPlans);
        }, 300);
      }
    }
    loadBilling();
  }, [restaurant, searchParams]);

  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);

  // Load Razorpay script dynamically
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

  const handleUpgradePlan = async (planId: 'starter' | 'pro' | 'premium', loadedPlans?: PricingPlan[]) => {
    if (!restaurant || !profile) return;
    
    const targetPlans = (loadedPlans && loadedPlans.length > 0) ? loadedPlans : pricingPlans;

    const targetPlanRow = (loadedPlans || []).find(p => p.id.toLowerCase() === planId.toLowerCase());
    const targetSpec = parsePlanSpec(targetPlanRow || { id: planId });
    const targetMaxTables = targetSpec.limits.tables;
    const targetMaxItems = targetSpec.limits.menu_items;

    if (targetMaxTables !== null && tablesCount > targetMaxTables) {
      alert(`Cannot downgrade to ${targetSpec.name}: You have ${tablesCount} tables, which exceeds the limit of ${targetMaxTables}. Delete tables before downgrading.`);
      return;
    }
    if (targetMaxItems !== null && itemsCount > targetMaxItems) {
      alert(`Cannot downgrade to ${targetSpec.name}: You have ${itemsCount} menu items, which exceeds the limit of ${targetMaxItems}. Delete menu items before downgrading.`);
      return;
    }

    const defaultPrices: Record<string, { monthly: number; yearly: number }> = {
      starter: { monthly: 299, yearly: 2500 },
      pro: { monthly: 799, yearly: 6000 },
      premium: { monthly: 1499, yearly: 10000 },
    };

    let selectedPlan = targetPlans.find(p => p.id === planId);

    // If plans not loaded into state yet, fetch directly from DB to get the live price set by Super Admin
    if (!selectedPlan) {
      try {
        const freshPlans = await db.getPricingPlans();
        selectedPlan = freshPlans.find(p => p.id === planId);
      } catch (e) {}
    }

    const fallbackPrice = defaultPrices[planId] || { monthly: 299, yearly: 2990 };
    const amount = billingInterval === 'yearly' 
      ? (selectedPlan?.price_yearly ?? fallbackPrice.yearly) 
      : (selectedPlan?.price_monthly ?? fallbackPrice.monthly);

    // Free plan upgrade only if explicitly 0
    if (amount <= 0) {
      try {
        await db.updateRestaurantPlan(restaurant.id, planId, 'active');
        await db.updateRestaurant(restaurant.id, { billing_interval: billingInterval });
        await refresh();
        alert(`Success! Your subscription has been updated to the ${planId.toUpperCase()} plan.`);
      } catch (err: any) {
        alert(`Upgrade failed: ${err.message}`);
      }
      return;
    }

    // Process Razorpay Payment
    setPaymentLoading(planId);
    try {
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          plan: planId,
          restaurantId: restaurant.id,
          billingInterval,
        }),
      });

      const orderData = await res.json();
      if (!res.ok || orderData.error) {
        alert(`Payment initialization error: ${orderData.error || 'Failed to create order'}`);
        setPaymentLoading(null);
        return;
      }

      // If keys are not configured in .env yet, activate in Test/Demo mode
      if (orderData.isDemo) {
        await db.updateRestaurantPlan(restaurant.id, planId, 'active');
        await db.updateRestaurant(restaurant.id, { billing_interval: billingInterval });
        await refresh();
        alert(`Subscription Activated! Upgraded to ${planId.toUpperCase()} Plan.`);
        setPaymentLoading(null);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
        setPaymentLoading(null);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'CleverOps',
        description: `Upgrade to ${selectedPlan?.name || planId} Plan (${billingInterval})`,
        image: '/favicon.ico',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                restaurantId: restaurant.id,
                plan: planId,
                billingInterval,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.verified) {
              await db.updateRestaurantPlan(restaurant.id, planId, 'active');
              await db.updateRestaurant(restaurant.id, { billing_interval: billingInterval });
              await db.createAuditLog(
                restaurant.id,
                profile.id,
                profile.email,
                'update_subscription',
                `Paid ₹${amount} via Razorpay (ID: ${response.razorpay_payment_id}) for ${planId.toUpperCase()} Plan (${billingInterval})`
              );
              await refresh();
              alert(`Payment Successful! Your subscription is now active on the ${planId.toUpperCase()} Plan.`);
            } else {
              alert(`Payment verification failed: ${verifyData.error}`);
            }
          } catch (e: any) {
            alert(`Payment verification error: ${e.message}`);
          } finally {
            setPaymentLoading(null);
          }
        },
        prefill: {
          name: restaurant.name || 'Restaurant Owner',
          email: profile.email || '',
        },
        theme: {
          color: '#059669', // Emerald theme
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(null);
          },
        },
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.open();
    } catch (err: any) {
      alert(`Razorpay error: ${err.message}`);
      setPaymentLoading(null);
    }
  };

  const handleDeleteRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant || !profile) return;

    if (deleteConfirmText.trim().toLowerCase() !== 'delete my restaurant') {
      alert('Confirmation text mismatch. Please type exactly: delete my restaurant');
      return;
    }

    if (!confirm('WARNING! This will permanently delete your restaurant, menus, tables, orders, and staff credentials. This action is IRREVERSIBLE. Are you absolutely sure?')) {
      return;
    }

    setDeleteLoading(true);
    try {
      await db.deleteRestaurant(restaurant.id);
      alert('Your restaurant account has been permanently deleted.');
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: any) {
      alert('Deletion failed: ' + err.message);
      setDeleteLoading(false);
    }
  };

  if (loading || !restaurant) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  const activePlan = restaurant.subscription_plan || 'starter';

  // Helper description mapping for plans
  const planDescriptions: Record<string, string> = {
    starter: 'Ideal for small cafes or pop-up bistros testing QR ordering.',
    pro: 'Perfect for standard restaurants looking to optimize workflows.',
    premium: 'Best for large multi-room dining lounges and high volume outlets.'
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Billing & SaaS Subscriptions</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your SaaS billing plans, usage limits, and trial status.</p>
      </div>

      {/* Current plan status & usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subscription Status Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between py-4">
            <h3 className="font-bold text-sm text-slate-400 dark:text-slate-500 uppercase tracking-wider">Subscription Status</h3>
            {(() => {
              const status = getEffectiveSubscriptionStatus(restaurant);
              if (status === 'active') return <Badge variant="success">Active</Badge>;
              if (status === 'trial') return <Badge variant="warning">Trialing</Badge>;
              if (status === 'cancelled') return <Badge variant="error">Cancelled</Badge>;
              if (status === 'past_due') return <Badge variant="error">Past Due</Badge>;
              return <Badge variant="error">Expired</Badge>;
            })()}
          </CardHeader>
          <CardContent className="py-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Current Plan</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white capitalize mt-1">
                {activePlan} ({restaurant.billing_interval || 'monthly'})
              </h4>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-3 rounded-xl">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {(() => {
                  const status = getEffectiveSubscriptionStatus(restaurant);
                  const expiryStr = restaurant.trial_ends_at ? new Date(restaurant.trial_ends_at).toLocaleDateString() : '';
                  if (status === 'expired' || status === 'past_due' || status === 'cancelled') {
                    return `Subscription expired on ${expiryStr || 'N/A'}. Please select a plan below to renew.`;
                  }
                  if (status === 'active') {
                    return `Active until ${expiryStr}`;
                  }
                  return `Free trial ends on ${expiryStr}`;
                })()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Resource Summary Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResourceUsageCard
            title="Dining Tables"
            used={tablesCount}
            limit={planSpec?.limits?.tables ?? null}
            unitLabel="tables created"
            compact
          />
          <ResourceUsageCard
            title="Menu Items"
            used={itemsCount}
            limit={planSpec?.limits?.menu_items ?? null}
            unitLabel="items created"
            compact
          />
          <ResourceUsageCard
            title="Staff Logins"
            used={staffCount}
            limit={planSpec?.limits?.staff_accounts ?? null}
            unitLabel="accounts"
            compact
          />
          <ResourceUsageCard
            title="Inventory Items"
            used={inventoryCount}
            limit={planSpec?.limits?.inventory_items ?? null}
            unitLabel="raw items"
            isLocked={planSpec?.features?.inventory === false || planSpec?.limits?.inventory_items === 0}
            lockedMessage="Available on PRO and PREMIUM"
            compact
          />
        </div>
      </div>

      {/* Dedicated AI Feature Quotas Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            AI Feature Quotas & Monthly Usage
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time monthly credits for automated menu digitization and AI recipe formulation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResourceUsageCard
            title="AI Menu Item Credits"
            used={aiMenuUsage.used}
            limit={aiMenuUsage.limit}
            unitLabel="credits used"
            isLocked={planSpec?.features?.ai_menu === false || aiMenuUsage.limit === 0}
            lockedMessage="Available on PRO and PREMIUM"
            resetNote="1 extracted menu item = 1 AI credit. Resets monthly."
          />
          <ResourceUsageCard
            title="AI Recipe Item Credits"
            used={aiRecipeUsage.used}
            limit={aiRecipeUsage.limit}
            unitLabel="credits used"
            isLocked={planSpec?.features?.ai_recipe === false || aiRecipeUsage.limit === 0}
            lockedMessage="Available on PRO and PREMIUM"
            resetNote="1 generated recipe = 1 AI credit. Resets monthly."
          />
        </div>
      </div>

      {/* Pricing Matrix */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Upgrade Plans
          </h3>

          {/* Monthly / Yearly Switch Toggle */}
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                billingInterval === 'yearly'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Yearly Billing (10% Off)
            </button>
          </div>
        </div>
        
        {/* 3-Column Standard Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {(() => {
            const standardPlans = pricingPlans.filter(p => {
              const pid = p.id.toLowerCase();
              return pid === 'starter' || pid === 'pro' || pid === 'premium';
            });

            return standardPlans.map(plan => {
              const effStatus = getEffectiveSubscriptionStatus(restaurant);
              const isCurrentlyActive = effStatus === 'active' && activePlan === plan.id && billingInterval === (restaurant.billing_interval || 'monthly');
              const isExpiredCurrentPlan = effStatus !== 'active' && activePlan === plan.id;
              const price = billingInterval === 'yearly' ? plan.price_yearly : plan.price_monthly;
              const pricePeriod = billingInterval === 'yearly' ? '/year' : '/month';

              const maxTbls = plan.max_tables ?? 0;
              const maxItms = plan.max_items ?? 0;
              const limitsText = maxTbls >= 9999 && maxItms >= 9999
                ? 'Unlimited tables & menu items' 
                : `Up to ${maxTbls >= 9999 ? 'Unlimited' : maxTbls} tables & ${maxItms >= 9999 ? 'Unlimited' : maxItms} menu items`;

              return (
                <Card 
                  key={plan.id} 
                  className={`flex flex-col justify-between transition-all duration-300 relative ${
                    isCurrentlyActive ? 'ring-2 ring-emerald-500 shadow-xl shadow-emerald-500/10' : isExpiredCurrentPlan ? 'ring-2 ring-rose-500' : 'hover:shadow-md'
                  }`}
                >
                  <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-slate-900 dark:text-white text-xl capitalize">{plan.name}</h4>
                        {isCurrentlyActive && (
                          <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700 shrink-0">
                            Active Plan
                          </span>
                        )}
                        {isExpiredCurrentPlan && (
                          <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 font-extrabold text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full border border-rose-300 dark:border-rose-700 shrink-0">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{planDescriptions[plan.id]}</p>

                      <div className="flex items-baseline pt-1">
                        <span className="text-4xl font-black text-slate-950 dark:text-white">{formatPrice(price)}</span>
                        <span className="text-slate-400 text-xs font-semibold">{pricePeriod}</span>
                      </div>

                      <Badge variant="neutral" className="w-full justify-center bg-slate-50 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold py-1.5">
                        {limitsText}
                      </Badge>

                      <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400 pt-2">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-center gap-2 font-semibold">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                      {isCurrentlyActive ? (
                        <Button className="w-full cursor-default" variant="outline" disabled>
                          Current Subscription
                        </Button>
                      ) : (
                        <Button 
                          className="w-full cursor-pointer" 
                          variant={plan.id === 'pro' || isExpiredCurrentPlan ? 'primary' : 'outline'}
                          onClick={() => handleUpgradePlan(plan.id as any)}
                          disabled={paymentLoading === plan.id}
                        >
                          {paymentLoading === plan.id ? 'Processing...' : isExpiredCurrentPlan ? `Renew ${plan.name} Plan` : `Choose ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </div>

        {/* Enterprise Custom Plan Banner */}
        <div className="mt-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs font-bold border border-sky-500/30 uppercase tracking-wider">
              Enterprise & Multi-Outlet
            </div>
            <h4 className="text-2xl font-black text-white">Custom Enterprise Plan</h4>
            <p className="text-sm text-slate-300 max-w-2xl">
              Tailored menu AI credits, multi-location management, custom branding, and dedicated account management for large dining chains & franchises.
            </p>
          </div>
          <a
            href="tel:8949266064"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-transform hover:scale-105 shrink-0"
          >
            📞 Talk to Sales — +91 89492 66064
          </a>
        </div>
      </div>

      {/* DANGER ZONE: DELETE RESTAURANT */}
      <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
        <Card className="border-rose-100 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/5">
          <CardHeader className="flex items-center gap-2 border-b border-rose-100/50 dark:border-rose-950/20 pb-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <h3 className="font-extrabold text-rose-700 dark:text-rose-400 text-base">Danger Zone</h3>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Delete Restaurant Profile</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                Permanently deletes the restaurant workspace, digital menus, categories, tables, client orders, and active staff logins. This action is permanent and cannot be undone.
              </p>
            </div>

            <form onSubmit={handleDeleteRestaurant} className="flex flex-col sm:flex-row gap-3 pt-2">
              <input
                type="text"
                placeholder='Type "delete my restaurant" to confirm'
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="flex-1 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 border border-rose-200 dark:border-rose-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white dark:bg-slate-900"
                required
              />
              <Button 
                type="submit" 
                className="bg-rose-600 hover:bg-rose-700 text-white shrink-0"
                isLoading={deleteLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Permanent Delete Restaurant
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
