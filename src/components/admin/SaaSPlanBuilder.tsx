'use client';

import { useState, useEffect } from 'react';
import { 
  FEATURE_CATALOG, 
  RESOURCE_LIMIT_CATALOG, 
  AI_LIMIT_CATALOG, 
  PlanEntitlementSpec, 
  DEFAULT_PLAN_SPECS 
} from '@/lib/entitlements';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { 
  ShieldCheck, Zap, DollarSign, Layers, CheckCircle2, XCircle, 
  Copy, Edit3, Trash2, Plus, ArrowRight, RefreshCw, Star, AlertTriangle, Sparkles
} from 'lucide-react';

interface SaaSPlanBuilderProps {
  restaurants: any[];
  onRefreshData?: () => void;
}

export default function SaaSPlanBuilder({ restaurants, onRefreshData }: SaaSPlanBuilderProps) {
  const [plans, setPlans] = useState<PlanEntitlementSpec[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'plans' | 'matrix'>('plans');

  // Modal State
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanEntitlementSpec | null>(null);
  const [builderActiveSection, setBuilderActiveSection] = useState<'basic' | 'limits' | 'features' | 'ai'>('basic');

  // Restaurant Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [targetPlanId, setTargetPlanId] = useState('starter');

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (data.success && Array.isArray(data.plans)) {
        setPlans(data.plans);
        setUsageCounts(data.usageCounts || {});
      } else {
        // Fallback default plans
        setPlans(Object.values(DEFAULT_PLAN_SPECS));
      }
    } catch (e) {
      setPlans(Object.values(DEFAULT_PLAN_SPECS));
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreateModal = () => {
    const newId = `custom_${Date.now()}`;
    const newPlan: PlanEntitlementSpec = {
      ...DEFAULT_PLAN_SPECS.starter,
      id: newId,
      slug: newId,
      name: 'CUSTOM PLAN',
      price_monthly: 1499,
      price_yearly: 14990,
      description: 'Custom tailored plan for specific restaurant requirements',
      sort_order: plans.length + 1
    };
    setEditingPlan(newPlan);
    setBuilderActiveSection('basic');
    setBuilderModalOpen(true);
  };

  const handleOpenEditModal = (plan: PlanEntitlementSpec) => {
    setEditingPlan(JSON.parse(JSON.stringify(plan)));
    setBuilderActiveSection('basic');
    setBuilderModalOpen(true);
  };

  const handleDuplicatePlan = async (plan: PlanEntitlementSpec) => {
    const newName = prompt(`Enter new name for duplicated plan:`, `${plan.name} COPY`);
    if (!newName) return;
    const newId = newName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'duplicate_plan',
          sourcePlanId: plan.id,
          newPlanId: newId,
          newPlanName: newName
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully duplicated as ${newName}`);
        await loadPlans();
      } else {
        alert(`Error duplicating plan: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Failed to duplicate plan: ${e.message}`);
    }
  };

  const handleDeletePlan = async (plan: PlanEntitlementSpec) => {
    const activeCount = usageCounts[plan.id] || 0;
    if (activeCount > 0) {
      alert(`Cannot delete plan "${plan.name}": ${activeCount} active restaurant(s) are subscribed to it. Reassign them first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete plan "${plan.name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/plans?planId=${plan.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert(`Plan deleted successfully`);
        await loadPlans();
      } else {
        alert(`Error deleting plan: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Failed to delete plan: ${e.message}`);
    }
  };

  const handleTogglePlanActive = async (plan: PlanEntitlementSpec) => {
    const updated = { ...plan, is_active: !plan.is_active };
    await savePlanSpec(updated);
  };

  const savePlanSpec = async (specToSave: PlanEntitlementSpec) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSpec: specToSave,
          adminUser: 'Super Admin',
          role: 'super_admin'
        })
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(`Server returned HTTP ${res.status} (${res.statusText || 'Invalid JSON response'})`);
      }

      if (!res.ok || !data?.success) {
        const errorMsg = data?.error || (
          res.status === 401 ? 'Unauthorized: Please log in as Super Admin.' :
          res.status === 403 ? 'Forbidden: Super Admin privileges required.' :
          res.status === 400 ? 'Bad Request: Invalid plan specifications.' :
          `HTTP ${res.status} Server Error`
        );
        alert(`Error saving plan: ${errorMsg}`);
        return;
      }

      setBuilderModalOpen(false);
      await loadPlans();
      if (onRefreshData) onRefreshData();
    } catch (e: any) {
      const isNetworkError = e instanceof TypeError && (
        e.message === 'fetch failed' || 
        e.message.toLowerCase().includes('failed to fetch') ||
        e.message.toLowerCase().includes('networkerror')
      );
      const friendlyMsg = isNetworkError
        ? 'Network Error: Unable to reach localhost server. Please verify the local development server is running.'
        : (e?.message || 'Failed to save plan due to an unexpected error.');
      alert(`Error saving plan: ${friendlyMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    savePlanSpec(editingPlan);
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_restaurant_plan',
          restId: selectedRestaurant.id,
          targetPlanId,
          adminUser: 'Super Admin'
        })
      });
      const data = await res.json();
      if (data.success) {
        setAssignModalOpen(false);
        alert(`Plan changed to ${targetPlanId.toUpperCase()} successfully!`);
        await loadPlans();
        if (onRefreshData) onRefreshData();
      } else {
        alert(`Error assigning plan: ${data.error}`);
      }
    } catch (e: any) {
      alert(`Failed to assign plan: ${e.message}`);
    }
  };

  // Group feature catalog by category
  const categories = Array.from(new Set(FEATURE_CATALOG.map(f => f.category)));

  return (
    <div className="space-y-6">
      
      {/* Header & Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">SaaS Pricing Plans & Entitlement Builder</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fully configurable plan prices, feature gates, resource limits, and AI credit quotas. Zero code changes required.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'plans' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Plans Cards
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'matrix' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Comparison Matrix
            </button>
          </div>

          <Button onClick={handleOpenCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
            <Plus className="h-4 w-4 mr-1" /> Create SaaS Plan
          </Button>
        </div>
      </div>

      {/* View 1: Plans Cards */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const activeCount = usageCounts[plan.id] || 0;
            const isSystemDefault = ['starter', 'pro', 'premium', 'custom'].includes(plan.id);

            return (
              <Card key={plan.id} className={`relative flex flex-col justify-between transition-all dark:bg-slate-900 ${plan.is_popular ? 'border-2 border-indigo-500 shadow-lg' : 'border border-slate-200 dark:border-slate-800'}`}>
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-full shadow">
                    ★ Most Popular
                  </div>
                )}

                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{plan.name}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">{plan.description}</p>
                    </div>
                    <Badge variant={plan.is_active ? 'success' : 'neutral'}>
                      {plan.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">₹{plan.price_monthly.toLocaleString('en-IN')}</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ month</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">₹{plan.price_yearly.toLocaleString('en-IN')} billed annually</p>
                  </div>

                  {/* Subscribers badge */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Subscribed Tenants:</span>
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{activeCount} Restaurant{activeCount === 1 ? '' : 's'}</span>
                  </div>

                  {/* Highlights Summary */}
                  <div className="space-y-2 text-xs border-t border-b border-slate-100 dark:border-slate-800 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Max Tables:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{plan.limits.tables === null ? 'Unlimited' : plan.limits.tables}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Staff Accounts:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{plan.limits.staff_accounts === null ? 'Unlimited' : plan.limits.staff_accounts}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Inventory Items:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{plan.limits.inventory_items === null ? 'Unlimited' : plan.limits.inventory_items}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">AI Menu Credits:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {!plan.features?.ai_menu || plan.ai_limits?.ai_menu_analysis === 0 ? 'LOCKED (0)' : plan.ai_limits?.ai_menu_analysis === null ? 'Unlimited' : `${plan.ai_limits?.ai_menu_analysis} credits`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">AI Recipe Credits:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {!plan.features?.ai_recipe || plan.ai_limits?.ai_recipe_generation === 0 ? 'LOCKED (0)' : plan.ai_limits?.ai_recipe_generation === null ? 'Unlimited' : `${plan.ai_limits?.ai_recipe_generation} credits`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-1">
                    <Button
                      onClick={() => handleOpenEditModal(plan)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit Plan & Entitlements
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDuplicatePlan(plan)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px] rounded-lg transition-colors"
                      >
                        <Copy className="h-3 w-3" /> Duplicate
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan)}
                        disabled={isSystemDefault || activeCount > 0}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 font-semibold text-[11px] rounded-lg transition-colors ${isSystemDefault || activeCount > 0 ? 'bg-slate-50 dark:bg-slate-950 text-slate-300 dark:text-slate-700 cursor-not-allowed' : 'bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 border border-rose-200 dark:border-rose-900'}`}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* View 2: Dynamic Matrix View */}
      {activeTab === 'matrix' && (
        <Card className="dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 font-bold uppercase tracking-wider text-xs">Feature / Entitlement</th>
                  {plans.map(p => (
                    <th key={p.id} className="p-4 text-center font-extrabold text-sm border-l border-slate-800">
                      {p.name}
                      <div className="text-xs font-normal text-indigo-400 mt-0.5">₹{p.price_monthly}/mo</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* Resource Limits Section */}
                <tr className="bg-slate-100 dark:bg-slate-950/80">
                  <td colSpan={plans.length + 1} className="p-3 font-extrabold uppercase text-[11px] text-slate-500 dark:text-slate-400">
                    Resource Limits
                  </td>
                </tr>
                {RESOURCE_LIMIT_CATALOG.map(res => (
                  <tr key={res.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{res.label}</td>
                    {plans.map(p => {
                      const val = p.limits[res.key];
                      return (
                        <td key={p.id} className="p-3.5 text-center font-bold border-l border-slate-100 dark:border-slate-800">
                          {val === null || val === undefined ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Unlimited</span>
                          ) : (
                            <span className="text-slate-900 dark:text-slate-100">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* AI Quotas Section */}
                <tr className="bg-slate-100 dark:bg-slate-950/80">
                  <td colSpan={plans.length + 1} className="p-3 font-extrabold uppercase text-[11px] text-slate-500 dark:text-slate-400">
                    AI Monthly Quotas
                  </td>
                </tr>
                {AI_LIMIT_CATALOG.map(ai => (
                  <tr key={ai.key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{ai.label}</td>
                    {plans.map(p => {
                      const val = p.ai_limits[ai.key];
                      return (
                        <td key={p.id} className="p-3.5 text-center font-bold border-l border-slate-100 dark:border-slate-800">
                          {val === null || val === undefined ? (
                            <span className="text-purple-600 dark:text-purple-400 font-extrabold">Custom / Unlimited</span>
                          ) : (
                            <span className="text-slate-900 dark:text-slate-100">{val} / mo</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Feature Toggles Section */}
                {categories.map(cat => (
                  <tr key={cat}>
                    <td colSpan={plans.length + 1} className="p-[0px]">
                      <div className="bg-slate-100 dark:bg-slate-950/80 p-3 font-extrabold uppercase text-[11px] text-slate-500 dark:text-slate-400">
                        {cat}
                      </div>
                      {FEATURE_CATALOG.filter(f => f.category === cat).map(feat => (
                        <div key={feat.key} className="flex hover:bg-slate-50 dark:hover:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
                          <div className="w-1/5 p-3 font-medium text-slate-900 dark:text-white shrink-0">{feat.label}</div>
                          {plans.map(p => {
                            const enabled = p.features[feat.key] !== false;
                            return (
                              <div key={p.id} className="flex-1 p-3 text-center border-l border-slate-100 dark:border-slate-800 flex items-center justify-center">
                                {enabled ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 font-bold">—</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* PLAN BUILDER DRAWER / MODAL */}
      {builderModalOpen && editingPlan && (
        <Dialog isOpen={builderModalOpen} onClose={() => setBuilderModalOpen(false)} title={`Configure Plan: ${editingPlan.name}`}>
          <form onSubmit={handleSaveModal} className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
            
            {/* Modal Section Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setBuilderActiveSection('basic')}
                className={`py-2 px-4 border-b-2 transition-colors ${builderActiveSection === 'basic' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                1. Plan Details
              </button>
              <button
                type="button"
                onClick={() => setBuilderActiveSection('limits')}
                className={`py-2 px-4 border-b-2 transition-colors ${builderActiveSection === 'limits' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                2. Resource Limits
              </button>
              <button
                type="button"
                onClick={() => setBuilderActiveSection('features')}
                className={`py-2 px-4 border-b-2 transition-colors ${builderActiveSection === 'features' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                3. Feature Toggles ({Object.values(editingPlan.features).filter(Boolean).length})
              </button>
              <button
                type="button"
                onClick={() => setBuilderActiveSection('ai')}
                className={`py-2 px-4 border-b-2 transition-colors ${builderActiveSection === 'ai' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                4. AI Credit Limits
              </button>
            </div>

            {/* SECTION 1: BASIC DETAILS */}
            {builderActiveSection === 'basic' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Plan Display Name</label>
                    <input
                      type="text"
                      value={editingPlan.name}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 font-bold uppercase"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Billing Interval</label>
                    <select
                      value={editingPlan.billing_interval}
                      onChange={(e) => setEditingPlan({ ...editingPlan, billing_interval: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 font-bold"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Price (₹)</label>
                    <input
                      type="number"
                      value={editingPlan.price_monthly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Yearly Price (₹)</label>
                    <input
                      type="number"
                      value={editingPlan.price_yearly}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price_yearly: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Subtitle</label>
                  <textarea
                    value={editingPlan.description}
                    onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-950 text-xs"
                  />
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={editingPlan.is_popular}
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_popular: e.target.checked })}
                      className="h-4 w-4 rounded text-indigo-600"
                    />
                    Mark as "Most Popular" Plan
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="checkbox"
                      checked={editingPlan.is_active}
                      onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                      className="h-4 w-4 rounded text-emerald-600"
                    />
                    Plan Active (Available for new subscriptions)
                  </label>
                </div>
              </div>
            )}

            {/* SECTION 2: RESOURCE LIMITS */}
            {builderActiveSection === 'limits' && (
              <div className="space-y-4 text-xs">
                <p className="text-slate-500">Specify numerical thresholds or check "Unlimited".</p>
                
                {RESOURCE_LIMIT_CATALOG.map((res) => {
                  const currentVal = editingPlan.limits[res.key];
                  const isUnlimited = currentVal === null || currentVal === undefined;

                  return (
                    <div key={res.key} className="flex items-center justify-between p-3 border rounded-lg dark:border-slate-800">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">{res.label}</span>
                        <span className="text-[11px] text-slate-500">{res.description}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 font-semibold text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isUnlimited}
                            onChange={(e) => {
                              const newLimits = { ...editingPlan.limits };
                              newLimits[res.key] = e.target.checked ? null : 25;
                              setEditingPlan({ ...editingPlan, limits: newLimits });
                            }}
                            className="h-4 w-4 text-emerald-600 rounded"
                          />
                          Unlimited
                        </label>

                        {!isUnlimited && (
                          <input
                            type="number"
                            value={currentVal || 0}
                            onChange={(e) => {
                              const newLimits = { ...editingPlan.limits };
                              newLimits[res.key] = Number(e.target.value);
                              setEditingPlan({ ...editingPlan, limits: newLimits });
                            }}
                            className="w-24 px-2.5 py-1 border rounded text-right font-bold dark:bg-slate-950"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECTION 3: FEATURE TOGGLES */}
            {builderActiveSection === 'features' && (
              <div className="space-y-6 text-xs">
                {categories.map((cat) => (
                  <div key={cat} className="space-y-3">
                    <h5 className="font-extrabold text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 border-b border-slate-200 dark:border-slate-800 pb-1">
                      {cat}
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {FEATURE_CATALOG.filter(f => f.category === cat).map((feat) => {
                        const isEnabled = editingPlan.features[feat.key] !== false;

                        return (
                          <label key={feat.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isEnabled ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => {
                                const newFeats = { ...editingPlan.features };
                                newFeats[feat.key] = e.target.checked;
                                setEditingPlan({ ...editingPlan, features: newFeats });
                              }}
                              className="mt-0.5 h-4 w-4 rounded text-indigo-600"
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{feat.label}</span>
                              <span className="text-[10px] text-slate-500">{feat.description}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SECTION 4: AI CREDIT LIMITS */}
            {builderActiveSection === 'ai' && (
              <div className="space-y-6 text-xs">
                <div className="bg-purple-50 dark:bg-purple-950/30 p-3.5 rounded-xl border border-purple-200 dark:border-purple-800 flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
                  <Sparkles className="h-5 w-5 shrink-0 text-purple-500" />
                  <p>Configure monthly item credits and operation thresholds for AI features. AI Review Generation is disabled globally.</p>
                </div>

                {/* AI MENU ANALYSIS */}
                <div className="p-4 border rounded-xl dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        AI MENU ANALYSIS
                      </h4>
                      <p className="text-[11px] text-slate-500">Item credits consumed when extracting physical menus via Gemini Vision OCR</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Item Credits</label>
                      <input
                        type="number"
                        value={editingPlan.ai_limits.ai_menu_analysis ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingPlan({
                            ...editingPlan,
                            ai_limits: { ...editingPlan.ai_limits, ai_menu_analysis: val }
                          });
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-950 font-bold text-sm"
                      />
                      <span className="text-[10px] text-slate-400">1 extracted dish = 1 credit</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Items Per Analysis</label>
                      <input
                        type="number"
                        value={editingPlan.ai_limits.ai_menu_max_items ?? editingPlan.ai_limits.max_items_per_request ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingPlan({
                            ...editingPlan,
                            ai_limits: { ...editingPlan.ai_limits, ai_menu_max_items: val, max_items_per_request: val }
                          });
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-950 font-bold text-sm"
                      />
                      <span className="text-[10px] text-slate-400">Max items allowed per single scan</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Analyses Per Month</label>
                      <input
                        type="number"
                        value={editingPlan.ai_limits.ai_menu_max_analyses ?? editingPlan.ai_limits.max_requests_per_month ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingPlan({
                            ...editingPlan,
                            ai_limits: { ...editingPlan.ai_limits, ai_menu_max_analyses: val, max_requests_per_month: val }
                          });
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-950 font-bold text-sm"
                      />
                      <span className="text-[10px] text-slate-400">Maximum scan attempts / month</span>
                    </div>
                  </div>
                </div>

                {/* AI RECIPE GENERATION */}
                <div className="p-4 border rounded-xl dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        AI RECIPE GENERATION
                      </h4>
                      <p className="text-[11px] text-slate-500">Item credits consumed when generating structured recipes & ingredients using AI</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Monthly Item Credits</label>
                      <input
                        type="number"
                        value={editingPlan.ai_limits.ai_recipe_generation ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingPlan({
                            ...editingPlan,
                            ai_limits: { ...editingPlan.ai_limits, ai_recipe_generation: val }
                          });
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-950 font-bold text-sm"
                      />
                      <span className="text-[10px] text-slate-400">1 generated recipe = 1 credit</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Recipes Per Generation</label>
                      <input
                        type="number"
                        value={editingPlan.ai_limits.ai_recipe_max_recipes ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingPlan({
                            ...editingPlan,
                            ai_limits: { ...editingPlan.ai_limits, ai_recipe_max_recipes: val }
                          });
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-950 font-bold text-sm"
                      />
                      <span className="text-[10px] text-slate-400">Max recipe items per single request</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Max Generations Per Month</label>
                      <input
                        type="number"
                        value={editingPlan.ai_limits.ai_recipe_max_generations ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditingPlan({
                            ...editingPlan,
                            ai_limits: { ...editingPlan.ai_limits, ai_recipe_max_generations: val }
                          });
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg dark:bg-slate-950 font-bold text-sm"
                      />
                      <span className="text-[10px] text-slate-400">Maximum recipe generation requests / month</span>
                    </div>
                  </div>
                </div>

                {/* AI REVIEW GENERATION (DISABLED GLOBALLY) */}
                <div className="p-4 border border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-50/60 dark:bg-slate-950/40 opacity-70 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      AI REVIEW GENERATION
                    </h4>
                    <p className="text-[11px] text-slate-500">Customer AI Review Generation feature is disabled globally across all plans.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Disabled Globally
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setBuilderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Save Plan Entitlements
              </Button>
            </div>
          </form>
        </Dialog>
      )}

    </div>
  );
}
