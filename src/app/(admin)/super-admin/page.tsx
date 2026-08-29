'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Restaurant, PricingPlan, getEffectiveSubscriptionStatus } from '@/lib/db';
import { parsePlanSpec } from '@/lib/entitlements';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import MockBanner from '@/components/shared/MockBanner';
import SaaSPlanBuilder from '@/components/admin/SaaSPlanBuilder';
import { 
  ShieldAlert, Users, Database, DollarSign, LogOut, 
  Settings, Check, Edit2, AlertCircle, TrendingUp, Clock, Trash2, Mail,
  Key, Eye, EyeOff, Copy, ExternalLink, LogIn, CheckCircle2
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ownerProfilesMap, setOwnerProfilesMap] = useState<Record<string, any>>({});
  const [adminStats, setAdminStats] = useState({
    totalRestaurants: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    mrr: 0,
    arr: 0,
    totalPaidCustomers: 0,
    trialUsers: 0,
    expiredLicenses: 0,
    activeLicenses: 0
  });
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [editingPlanPrices, setEditingPlanPrices] = useState<Record<string, { monthly: number, yearly: number }>>({});
  const [loading, setLoading] = useState(true);
  const [reminderSending, setReminderSending] = useState<string | null>(null);

  // Owner Credentials Modal State (PART F)
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [selectedOwnerRest, setSelectedOwnerRest] = useState<Restaurant | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [showOwnerPassword, setShowOwnerPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  // Override Plan Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [newPlan, setNewPlan] = useState<'starter' | 'pro' | 'premium'>('starter');
  const [newStatus, setNewStatus] = useState<Restaurant['subscription_status']>('active');
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');

  // Delete Confirmation Modal State (BUG-SA3)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRest, setDeletingRest] = useState<Restaurant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteImpactStats, setDeleteImpactStats] = useState({ ordersCount: 0, totalRevenue: 0 });

  useEffect(() => {
    async function checkAdminAuth() {
      const user = await getActiveUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // STRICT SUPER ADMIN CHECK: Allow ONLY role === 'super_admin'
      const isSuperAdmin = user.role === 'super_admin';

      if (!isSuperAdmin) {
        console.warn(`[SUPER ADMIN ACCESS DENIED]: User ${user.email} (Role: ${user.role}) attempted unauthorized access to /super-admin.`);
        
        // Redirect based on user role
        if (user.role === 'waiter' || user.role === 'staff') {
          router.replace('/menu');
        } else if (user.role === 'kitchen') {
          router.replace('/dashboard/kds');
        } else {
          router.replace('/dashboard');
        }
        return;
      }
      
      await loadAdminData();
    }
    checkAdminAuth();
  }, [router]);

  async function loadAdminData() {
    try {
      const rests = await db.getRestaurants();
      const stats = await db.getSuperAdminStats();
      const plans = await db.getPricingPlans();
      setRestaurants(rests);
      setAdminStats(stats);
      setPricingPlans(plans);

      // Fetch all owner profiles for password visibility (PART F)
      const { data: ownersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'owner');

      const oMap: Record<string, any> = {};
      (ownersData || []).forEach(o => {
        if (o.restaurant_id) {
          oMap[o.restaurant_id] = o;
        }
      });
      setOwnerProfilesMap(oMap);

      const specsObj: Record<string, any> = {};
      plans.forEach(p => {
        const spec = parsePlanSpec(p);
        specsObj[p.id] = {
          monthly: p.price_monthly,
          yearly: p.price_yearly,
          maxTables: spec.limits.tables !== null && spec.limits.tables !== undefined ? Number(spec.limits.tables) : 9999,
          maxItems: spec.limits.menu_items !== null && spec.limits.menu_items !== undefined ? Number(spec.limits.menu_items) : 9999,
          allowWaiter: spec.features.call_waiter !== false,
          allowAnalytics: spec.features.advanced_analytics !== false,
          allowBranding: spec.features.custom_branding !== false,
          kdsType: spec.features.kds ? 'premium' : 'standard',
        };
      });
      setEditingPlanSpecs(specsObj);
    } catch (err: any) {
      alert(`Error loading data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOwnerModal = (rest: Restaurant) => {
    setSelectedOwnerRest(rest);
    setSelectedOwner(ownerProfilesMap[rest.id] || null);
    setShowOwnerPassword(false);
    setCopiedField(null);
    setOwnerModalOpen(true);
  };

  const handleCopyText = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleImpersonateRestaurant = async (rest: Restaurant) => {
    setImpersonatingId(rest.id);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRestaurantId: rest.id })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to impersonate restaurant');
        return;
      }

      sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(data.ownerProfile));
      router.push('/dashboard');
    } catch (err: any) {
      alert(`Error opening impersonation session: ${err.message}`);
    } finally {
      setImpersonatingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleOpenOverrideModal = (rest: Restaurant) => {
    setSelectedRest(rest);
    setNewPlan(rest.subscription_plan);
    setNewStatus(rest.subscription_status);
    const dateStr = rest.trial_ends_at ? new Date(rest.trial_ends_at).toISOString().split('T')[0] : '';
    setNewExpiryDate(dateStr);
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;

    try {
      const expiryIso = newExpiryDate ? new Date(newExpiryDate).toISOString() : undefined;
      await db.updateRestaurantPlan(selectedRest.id, newPlan, newStatus, expiryIso);
      setOverrideModalOpen(false);
      
      // Dispatch storage event to alert standard client of edits
      window.dispatchEvent(new Event('storage'));
      
      await loadAdminData();
      alert(`Success! Updated ${selectedRest.name} to ${newPlan.toUpperCase()} (${newStatus.toUpperCase()})`);
    } catch (err: any) {
      alert(`Failed to update subscription: ${err.message}`);
    }
  };

  const handleSendRenewalReminder = async (rest: Restaurant) => {
    try {
      setReminderSending(rest.id);
      await db.sendRenewalReminder(rest.id);
      alert(`Success! Renewal warning email & push notification sent to ${rest.name} owner.`);
    } catch (err: any) {
      alert(`Failed to send renewal reminder: ${err.message}`);
    } finally {
      setReminderSending(null);
    }
  };

  const getExpiryInfo = (trialEndsAtStr: string) => {
    if (!trialEndsAtStr) return { daysLeft: 99, label: 'N/A', isExpiringSoon: false, isExpired: false };
    const expiry = new Date(trialEndsAtStr);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) {
      return { daysLeft, label: `Expired ${Math.abs(daysLeft)} days ago`, isExpiringSoon: false, isExpired: true };
    } else if (daysLeft <= 3) {
      return { daysLeft, label: `Expires in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}!`, isExpiringSoon: true, isExpired: false };
    } else {
      return { daysLeft, label: `Expires ${expiry.toLocaleDateString()}`, isExpiringSoon: false, isExpired: false };
    }
  };

  const [editingPlanSpecs, setEditingPlanSpecs] = useState<Record<string, {
    monthly: number;
    yearly: number;
    maxTables: number;
    maxItems: number;
    allowWaiter: boolean;
    allowAnalytics: boolean;
    allowBranding: boolean;
    kdsType: 'standard' | 'premium';
  }>>({});

  const handleSpecChange = (planId: string, field: string, val: any) => {
    setEditingPlanSpecs(prev => {
      const plan = pricingPlans.find(p => p.id === planId);
      const current = prev[planId] || {
        monthly: plan?.price_monthly || 0,
        yearly: plan?.price_yearly || 0,
        maxTables: plan?.max_tables ?? 0,
        maxItems: plan?.max_items ?? 0,
        allowWaiter: plan?.allow_waiter ?? false,
        allowAnalytics: plan?.allow_analytics ?? false,
        allowBranding: plan?.allow_branding ?? false,
        kdsType: plan?.kds_type ?? 'standard',
      };

      return {
        ...prev,
        [planId]: {
          ...current,
          [field]: val
        }
      };
    });
  };

  const handleSavePlanSpecs = async (planId: string) => {
    const plan = pricingPlans.find(p => p.id === planId);
    const specs = editingPlanSpecs[planId] || {
      monthly: plan?.price_monthly || 0,
      yearly: plan?.price_yearly || 0,
      maxTables: plan?.max_tables ?? 0,
      maxItems: plan?.max_items ?? 0,
      allowWaiter: plan?.allow_waiter ?? false,
      allowAnalytics: plan?.allow_analytics ?? false,
      allowBranding: plan?.allow_branding ?? false,
      kdsType: plan?.kds_type ?? 'standard',
    };

    try {
      await db.updatePricingPlan(planId, {
        price_monthly: Number(specs.monthly),
        price_yearly: Number(specs.yearly),
        max_tables: Number(specs.maxTables),
        max_items: Number(specs.maxItems),
        allow_waiter: Boolean(specs.allowWaiter),
        allow_analytics: Boolean(specs.allowAnalytics),
        allow_branding: Boolean(specs.allowBranding),
        kds_type: specs.kdsType,
      });

      alert(`Success! Updated ${planId.toUpperCase()} plan specifications to: Monthly ₹${specs.monthly}, Yearly ₹${specs.yearly}, Max Tables ${specs.maxTables}, Max Items ${specs.maxItems}.`);
      window.location.reload();
    } catch (err: any) {
      alert(`Failed to save plan specifications: ${err.message}`);
    }
  };

  const [purgingExpired, setPurgingExpired] = useState(false);

  const handlePurgeExpired = async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const expiredList = restaurants.filter(r => {
      if (!r.trial_ends_at) return false;
      const expiry = new Date(r.trial_ends_at);
      const isExpiredOrCancelled = (r.subscription_status as string) === 'expired' || r.subscription_status === 'cancelled' || r.subscription_status === 'past_due';
      return isExpiredOrCancelled && expiry < thirtyDaysAgo;
    });

    if (expiredList.length === 0) {
      alert('No restaurants eligible for purge. Only accounts expired for over 30 days can be purged.');
      return;
    }

    const confirmPurge = window.confirm(
      `Are you sure you want to delete ALL ${expiredList.length} tenants expired for over 30 days?\n\nThis will permanently remove all expired tenant profiles, menus, tables, and orders.`
    );
    if (!confirmPurge) return;

    setPurgingExpired(true);
    try {
      for (const r of expiredList) {
        await db.deleteRestaurant(r.id);
      }

      alert(`Successfully purged ${expiredList.length} expired restaurants!`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Error purging expired accounts: ${err.message}`);
    } finally {
      setPurgingExpired(false);
    }
  };

  const handleOpenDeleteModal = async (rest: Restaurant) => {
    setDeletingRest(rest);
    setDeleteConfirmText('');
    setDeleteImpactStats({ ordersCount: 0, totalRevenue: 0 });
    setDeleteModalOpen(true);

    try {
      const orders = await db.getOrders(rest.id);
      const rev = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0);
      setDeleteImpactStats({ ordersCount: orders.length, totalRevenue: rev });
    } catch (e) {}
  };

  const handleConfirmDelete = async () => {
    if (!deletingRest) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      alert('Confirmation mismatch! Please type DELETE in capital letters to confirm permanent deletion.');
      return;
    }

    try {
      setLoading(true);
      await db.deleteRestaurant(deletingRest.id);
      setDeleteModalOpen(false);
      alert(`Restaurant "${deletingRest.name}" has been permanently deleted.`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Failed to delete restaurant: ${err.message}`);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Opening Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <MockBanner />
      
      {/* Admin Header */}
      <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base md:text-lg">CleverOps SaaS</h1>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Super Admin Central Control</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      {/* Admin Body Content */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">
        
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global Platform Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Review SaaS revenue metrics, modify tenant subscriptions, and view analytics.</p>
        </div>

        {/* Global SaaS Revenue Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{formatPrice(adminStats.mrr)}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Annual Revenue</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{formatPrice(adminStats.arr)}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paid Customers</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.totalPaidCustomers}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Licenses</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.activeLicenses}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col gap-2 py-5 px-4">
              <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trial Users</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.trialUsers}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="flex flex-col justify-between h-full py-5 px-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5" />
                </div>
                {adminStats.expiredLicenses > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200 font-bold"
                    onClick={handlePurgeExpired}
                    isLoading={purgingExpired}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete All ({adminStats.expiredLicenses})
                  </Button>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expired Licenses</p>
                <h3 className="text-lg font-extrabold text-slate-950 dark:text-white mt-1">{adminStats.expiredLicenses}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fully Configurable SaaS Pricing Plans & Entitlement Builder */}
        <SaaSPlanBuilder restaurants={restaurants} onRefreshData={loadAdminData} />

        {/* Tenants List Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Tenant Restaurant Listings</h3>
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left">Restaurant Info</th>
                    <th scope="col" className="px-6 py-4 text-left">URL Slug</th>
                    <th scope="col" className="px-6 py-4 text-left">SaaS Plan</th>
                    <th scope="col" className="px-6 py-4 text-left">Subscription Expiry</th>
                    <th scope="col" className="px-6 py-4 text-left">Super Admin Revenue</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                  {restaurants.map((rest) => {
                    const expiry = getExpiryInfo(rest.trial_ends_at);
                    const matchedPlan = pricingPlans.find(p => p.id === rest.subscription_plan);
                    const planPrice = matchedPlan 
                      ? (rest.billing_interval === 'yearly' ? matchedPlan.price_yearly : matchedPlan.price_monthly)
                      : (rest.subscription_plan === 'premium' ? 1499 : rest.subscription_plan === 'pro' ? 799 : 299);

                    return (
                      <tr key={rest.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          {rest.logo_url ? (
                            <img src={rest.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover border border-slate-100 dark:border-slate-800" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm">{rest.name.charAt(0)}</div>
                          )}
                          <div>
                            <p className="font-extrabold text-slate-950 dark:text-white">{rest.name}</p>
                            <p className="text-[10px] text-slate-400">ID: {rest.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono font-bold">{rest.slug}</td>
                        <td className="px-6 py-4 uppercase">
                          <Badge variant={rest.subscription_plan === 'premium' ? 'purple' : rest.subscription_plan === 'pro' ? 'info' : 'neutral'}>
                            {rest.subscription_plan}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {(() => {
                              const effStatus = getEffectiveSubscriptionStatus(rest);
                              const isExp = effStatus === 'expired' || effStatus === 'past_due' || effStatus === 'cancelled';
                              return (
                                <Badge variant={isExp ? 'error' : expiry.isExpiringSoon ? 'warning' : effStatus === 'active' ? 'success' : 'neutral'}>
                                  {effStatus.toUpperCase()} • {expiry.label}
                                </Badge>
                              );
                            })()}
                            {expiry.isExpiringSoon && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                2-3 Days Left to Expire!
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {formatPrice(planPrice)} / {rest.billing_interval || 'monthly'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-300 dark:border-amber-800 font-bold"
                              onClick={() => handleOpenOwnerModal(rest)}
                              title="View Owner Credentials & Password"
                            >
                              <Key className="h-3.5 w-3.5" /> Owner Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 font-black"
                              onClick={() => handleImpersonateRestaurant(rest)}
                              isLoading={impersonatingId === rest.id}
                              title="1-Click Login as this Restaurant"
                            >
                              <LogIn className="h-3.5 w-3.5" /> Login as Rest
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50"
                              onClick={() => handleSendRenewalReminder(rest)}
                              isLoading={reminderSending === rest.id}
                            >
                              <Mail className="h-3.5 w-3.5" /> Reminder
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1.5 text-xs dark:border-slate-800 dark:hover:bg-slate-800"
                              onClick={() => handleOpenOverrideModal(rest)}
                            >
                              <Edit2 className="h-3.5 w-3.5" /> Modify
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 hover:border-rose-300"
                              onClick={() => handleOpenDeleteModal(rest)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

      </main>

      {/* --- Override subscription Modal --- */}
      <Dialog
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title={`Modify Subscription: ${selectedRest?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOverrideModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveOverride}>Update License</Button>
          </>
        }
      >
        <form onSubmit={handleSaveOverride} className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-indigo-800 dark:text-indigo-300 font-semibold">
            <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              Changing this tenant's license overrides their subscription limits instantly. Ensure safety compliance when modifying live restaurants.
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">SaaS Plan Level</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value as any)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900"
            >
              <option value="starter">Starter Plan</option>
              <option value="pro">Pro Plan</option>
              <option value="premium">Premium Plan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">License Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900"
            >
              <option value="active">Active (Paid Subscription)</option>
              <option value="trial">Trialing (Free Period)</option>
              <option value="past_due">Past Due (Payment Pending)</option>
              <option value="cancelled">Cancelled (Blocked)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Plan Expiry Date</label>
            <input
              type="date"
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 font-medium"
            />
            <p className="text-[11px] text-slate-400 mt-1">Set custom plan expiry date for this restaurant tenant.</p>
          </div>
        </form>
      </Dialog>
      {/* --- Delete Confirmation Modal (BUG-SA3) --- */}
      <Dialog
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`CONFIRM PERMANENT DELETION: ${deletingRest?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button 
              variant="danger"
              disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
              onClick={handleConfirmDelete}
            >
              Permanently Delete Tenant
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-rose-800 dark:text-rose-300 font-semibold">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <strong>WARNING! Irreversible Data Loss Action:</strong> You are about to permanently delete <strong>{deletingRest?.name}</strong>. All associated staff accounts, menus, dining tables, orders, and sales receipts will be permanently removed.
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 text-xs font-semibold">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">Deletion Impact Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
              <div>• Restaurant Name: <strong className="text-slate-900 dark:text-white">{deletingRest?.name}</strong></div>
              <div>• Current Plan: <strong className="text-slate-900 dark:text-white uppercase">{deletingRest?.subscription_plan}</strong></div>
              <div>• Total Orders: <strong className="text-slate-900 dark:text-white">{deleteImpactStats.ordersCount}</strong></div>
              <div>• Lifetime Revenue: <strong className="text-slate-900 dark:text-white">{formatPrice(deleteImpactStats.totalRevenue)}</strong></div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              To confirm, type <span className="text-rose-600 dark:text-rose-400 font-mono">DELETE</span> below:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="block w-full px-3.5 py-2 text-sm text-slate-900 dark:text-white border border-rose-300 dark:border-rose-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white dark:bg-slate-900 font-mono font-bold"
            />
          </div>
        </div>
      </Dialog>

      {/* --- Owner Credentials Modal (PART F) --- */}
      <Dialog
        isOpen={ownerModalOpen}
        onClose={() => setOwnerModalOpen(false)}
        title={`Owner Credentials & Support: ${selectedOwnerRest?.name}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleImpersonateRestaurant(selectedOwnerRest!)}
              className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-bold"
            >
              <LogIn className="h-4 w-4 mr-1.5" /> Login as Restaurant
            </Button>
            <Button variant="secondary" onClick={() => setOwnerModalOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
            Confidential credentials for Super Admin support and tenant recovery.
          </div>

          <div className="space-y-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {/* Restaurant Name */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Restaurant</div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{selectedOwnerRest?.name}</div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(selectedOwnerRest?.name || '', 'rest_name')}
                className="p-1.5 text-slate-400 hover:text-emerald-500 rounded transition-colors"
                title="Copy"
              >
                {copiedField === 'rest_name' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Owner Full Name */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Owner Name</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedOwner?.full_name || (selectedOwnerRest?.settings as any)?.owner_name || selectedOwnerRest?.name || 'Owner'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(selectedOwner?.full_name || (selectedOwnerRest?.settings as any)?.owner_name || '', 'owner_name')}
                className="p-1.5 text-slate-400 hover:text-emerald-500 rounded transition-colors"
                title="Copy"
              >
                {copiedField === 'owner_name' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Email / Username */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Login Email / Username</div>
                <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedOwner?.email || (selectedOwnerRest?.settings as any)?.owner_email || (selectedOwnerRest as any)?.owner_email || 'Not Provided'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText(selectedOwner?.email || (selectedOwnerRest?.settings as any)?.owner_email || (selectedOwnerRest as any)?.owner_email || '', 'owner_email')}
                className="p-1.5 text-slate-400 hover:text-emerald-500 rounded transition-colors"
                title="Copy"
              >
                {copiedField === 'owner_email' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Mobile / Phone */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Mobile Number</div>
                <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedOwner?.phone || (selectedOwnerRest?.settings as any)?.owner_phone || selectedOwnerRest?.phone || 'Not Provided'}
                </div>
              </div>
              {selectedOwner?.phone || (selectedOwnerRest?.settings as any)?.owner_phone || selectedOwnerRest?.phone ? (
                <button
                  type="button"
                  onClick={() => handleCopyText(selectedOwner?.phone || (selectedOwnerRest?.settings as any)?.owner_phone || selectedOwnerRest?.phone || '', 'owner_phone')}
                  className="p-1.5 text-slate-400 hover:text-emerald-500 rounded transition-colors"
                  title="Copy"
                >
                  {copiedField === 'owner_phone' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
              ) : null}
            </div>

            {/* Address & GST */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Address & GST</div>
                <div className="text-xs text-slate-900 dark:text-white mt-0.5 font-medium">
                  {selectedOwnerRest?.address || 'Address not specified'}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  GST: <strong>{selectedOwnerRest?.gst_number || 'Not Registered / None'}</strong>
                </div>
              </div>
            </div>

            {/* Subscription & Razorpay Details */}
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-1.5 text-xs">
              <div className="font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider text-[10px] flex items-center justify-between">
                <span>Subscription & Billing Details</span>
                <span className="bg-indigo-200 dark:bg-indigo-900 px-1.5 py-0.5 rounded text-[10px]">
                  {selectedOwnerRest?.subscription_status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-700 dark:text-slate-300">
                <div>Plan: <strong className="uppercase">{selectedOwnerRest?.subscription_plan} ({selectedOwnerRest?.billing_interval || 'monthly'})</strong></div>
                <div>Renewal: <strong>{selectedOwnerRest?.trial_ends_at ? new Date(selectedOwnerRest.trial_ends_at).toLocaleDateString() : 'Active Lifetime'}</strong></div>
                <div>Payment ID: <span className="font-mono text-[10px]">{(selectedOwnerRest?.settings as any)?.last_payment_id || 'Direct Subscription'}</span></div>
                <div>Order ID: <span className="font-mono text-[10px]">{(selectedOwnerRest?.settings as any)?.last_order_id || 'N/A'}</span></div>
              </div>
            </div>

            {/* Password (Show/Hide Toggle & Copy) */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider">Password</div>
                <div className="text-sm font-mono font-black text-slate-900 dark:text-white mt-0.5">
                  {selectedOwner?.plain_password ? (
                    showOwnerPassword ? selectedOwner.plain_password : '••••••••••••'
                  ) : (
                    <span className="text-slate-400 italic font-normal text-xs">Encrypted / Not recorded in plain text</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedOwner?.plain_password && (
                  <button
                    type="button"
                    onClick={() => setShowOwnerPassword(!showOwnerPassword)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                    title={showOwnerPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showOwnerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
                {selectedOwner?.plain_password && (
                  <button
                    type="button"
                    onClick={() => handleCopyText(selectedOwner.plain_password, 'owner_password')}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 rounded transition-colors"
                    title="Copy Password"
                  >
                    {copiedField === 'owner_password' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
