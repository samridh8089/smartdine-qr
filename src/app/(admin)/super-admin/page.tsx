'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, Restaurant } from '@/lib/db';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import MockBanner from '@/components/shared/MockBanner';
import { 
  ShieldAlert, Users, Database, DollarSign, LogOut, 
  Settings, Check, Edit2, AlertCircle, TrendingUp
} from 'lucide-react';

export default function SuperAdminPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [adminStats, setAdminStats] = useState({
    totalRestaurants: 0,
    totalRevenue: 0,
    activeSubscriptions: 0
  });
  const [loading, setLoading] = useState(true);

  // Override Plan Modal
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [newPlan, setNewPlan] = useState<'starter' | 'pro' | 'premium'>('starter');
  const [newStatus, setNewStatus] = useState<Restaurant['subscription_status']>('active');

  useEffect(() => {
    async function checkAdminAuth() {
      const user = await getActiveUser();
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role !== 'super_admin') {
        router.push('/dashboard');
        return;
      }
      
      await loadAdminData();
    }
    checkAdminAuth();
  }, [router]);

  const loadAdminData = async () => {
    const rests = await db.getRestaurants();
    const stats = await db.getSuperAdminStats();
    setRestaurants(rests);
    setAdminStats(stats);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleOpenOverrideModal = (rest: Restaurant) => {
    setSelectedRest(rest);
    setNewPlan(rest.subscription_plan);
    setNewStatus(rest.subscription_status);
    setOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;

    try {
      await db.updateRestaurantPlan(selectedRest.id, newPlan, newStatus);
      setOverrideModalOpen(false);
      
      // Dispatch storage event to alert standard client of edits
      window.dispatchEvent(new Event('storage'));
      
      await loadAdminData();
      alert(`Success! Updated ${selectedRest.name} to ${newPlan.toUpperCase()} (${newStatus.toUpperCase()})`);
    } catch (err: any) {
      alert(`Failed to update subscription: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Opening Admin Console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <MockBanner />
      
      {/* Admin Header */}
      <header className="bg-slate-900 text-white h-16 flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base md:text-lg">SmartDine QR SaaS</h1>
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
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Global Platform Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Review system metrics, modify tenant subscriptions, and view analytics.</p>
        </div>

        {/* Global Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Restaurants</p>
                <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{adminStats.totalRestaurants}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Estimated Revenue Transactions</p>
                <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{formatPrice(adminStats.totalRevenue)}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-6">
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active SaaS Licenses</p>
                <h3 className="text-2xl font-extrabold text-slate-950 mt-1">{adminStats.activeSubscriptions}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenants List Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Tenant Restaurant Listings</h3>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 font-bold text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left">Restaurant Info</th>
                    <th scope="col" className="px-6 py-4 text-left">URL Slug</th>
                    <th scope="col" className="px-6 py-4 text-left">SaaS Plan</th>
                    <th scope="col" className="px-6 py-4 text-left">Status</th>
                    <th scope="col" className="px-6 py-4 text-left">Created At</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 bg-white">
                  {restaurants.map((rest) => (
                    <tr key={rest.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        {rest.logo_url ? (
                          <img src={rest.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover border border-slate-100" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm">{rest.name.charAt(0)}</div>
                        )}
                        <div>
                          <p className="font-extrabold text-slate-950">{rest.name}</p>
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
                        <Badge variant={rest.subscription_status === 'active' ? 'success' : 'warning'}>
                          {rest.subscription_status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 font-semibold">{new Date(rest.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1.5"
                          onClick={() => handleOpenOverrideModal(rest)}
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Modify License
                        </Button>
                      </td>
                    </tr>
                  ))}
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
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-indigo-800 font-semibold">
            <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              Changing this tenant's license overrides their subscription limits instantly. Ensure safety compliance when modifying live restaurants.
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">SaaS Plan Level</label>
            <select
              value={newPlan}
              onChange={(e) => setNewPlan(e.target.value as any)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              <option value="starter">Starter Plan (limits: 5 tables / 15 menu items)</option>
              <option value="pro">Pro Plan (limits: 20 tables / 50 menu items)</option>
              <option value="premium">Premium Plan (Unlimited)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">License Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="block w-full px-3.5 py-2 text-sm text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            >
              <option value="active">Active (Paid Subscription)</option>
              <option value="trial">Trialing (Free Period)</option>
              <option value="past_due">Past Due (Payment Pending)</option>
              <option value="cancelled">Cancelled (Blocked)</option>
            </select>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
