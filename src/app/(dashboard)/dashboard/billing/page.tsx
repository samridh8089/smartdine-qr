'use client';

import { useState, useEffect } from 'react';
import { db, PLAN_LIMITS, Restaurant } from '@/lib/db';
import { getActiveUser } from '@/lib/supabase';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  CreditCard, Check, AlertTriangle, ShieldCheck, 
  HelpCircle, Clock, Database, Sparkles
} from 'lucide-react';

export default function BillingPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tablesCount, setTablesCount] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // checkout modal mockup
  const [checkoutModalPlan, setCheckoutModalPlan] = useState<string | null>(null);

  useEffect(() => {
    async function loadBilling() {
      const user = await getActiveUser();
      if (!user || !user.restaurant_id) return;
      const restId = user.restaurant_id;

      const rest = await db.getRestaurantById(restId);
      if (rest) setRestaurant(rest);

      const tables = await db.getTables(restId);
      setTablesCount(tables.length);

      const items = await db.getMenuItems(restId);
      setItemsCount(items.length);
      
      setLoading(false);
    }
    loadBilling();
  }, []);

  const handleUpgradePlan = async (plan: 'starter' | 'pro' | 'premium') => {
    if (!restaurant) return;
    
    // Check if current usage exceeds new plan limits (e.g. if downgrading)
    const limit = PLAN_LIMITS[plan];
    if (tablesCount > limit.maxTables) {
      alert(`Cannot downgrade to ${plan.toUpperCase()}: You have ${tablesCount} tables, which exceeds the limit of ${limit.maxTables}. Delete tables before downgrading.`);
      return;
    }
    if (itemsCount > limit.maxItems) {
      alert(`Cannot downgrade to ${plan.toUpperCase()}: You have ${itemsCount} menu items, which exceeds the limit of ${limit.maxItems}. Delete menu items before downgrading.`);
      return;
    }

    try {
      // Perform upgrade
      const updated = await db.updateRestaurantPlan(restaurant.id, plan, 'active');
      setRestaurant(updated);
      
      // Dispatch storage event to alert dashboard layout of changes
      window.dispatchEvent(new Event('storage'));
      
      setCheckoutModalPlan(null);
      alert(`Success! Your subscription has been updated to the ${plan.toUpperCase()} plan.`);
    } catch (err: any) {
      alert(`Failed to upgrade subscription: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-3 gap-6">
          <div className="h-44 bg-slate-200 rounded-xl" />
          <div className="h-44 bg-slate-200 rounded-xl" />
          <div className="h-44 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const activePlan = restaurant?.subscription_plan || 'starter';
  const planDetails = [
    {
      id: 'starter',
      name: 'Starter',
      price: '₹1,499',
      billing: '/month',
      description: 'Ideal for small cafes or pop-up bistros testing QR ordering.',
      limits: `Up to ${PLAN_LIMITS.starter.maxTables} tables & ${PLAN_LIMITS.starter.maxItems} menu items`,
      features: [
        'Digital Menu & Table QRs',
        'Customer QR Cart & Ordering',
        'Basic Billing & Invoicing',
        'Kitchen Display System (KDS)'
      ]
    },
    {
      id: 'pro',
      name: 'Pro (Recommended)',
      price: '₹3,999',
      billing: '/month',
      description: 'Perfect for standard restaurants looking to optimize workflows.',
      limits: `Up to ${PLAN_LIMITS.pro.maxTables} tables & ${PLAN_LIMITS.pro.maxItems} menu items`,
      features: [
        'Everything in Starter',
        'Bulk QR Code Downloads',
        'Real-time Kitchen Bell Alerts',
        'Full Reports & Analytics Dashboard',
        'Custom Currencies & Service charges'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '₹7,999',
      billing: '/month',
      description: 'Best for large multi-room dining lounges and high volume outlets.',
      limits: 'Unlimited tables & Unlimited menu items',
      features: [
        'Everything in Pro',
        'Unlimited Tables & Menu Items',
        'Priority Customer Support',
        'Multi-Staff logins',
        'API & Custom Branding settings'
      ]
    }
  ];

  const currentLimit = PLAN_LIMITS[activePlan];

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Billing & Subscriptions</h2>
        <p className="text-slate-500 text-sm mt-1">Manage your SaaS billing plans, usage limits, and trial status.</p>
      </div>

      {/* Current plan status & usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Subscription Status Card */}
        <Card className="lg:col-span-1">
          <CardHeader className="bg-slate-50/50 flex items-center justify-between py-4">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Subscription Status</h3>
            <Badge variant={restaurant?.subscription_status === 'active' ? 'success' : 'warning'}>
              {restaurant?.subscription_status === 'active' ? 'Active' : 'Trialing'}
            </Badge>
          </CardHeader>
          <CardContent className="py-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400">Current Plan</p>
              <h4 className="text-2xl font-black text-slate-900 capitalize mt-1">{activePlan}</h4>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {restaurant?.subscription_status === 'active' 
                  ? 'Auto-renews next year' 
                  : `Free trial ends on ${new Date(restaurant?.trial_ends_at || '').toLocaleDateString()}`}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tables Usage Card */}
        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Tables Created</h3>
          </CardHeader>
          <CardContent className="py-6 space-y-3">
            <div className="flex justify-between items-baseline">
              <h4 className="text-3xl font-black text-slate-950">{tablesCount}</h4>
              <span className="text-xs font-bold text-slate-400">Limit: {currentLimit.maxTables === 9999 ? 'Unlimited' : currentLimit.maxTables}</span>
            </div>
            {/* Progress bar */}
            {currentLimit.maxTables !== 9999 && (
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    tablesCount >= currentLimit.maxTables ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((tablesCount / currentLimit.maxTables) * 100, 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-slate-400 font-semibold uppercase">
              Used {tablesCount} of {currentLimit.maxTables === 9999 ? '∞' : currentLimit.maxTables} slots
            </p>
          </CardContent>
        </Card>

        {/* Menu Items Usage Card */}
        <Card>
          <CardHeader className="py-4">
            <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Menu Items Created</h3>
          </CardHeader>
          <CardContent className="py-6 space-y-3">
            <div className="flex justify-between items-baseline">
              <h4 className="text-3xl font-black text-slate-955">{itemsCount}</h4>
              <span className="text-xs font-bold text-slate-400">Limit: {currentLimit.maxItems === 9999 ? 'Unlimited' : currentLimit.maxItems}</span>
            </div>
            {/* Progress bar */}
            {currentLimit.maxItems !== 9999 && (
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    itemsCount >= currentLimit.maxItems ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((itemsCount / currentLimit.maxItems) * 100, 100)}%` }}
                />
              </div>
            )}
            <p className="text-xs text-slate-400 font-semibold uppercase">
              Used {itemsCount} of {currentLimit.maxItems === 9999 ? '∞' : currentLimit.maxItems} slots
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Pricing Matrix */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-600" /> Upgrade Options
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {planDetails.map(plan => {
            const isActive = activePlan === plan.id;
            return (
              <Card 
                key={plan.id} 
                className={`flex flex-col justify-between transition-all duration-300 relative ${
                  isActive ? 'ring-2 ring-emerald-500 scale-102 shadow-lg shadow-emerald-500/5' : 'hover:shadow-md'
                }`}
              >
                {isActive && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white font-extrabold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full border border-white">
                    Active Plan
                  </span>
                )}
                
                <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-lg">{plan.name}</h4>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline">
                      <span className="text-4xl font-black text-slate-950">{plan.price}</span>
                      <span className="text-slate-400 text-xs font-semibold">{plan.billing}</span>
                    </div>

                    <Badge variant="neutral" className="w-full justify-center bg-slate-50 border-slate-100 text-slate-600 font-semibold py-1">
                      {plan.limits}
                    </Badge>

                    <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-center gap-2 font-semibold">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100">
                    {isActive ? (
                      <Button className="w-full cursor-default" variant="outline" disabled>
                        Current Plan
                      </Button>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant={plan.id === 'pro' ? 'primary' : 'outline'}
                        onClick={() => handleUpgradePlan(plan.id as any)}
                      >
                        Choose {plan.name.split(' ')[0]}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
