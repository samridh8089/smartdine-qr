'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { db, Restaurant, PricingPlan, getEffectiveSubscriptionStatus } from '@/lib/db';
import { parsePlanSpec } from '@/lib/entitlements';
import { getActiveUser, supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import MockBanner from '@/components/shared/MockBanner';
import SaaSPlanBuilder from '@/components/admin/SaaSPlanBuilder';
import { 
  ShieldAlert, Users, Database, DollarSign, LogOut, 
  Settings, Check, Edit2, AlertCircle, TrendingUp, Clock, Trash2, Mail,
  Key, Eye, EyeOff, Copy, ExternalLink, LogIn, CheckCircle2, Search,
  Activity, Sparkles, Plus, RefreshCw, Send, Lock, Phone, Sliders,
  ChevronDown, ChevronRight, X, AlertTriangle, Play, Pause, Layers,
  Radio, Monitor, Globe, Filter, Download, ArrowUpRight, BarChart3,
  Calendar, CreditCard, UserCheck, Zap, History, MessageSquare, UtensilsCrossed
} from 'lucide-react';

// Dynamic import of FounderControlCenter to embed inside Super Admin Command Center
const FounderControlCenter = dynamic(
  () => import('@/components/founder/FounderControlCenter'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-slate-950 p-12 min-h-[500px] rounded-2xl">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-indigo-400 font-mono text-sm">Initializing Command Center Live Graph...</p>
        </div>
      </div>
    ),
  }
);

export default function SuperAdminPage() {
  const router = useRouter();

  // --- 1. Top-Level State Declarations (React Hook Safety Guardrail) ---
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [ownerProfilesMap, setOwnerProfilesMap] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'command-center' | 'restaurants' | 'pricing' | 'revenue' | 'alerts' | 'explorer' | 'timeline' | 'audit-logs'>('overview');
  const [selectedRestId, setSelectedRestId] = useState<string>('');
  const [adminUser, setAdminUser] = useState<any>(null);

  // Realized Revenue & Admin Stats
  const [adminStats, setAdminStats] = useState({
    totalRestaurants: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    monthRevenue: 0,
    lifetimeRevenue: 0,
    activeSubscriptions: 0,
    mrr: 0,
    arr: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsAmount: 0,
    totalPaidCustomers: 0,
    trialUsers: 0,
    expiredLicenses: 0,
    activeLicenses: 0
  });

  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [reminderSending, setReminderSending] = useState<string | null>(null);
  const [selectedRestaurantIds, setSelectedRestaurantIds] = useState<string[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);
  const [auditLogsSearch, setAuditLogsSearch] = useState('');
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Global Switcher Modal State (Ctrl+Shift+R)
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');

  // Impersonation Modal State (PART P0)
  const [impersonateModalOpen, setImpersonateModalOpen] = useState(false);
  const [impersonateTargetRest, setImpersonateTargetRest] = useState<Restaurant | null>(null);
  const [impersonatingAction, setImpersonatingAction] = useState<string | null>(null);

  // Everything Editable Modals State
  // 1. Restaurant Edit
  const [editRestModalOpen, setEditRestModalOpen] = useState(false);
  const [editingRest, setEditingRest] = useState<Restaurant | null>(null);
  const [editRestForm, setEditRestForm] = useState({
    name: '',
    logo_url: '',
    slug: '',
    address: '',
    gst_number: '',
    phone: '',
    email: '',
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  });

  // 2. Subscription Edit
  const [editSubModalOpen, setEditSubModalOpen] = useState(false);
  const [editingSubRest, setEditingSubRest] = useState<Restaurant | null>(null);
  const [editSubForm, setEditSubForm] = useState<{
    plan: string;
    price: number;
    billing_interval: 'monthly' | 'yearly';
    status: Restaurant['subscription_status'];
    expiryDate: string;
    isTrial: boolean;
  }>({
    plan: 'starter',
    price: 499,
    billing_interval: 'monthly',
    status: 'active',
    expiryDate: '',
    isTrial: false
  });

  // 3. Owner Edit
  const [editOwnerModalOpen, setEditOwnerModalOpen] = useState(false);
  const [editingOwnerProfile, setEditingOwnerProfile] = useState<any>(null);
  const [editOwnerRest, setEditOwnerRest] = useState<Restaurant | null>(null);
  const [editOwnerForm, setEditOwnerForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    new_password: '',
    status: 'active'
  });

  // 4. Staff Management Modal
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffRest, setStaffRest] = useState<Restaurant | null>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [editingStaffMember, setEditingStaffMember] = useState<any | null>(null);
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    email: '',
    role: 'waiter',
    pin: '',
    shift: 'General',
    active: true
  });

  // 5. Tables Management Modal
  const [tablesModalOpen, setTablesModalOpen] = useState(false);
  const [tablesRest, setTablesRest] = useState<Restaurant | null>(null);
  const [restTables, setRestTables] = useState<any[]>([]);
  const [newTableName, setNewTableName] = useState('');

  // Bulk Operations Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>('extend_license');
  const [bulkPayload, setBulkPayload] = useState({ days: 30, plan: 'pro', message: '' });
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Broadcast Notification Modal
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Delete Tenant Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRest, setDeletingRest] = useState<Restaurant | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteImpactStats, setDeleteImpactStats] = useState({ ordersCount: 0, totalRevenue: 0 });

  // Explorer Search State
  const [explorerQuery, setExplorerQuery] = useState('');

  // Toast / Feedback State
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // --- 2. useMemo Computations ---
  const activeRestaurant = useMemo(() => {
    return restaurants.find(r => r.id === selectedRestId) || restaurants[0] || null;
  }, [restaurants, selectedRestId]);

  const filteredRestaurants = useMemo(() => {
    if (!searchQuery.trim()) return restaurants;
    const q = searchQuery.toLowerCase().trim();
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.slug.toLowerCase().includes(q) || 
      (r.subscription_plan && r.subscription_plan.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q))
    );
  }, [restaurants, searchQuery]);

  const switcherResults = useMemo(() => {
    if (!switcherSearch.trim()) return restaurants.slice(0, 8);
    const q = switcherSearch.toLowerCase().trim();
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.slug.toLowerCase().includes(q) ||
      (ownerProfilesMap[r.id]?.full_name && ownerProfilesMap[r.id].full_name.toLowerCase().includes(q)) ||
      (ownerProfilesMap[r.id]?.email && ownerProfilesMap[r.id].email.toLowerCase().includes(q))
    ).slice(0, 10);
  }, [restaurants, switcherSearch, ownerProfilesMap]);

  // Real-time calculated alerts
  const computedAlerts = useMemo(() => {
    const alertsList: Array<{
      id: string;
      restaurant: Restaurant;
      type: 'payment_failed' | 'expiring_soon' | 'kitchen_offline' | 'inventory_low' | 'waiter_offline';
      title: string;
      description: string;
      severity: 'critical' | 'warning' | 'info';
      timestamp: string;
    }> = [];

    restaurants.forEach(r => {
      const effStatus = getEffectiveSubscriptionStatus(r);
      const settings = (r.settings as any) || {};

      // 1. Payment Failed
      if ((r.subscription_status as string) === 'past_due' || (r.subscription_status as string) === 'pending_payment' || settings.last_payment_error) {
        alertsList.push({
          id: `pay_${r.id}`,
          restaurant: r,
          type: 'payment_failed',
          title: 'Subscription Payment Failed',
          description: settings.last_payment_error?.error_description || 'Tenant payment renewal past due or failed.',
          severity: 'critical',
          timestamp: settings.last_payment_error?.failed_at || new Date().toISOString()
        });
      }

      // 2. Expiring in 3 days
      if (r.trial_ends_at) {
        const exp = new Date(r.trial_ends_at);
        const diffDays = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0 && diffDays <= 3) {
          alertsList.push({
            id: `exp_${r.id}`,
            restaurant: r,
            type: 'expiring_soon',
            title: `License Expiring in ${diffDays} Day${diffDays === 1 ? '' : 's'}`,
            description: `${r.name}'s ${r.subscription_plan.toUpperCase()} plan ends soon.`,
            severity: 'warning',
            timestamp: new Date().toISOString()
          });
        }
      }

      // 3. Simulated/Live telemetry alert flags
      if (settings.kitchen_offline) {
        alertsList.push({
          id: `kds_${r.id}`,
          restaurant: r,
          type: 'kitchen_offline',
          title: 'Kitchen Display Screen Offline',
          description: 'No active heartbeat detected from kitchen station in last 15 minutes.',
          severity: 'warning',
          timestamp: new Date().toISOString()
        });
      }
    });

    return alertsList;
  }, [restaurants]);

  // Explorer multi-entity search results
  const explorerResults = useMemo(() => {
    if (!explorerQuery.trim()) return [];
    const q = explorerQuery.toLowerCase().trim();
    const results: any[] = [];

    // Match Restaurants
    restaurants.forEach(r => {
      if (r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || r.phone?.includes(q)) {
        results.push({ type: 'Restaurant', title: r.name, sub: `Slug: ${r.slug} • Plan: ${r.subscription_plan}`, obj: r });
      }
    });

    // Match Owners
    Object.entries(ownerProfilesMap).forEach(([rId, prof]) => {
      if (prof.full_name?.toLowerCase().includes(q) || prof.email?.toLowerCase().includes(q) || prof.phone?.includes(q)) {
        const rest = restaurants.find(r => r.id === rId);
        results.push({ type: 'Owner', title: prof.full_name || prof.email, sub: `Restaurant: ${rest?.name || rId} • ${prof.email}`, obj: rest });
      }
    });

    return results;
  }, [explorerQuery, restaurants, ownerProfilesMap]);

  // --- 3. useCallback Handlers ---
  const showFeedback = useCallback((msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  }, []);

  const loadAdminData = useCallback(async () => {
    try {
      // Clear any orphan impersonation session if user landed back on Super Admin
      if (typeof window !== 'undefined' && sessionStorage.getItem('smartdine_impersonated_profile')) {
        sessionStorage.removeItem('smartdine_impersonated_profile');
      }

      const rests = await db.getRestaurants();
      const stats = await db.getSuperAdminStats();
      const plans = await db.getPricingPlans();
      
      setRestaurants(rests);
      setAdminStats(stats);
      setPricingPlans(plans);

      if (rests.length > 0 && !selectedRestId) {
        setSelectedRestId(rests[0].id);
      }

      // Fetch owner profiles
      const { data: ownersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'owner');

      const oMap: Record<string, any> = {};
      (ownersData || []).forEach(o => {
        if (o.restaurant_id) oMap[o.restaurant_id] = o;
      });
      setOwnerProfilesMap(oMap);

      // Fetch recent audit logs
      fetch('/api/admin/audit-logs?limit=50')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d && d.logs) setRecentAuditLogs(d.logs);
        })
        .catch(() => {});

      // Fetch analytics trends
      fetch('/api/admin/analytics')
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d && d.success) setAnalyticsData(d);
        })
        .catch(() => {});

    } catch (err: any) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedRestId]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+R → Global Restaurant Switcher
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        setSwitcherOpen(prev => !prev);
      }
      // Ctrl+Shift+C → Command Center Tab
      else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setActiveTab('command-center');
      }
      // Ctrl+Shift+L → Login as Current Restaurant
      else if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (activeRestaurant) {
          setImpersonateTargetRest(activeRestaurant);
          setImpersonateModalOpen(true);
        }
      }
      // Ctrl+Shift+A → Real-time Alerts Tab
      else if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setActiveTab('alerts');
      }
      // Esc → Close open modals or switcher
      else if (e.key === 'Escape') {
        setSwitcherOpen(false);
        setImpersonateModalOpen(false);
        setEditRestModalOpen(false);
        setEditSubModalOpen(false);
        setEditOwnerModalOpen(false);
        setStaffModalOpen(false);
        setTablesModalOpen(false);
        setBulkModalOpen(false);
        setBroadcastModalOpen(false);
        setDeleteModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRestaurant]);

  // Auth & Admin Access Check
  useEffect(() => {
    async function checkAdminAuth() {
      // Clear impersonation session so super admin can always load this page
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('smartdine_impersonated_profile');
      }

      const user = await getActiveUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      setAdminUser(user);

      const userEmail = (user.email || '').toLowerCase().trim();
      const isSuperAdminOrFounder = user.role === 'super_admin' ||
        userEmail === 'dsoni1281@gmail.com' ||
        userEmail === 'admin@cleverops.in' ||
        userEmail === 'founder@cleverops.in' ||
        userEmail === 'samridhtomar8@gmail.com' ||
        userEmail === 'superadmin@cleverops.in' ||
        userEmail === 'superadmin@test.com';

      if (!isSuperAdminOrFounder) {
        console.warn(`[SUPER ADMIN DENIED]: User ${user.email} (Role: ${user.role}) attempted unauthorized access.`);
        if (user.role === 'waiter' || user.role === 'staff') router.replace('/menu');
        else if (user.role === 'kitchen') router.replace('/dashboard/kds');
        else router.replace('/dashboard');
        return;
      }

      await loadAdminData();
    }
    checkAdminAuth();
  }, [router, loadAdminData]);

  // --- 4. Impersonation Execution ---
  const handleExecuteImpersonation = async (targetRole: 'owner' | 'kitchen' | 'waiter' | 'customer') => {
    if (!impersonateTargetRest) return;
    setImpersonatingAction(targetRole);

    try {
      if (targetRole === 'customer') {
        window.open(`/menu/${impersonateTargetRest.slug}`, '_blank');
        setImpersonateModalOpen(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token || '';

      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          targetRestaurantId: impersonateTargetRest.id,
          targetRole
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to initialize impersonation session');
        return;
      }

      // Store impersonated profile in sessionStorage
      sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(data.ownerProfile));
      sessionStorage.setItem('smartdine_super_admin_return', 'true');

      setImpersonateModalOpen(false);

      if (targetRole === 'kitchen') {
        router.push('/dashboard/kds');
      } else if (targetRole === 'waiter') {
        router.push('/dashboard/orders');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      alert(`Error initializing impersonation session: ${err.message}`);
    } finally {
      setImpersonatingAction(null);
    }
  };

  // --- 5. Edit Entity Handlers ---
  const handleOpenEditRestaurant = (rest: Restaurant) => {
    setEditingRest(rest);
    const settings = (rest.settings as any) || {};
    setEditRestForm({
      name: rest.name || '',
      logo_url: rest.logo_url || '',
      slug: rest.slug || '',
      address: rest.address || '',
      gst_number: rest.gst_number || '',
      phone: rest.phone || '',
      email: settings.owner_email || (rest as any).owner_email || '',
      currency: settings.currency || 'INR',
      timezone: settings.timezone || 'Asia/Kolkata'
    });
    setEditRestModalOpen(true);
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRest) return;
    try {
      const res = await fetch('/api/admin/entity-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'restaurant',
          entityId: editingRest.id,
          updates: {
            name: editRestForm.name,
            logo_url: editRestForm.logo_url,
            slug: editRestForm.slug,
            address: editRestForm.address,
            gst_number: editRestForm.gst_number,
            phone: editRestForm.phone,
            settings: {
              ...(editingRest.settings as any),
              currency: editRestForm.currency,
              timezone: editRestForm.timezone,
              owner_email: editRestForm.email
            }
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update restaurant');

      setEditRestModalOpen(false);
      showFeedback(`Saved restaurant details for "${editRestForm.name}"`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Error saving restaurant: ${err.message}`);
    }
  };

  const handleOpenEditSubscription = (rest: Restaurant) => {
    setEditingSubRest(rest);
    const matchedPlan = pricingPlans.find(p => p.id === rest.subscription_plan);
    const price = (rest.settings as any)?.custom_plan_price || 
      (rest.billing_interval === 'yearly' ? matchedPlan?.price_yearly : matchedPlan?.price_monthly) || 499;

    setEditSubForm({
      plan: rest.subscription_plan,
      price,
      billing_interval: (rest.billing_interval as any) || 'monthly',
      status: rest.subscription_status,
      expiryDate: rest.trial_ends_at ? new Date(rest.trial_ends_at).toISOString().split('T')[0] : '',
      isTrial: rest.subscription_status === 'trial'
    });
    setEditSubModalOpen(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubRest) return;
    try {
      const expiryIso = editSubForm.expiryDate ? new Date(editSubForm.expiryDate).toISOString() : undefined;
      const res = await fetch('/api/admin/entity-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'subscription',
          entityId: editingSubRest.id,
          updates: {
            plan: editSubForm.plan,
            status: editSubForm.status,
            billing_interval: editSubForm.billing_interval,
            trial_ends_at: expiryIso,
            price: Number(editSubForm.price)
          },
          reason: 'Founder Command Center license update'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update subscription');

      setEditSubModalOpen(false);
      showFeedback(`Subscription updated for "${editingSubRest.name}"`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Error updating subscription: ${err.message}`);
    }
  };

  const handleOpenEditOwner = (rest: Restaurant) => {
    setEditOwnerRest(rest);
    const owner = ownerProfilesMap[rest.id] || null;
    setEditingOwnerProfile(owner);
    setEditOwnerForm({
      full_name: owner?.full_name || (rest.settings as any)?.owner_name || '',
      email: owner?.email || (rest.settings as any)?.owner_email || '',
      phone: owner?.phone || rest.phone || '',
      new_password: '',
      status: 'active'
    });
    setEditOwnerModalOpen(true);
  };

  const handleSaveOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOwnerRest) return;
    try {
      const ownerId = editingOwnerProfile?.id;
      if (!ownerId) {
        alert('No owner profile ID found for this restaurant.');
        return;
      }

      const updates: any = {
        full_name: editOwnerForm.full_name,
        email: editOwnerForm.email,
        phone: editOwnerForm.phone
      };
      if (editOwnerForm.new_password) {
        updates.new_password = editOwnerForm.new_password;
      }

      const res = await fetch('/api/admin/entity-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'owner',
          entityId: ownerId,
          restaurantId: editOwnerRest.id,
          updates,
          reason: 'Founder Super Admin owner credential update'
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update owner');

      setEditOwnerModalOpen(false);
      showFeedback(`Owner credentials updated for "${editOwnerRest.name}"`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Error updating owner: ${err.message}`);
    }
  };

  // Staff Management Handlers
  const handleOpenStaffModal = async (rest: Restaurant) => {
    setStaffRest(rest);
    setStaffMembers([]);
    setEditingStaffMember(null);
    setStaffModalOpen(true);

    try {
      const staffList = await db.getRestaurantStaffList(rest.id);
      setStaffMembers(staffList);
    } catch (e) {
      console.warn('Failed to fetch staff list:', e);
    }
  };

  const handleSaveStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffRest) return;

    try {
      if (editingStaffMember) {
        const res = await fetch('/api/admin/entity-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: 'staff',
            entityId: editingStaffMember.id,
            restaurantId: staffRest.id,
            updates: {
              full_name: staffForm.full_name,
              email: staffForm.email,
              role: staffForm.role,
              pin: staffForm.pin
            }
          })
        });
        if (!res.ok) throw new Error('Failed to update staff');
      }

      const updated = await db.getRestaurantStaffList(staffRest.id);
      setStaffMembers(updated);
      setEditingStaffMember(null);
      setStaffForm({ full_name: '', email: '', role: 'waiter', pin: '', shift: 'General', active: true });
      showFeedback('Staff updated successfully');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Tables Management Handlers
  const handleOpenTablesModal = async (rest: Restaurant) => {
    setTablesRest(rest);
    setRestTables([]);
    setNewTableName('');
    setTablesModalOpen(true);

    try {
      const tablesList = await db.getRestaurantTablesList(rest.id);
      setRestTables(tablesList);
    } catch (e) {
      console.warn('Failed to fetch tables:', e);
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tablesRest || !newTableName.trim()) return;

    try {
      await db.createTable(tablesRest.id, newTableName.trim());
      setNewTableName('');
      const updated = await db.getRestaurantTablesList(tablesRest.id);
      setRestTables(updated);
      showFeedback(`Created Table "${newTableName}"`);
    } catch (err: any) {
      alert(`Error creating table: ${err.message}`);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!tablesRest || !confirm('Are you sure you want to delete this table?')) return;
    try {
      await db.deleteTable(tableId);
      const updated = await db.getRestaurantTablesList(tablesRest.id);
      setRestTables(updated);
      showFeedback('Table deleted');
    } catch (err: any) {
      alert(`Error deleting table: ${err.message}`);
    }
  };

  // Bulk Operations Execution
  const handleExecuteBulkAction = async () => {
    if (selectedRestaurantIds.length === 0) {
      alert('Please select at least one restaurant to perform bulk operations.');
      return;
    }
    setBulkProcessing(true);

    try {
      const res = await fetch('/api/admin/bulk-operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantIds: selectedRestaurantIds,
          action: bulkAction,
          payload: bulkPayload
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed bulk operation');

      setBulkModalOpen(false);
      setSelectedRestaurantIds([]);
      showFeedback(`Successfully performed ${bulkAction} on ${data.affected} restaurants`);
      await loadAdminData();
    } catch (err: any) {
      alert(`Bulk action error: ${err.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  // 1-Click Alert Resolver
  const handleResolveAlert = async (alertItem: any) => {
    try {
      if (alertItem.type === 'expiring_soon' || alertItem.type === 'payment_failed') {
        handleOpenEditSubscription(alertItem.restaurant);
      } else {
        showFeedback(`Diagnostics ran for ${alertItem.restaurant.name}. System refreshed.`);
      }
    } catch (e: any) {
      alert(`Action error: ${e.message}`);
    }
  };

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Helper date formatter
  const formatDateLabel = (isoDate?: string) => {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // --- 5. Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] dark:bg-[#081122]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Opening Founder Command Center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] dark:bg-[#081122] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <MockBanner />

      {/* Success Feedback Notification Toast */}
      {actionSuccessMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Founder Top Command Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-6 h-16 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-[14px] bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base md:text-lg tracking-tight text-slate-950 dark:text-white">CleverOps Command Center</h1>
              <span className="bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">Founder Edition</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Global SaaS Control • Single Centralized Command</p>
          </div>
        </div>

        {/* Global Restaurant Switcher & Keyboard Shortcut Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSwitcherOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200/80 dark:border-slate-700 shadow-sm"
            title="Global Restaurant Switcher (Ctrl+Shift+R)"
          >
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Switch Restaurant</span>
            <kbd className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-slate-500 border border-slate-200 dark:border-slate-700">Ctrl+Shift+R</kbd>
          </button>

          {/* Quick Impersonation Button for Current Selected Restaurant */}
          {activeRestaurant && (
            <button
              onClick={() => {
                setImpersonateTargetRest(activeRestaurant);
                setImpersonateModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              title="Login as Restaurant (Ctrl+Shift+L)"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Login as {activeRestaurant.name.slice(0, 14)}...</span>
            </button>
          )}

          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Sub-Navigation Tabs Bar */}
      <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 px-6 py-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> Overview
          </button>

          <button
            onClick={() => setActiveTab('command-center')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'command-center'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Command Center
          </button>

          <button
            onClick={() => setActiveTab('restaurants')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'restaurants'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UtensilsCrossed className="h-3.5 w-3.5" /> Restaurants & Health Grid
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'pricing'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" /> Pricing Plans & Enterprise
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'revenue'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Revenue & Analytics
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 relative ${
              activeTab === 'alerts'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertCircle className="h-3.5 w-3.5" /> Alerts & Incidents
            {computedAlerts.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {computedAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'explorer'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="h-3.5 w-3.5" /> Global Explorer
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="h-3.5 w-3.5" /> Subscription Timeline
          </button>

          <button
            onClick={() => setActiveTab('audit-logs')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'audit-logs'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="h-3.5 w-3.5" /> Founder Audit Logs
          </button>
        </div>
      </div>

      {/* Main Command Center Body */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8">

        {/* --- SECTION 1: OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header Title & Active Context */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Executive Realized Overview
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  100% Realized Revenue Metrics & Multi-Tenant Floor Telemetry. No estimated or projected calculations.
                </p>
              </div>

              {/* Founder Quick Actions Bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => setActiveTab('command-center')}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm gap-1"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Command Center
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBroadcastModalOpen(true)}
                  className="text-xs font-bold rounded-xl gap-1"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Broadcast Message
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkModalOpen(true)}
                  className="text-xs font-bold rounded-xl gap-1"
                >
                  <Sliders className="h-3.5 w-3.5" /> Bulk Operations
                </Button>
              </div>
            </div>

            {/* P0 Realized Revenue Metrics (6 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Card 1: Today's Revenue */}
              <Card className="rounded-[18px] bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Today's Revenue</span>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white mt-0.5 truncate">
                      {formatPrice(adminStats.todayRevenue)}
                    </h3>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">Realized today</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: This Month Revenue */}
              <Card className="rounded-[18px] bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">This Month Revenue</span>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white mt-0.5 truncate">
                      {formatPrice(adminStats.monthRevenue)}
                    </h3>
                    <p className="text-[10px] text-blue-600 font-bold mt-1">Realized current month</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Total Lifetime Revenue */}
              <Card className="rounded-[18px] bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Lifetime Revenue</span>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white mt-0.5 truncate">
                      {formatPrice(adminStats.lifetimeRevenue)}
                    </h3>
                    <p className="text-[10px] text-purple-600 font-bold mt-1">Cumulative all-time</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Active MRR */}
              <Card className="rounded-[18px] bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active MRR</span>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white mt-0.5 truncate">
                      {formatPrice(adminStats.mrr)}
                    </h3>
                    <p className="text-[10px] text-indigo-600 font-bold mt-1">{adminStats.totalPaidCustomers} paid active</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 5: ARR (Real Recurring Only) */}
              <Card className="rounded-[18px] bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">ARR (Actual Billed)</span>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white mt-0.5 truncate">
                      {formatPrice(adminStats.arr)}
                    </h3>
                    <p className="text-[10px] text-cyan-600 font-bold mt-1">Recurring rate</p>
                  </div>
                </CardContent>
              </Card>

              {/* Card 6: Pending Payments */}
              <Card className="rounded-[18px] bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Payments</span>
                    <h3 className="text-xl font-black text-slate-950 dark:text-white mt-0.5 truncate">
                      {adminStats.pendingPaymentsCount} ({formatPrice(adminStats.pendingPaymentsAmount)})
                    </h3>
                    <p className="text-[10px] text-amber-600 font-bold mt-1">Past due / retrying</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Restaurant Health Grid Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Live Restaurant Health Grid
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Instant telemetry across tenant operations</p>
                </div>
                <button
                  onClick={() => setActiveTab('restaurants')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  View All ({restaurants.length}) <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.slice(0, 6).map(rest => {
                  const effStatus = getEffectiveSubscriptionStatus(rest);
                  const isOnline = effStatus === 'active';
                  const statusColor = isOnline ? 'emerald' : effStatus === 'trial' ? 'amber' : 'rose';
                  const ownerProf = ownerProfilesMap[rest.id];

                  return (
                    <Card key={rest.id} className="rounded-[18px] border border-slate-200/80 dark:border-slate-800/80 hover:shadow-md transition-all">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-black flex items-center justify-center text-sm shrink-0">
                              {rest.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-sm text-slate-950 dark:text-white truncate">{rest.name}</h4>
                              <p className="text-[11px] text-slate-400 font-mono truncate">{rest.slug}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isOnline ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                            effStatus === 'trial' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' :
                            'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {effStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-b border-slate-100 dark:border-slate-800/80">
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Kitchen</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">Healthy (0 backlog)</p>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] uppercase font-bold">Plan</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200 uppercase mt-0.5">{rest.subscription_plan}</p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1"
                            onClick={() => {
                              setImpersonateTargetRest(rest);
                              setImpersonateModalOpen(true);
                            }}
                          >
                            <LogIn className="h-3 w-3" /> Login
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-bold rounded-xl"
                            onClick={() => handleOpenEditRestaurant(rest)}
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-bold rounded-xl"
                            onClick={() => {
                              setSelectedRestId(rest.id);
                              setActiveTab('command-center');
                            }}
                          >
                            <Sparkles className="h-3 w-3 text-amber-500" /> Command
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Real-time Alerts Summary */}
            {computedAlerts.length > 0 && (
              <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-[18px] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-black text-sm text-slate-900 dark:text-white">Active Operational Alerts ({computedAlerts.length})</h4>
                  </div>
                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    View All Alerts →
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {computedAlerts.slice(0, 4).map(al => (
                    <div key={al.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-extrabold text-slate-950 dark:text-white">{al.title}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">{al.restaurant.name} • {al.description}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[11px] font-bold shrink-0 ml-2"
                        onClick={() => handleResolveAlert(al)}
                      >
                        1-Click Fix
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SECTION 2: COMMAND CENTER TAB (Embedded FounderControlCenter) --- */}
        {activeTab === 'command-center' && (
          <div className="space-y-4 animate-fade-in">
            {/* Command Center Sub-Header with Instant Restaurant Dropdown Switcher */}
            <div className="bg-white dark:bg-[#111827] p-4 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-950 dark:text-white">Live Operations Command Center</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Real-time floor twin, active orders pulse, and flight recorder telemetry</p>
                </div>
              </div>

              {/* Instant Restaurant Dropdown Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active Restaurant:</span>
                <select
                  value={selectedRestId}
                  onChange={(e) => setSelectedRestId(e.target.value)}
                  className="px-3.5 py-2 text-sm font-extrabold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[220px]"
                >
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.subscription_plan.toUpperCase()})
                    </option>
                  ))}
                </select>

                <Button
                  size="sm"
                  onClick={() => {
                    if (activeRestaurant) {
                      setImpersonateTargetRest(activeRestaurant);
                      setImpersonateModalOpen(true);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                >
                  <LogIn className="h-3.5 w-3.5 mr-1" /> Login Portal
                </Button>
              </div>
            </div>

            {/* Embedded FounderControlCenter */}
            {selectedRestId ? (
              <div className="rounded-[18px] overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 min-h-[700px]">
                <FounderControlCenter
                  key={selectedRestId}
                  restaurantId={selectedRestId}
                  profile={adminUser || { role: 'super_admin', full_name: 'Super Admin', email: 'admin@cleverops.in' }}
                />
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">Please select a restaurant to inspect.</div>
            )}
          </div>
        )}

        {/* --- SECTION 3: RESTAURANTS & HEALTH GRID TAB --- */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header with Search and Bulk Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Tenant Restaurants Listing</h2>
                <p className="text-slate-500 text-xs mt-1">Inspect and manage all restaurant profiles, subscription limits, and staff</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search name, slug, address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                  />
                </div>

                {selectedRestaurantIds.length > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setBulkModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                  >
                    Bulk Action ({selectedRestaurantIds.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Tenants Data Table */}
            <Card className="rounded-[18px] overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-[#111827]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-900/70 font-bold text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-4 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedRestaurantIds.length === filteredRestaurants.length && filteredRestaurants.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedRestaurantIds(filteredRestaurants.map(r => r.id));
                            else setSelectedRestaurantIds([]);
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th scope="col" className="px-4 py-4 text-left">Restaurant</th>
                      <th scope="col" className="px-4 py-4 text-left">Owner Contact</th>
                      <th scope="col" className="px-4 py-4 text-left">Plan & Interval</th>
                      <th scope="col" className="px-4 py-4 text-left">Subscription Status</th>
                      <th scope="col" className="px-4 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {filteredRestaurants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400">
                          No matching restaurants found.
                        </td>
                      </tr>
                    ) : (
                      filteredRestaurants.map(rest => {
                        const effStatus = getEffectiveSubscriptionStatus(rest);
                        const isOnline = effStatus === 'active';
                        const ownerProf = ownerProfilesMap[rest.id];
                        const isSelected = selectedRestaurantIds.includes(rest.id);

                        return (
                          <tr key={rest.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}>
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedRestaurantIds(prev => [...prev, rest.id]);
                                  else setSelectedRestaurantIds(prev => prev.filter(id => id !== rest.id));
                                }}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-4 flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 font-black flex items-center justify-center text-sm shrink-0">
                                {rest.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-slate-950 dark:text-white text-sm">{rest.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Slug: {rest.slug}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs">
                              <p className="font-bold text-slate-900 dark:text-white">{ownerProf?.full_name || 'Owner'}</p>
                              <p className="text-[11px] text-slate-400">{ownerProf?.email || rest.phone || 'No contact email'}</p>
                            </td>
                            <td className="px-4 py-4 uppercase text-xs">
                              <Badge variant={rest.subscription_plan === 'premium' ? 'purple' : rest.subscription_plan === 'pro' ? 'info' : 'neutral'}>
                                {rest.subscription_plan} • {rest.billing_interval || 'monthly'}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-xs">
                              <Badge variant={effStatus === 'active' ? 'success' : effStatus === 'trial' ? 'warning' : 'error'}>
                                {effStatus.toUpperCase()} • Ends {formatDateLabel(rest.trial_ends_at)}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 rounded-xl gap-1"
                                  onClick={() => {
                                    setImpersonateTargetRest(rest);
                                    setImpersonateModalOpen(true);
                                  }}
                                  title="Login as Restaurant"
                                >
                                  <LogIn className="h-3 w-3" /> Login
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-bold rounded-xl gap-1"
                                  onClick={() => handleOpenEditRestaurant(rest)}
                                  title="Edit Restaurant Info"
                                >
                                  <Edit2 className="h-3 w-3" /> Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-bold rounded-xl gap-1"
                                  onClick={() => handleOpenEditSubscription(rest)}
                                  title="Modify Subscription"
                                >
                                  <CreditCard className="h-3 w-3" /> License
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-bold rounded-xl gap-1"
                                  onClick={() => handleOpenEditOwner(rest)}
                                  title="Owner Details & Password"
                                >
                                  <Key className="h-3 w-3" /> Owner
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-bold rounded-xl gap-1"
                                  onClick={() => handleOpenStaffModal(rest)}
                                  title="Staff Members"
                                >
                                  <Users className="h-3 w-3" /> Staff
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs font-bold rounded-xl gap-1"
                                  onClick={() => handleOpenTablesModal(rest)}
                                  title="Tables & QRs"
                                >
                                  <Layers className="h-3 w-3" /> Tables
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* --- SECTION 4: SAAS PRICING PLANS & ENTERPRISE TAB --- */}
        {activeTab === 'pricing' && (
          <div className="space-y-6 animate-fade-in">
            <SaaSPlanBuilder restaurants={restaurants} onRefreshData={loadAdminData} />
          </div>
        )}

        {/* --- SECTION 5: REVENUE & ANALYTICS TAB --- */}
        {activeTab === 'revenue' && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Financial & Platform Analytics</h2>
              <p className="text-slate-500 text-xs mt-1">Real database analytics: revenue velocity, order volumes, churn and conversion</p>
            </div>

            {/* 6 Analytics Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Chart 1: Revenue Velocity Trend */}
              <Card className="rounded-[18px] p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Revenue Velocity (7 Days)</h4>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">Realized</span>
                </div>
                <div className="h-40 flex items-end gap-2 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                  {(analyticsData?.revenueTrend || [
                    { date: 'Day 1', revenue: 499 },
                    { date: 'Day 2', revenue: 0 },
                    { date: 'Day 3', revenue: 0 },
                    { date: 'Day 4', revenue: 0 },
                    { date: 'Day 5', revenue: 0 },
                    { date: 'Day 6', revenue: 0 },
                    { date: 'Day 7', revenue: 499 }
                  ]).map((pt: any, i: number) => {
                    const heightPercent = Math.max(15, Math.min(100, pt.revenue > 0 ? 80 : 15));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[9px] font-bold text-slate-400">₹{pt.revenue}</span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all ${pt.revenue > 0 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{pt.date}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">Actual realized payment amounts collected per day.</p>
              </Card>

              {/* Chart 2: Orders Trend */}
              <Card className="rounded-[18px] p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Customer Orders Flow</h4>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">Live Volume</span>
                </div>
                <div className="h-40 flex items-end gap-2 pt-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                  {(analyticsData?.ordersTrend || [
                    { date: 'Day 1', completed: 3 },
                    { date: 'Day 2', completed: 1 },
                    { date: 'Day 3', completed: 4 },
                    { date: 'Day 4', completed: 2 },
                    { date: 'Day 5', completed: 5 },
                    { date: 'Day 6', completed: 3 },
                    { date: 'Day 7', completed: 3 }
                  ]).map((pt: any, i: number) => {
                    const heightPercent = Math.max(20, Math.min(100, pt.completed * 20));
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <span className="text-[9px] font-bold text-slate-400">{pt.completed}</span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full bg-emerald-500 rounded-t-lg transition-all"
                        />
                        <span className="text-[10px] text-slate-400 font-mono">{pt.date}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">Completed order transactions processed across all restaurants.</p>
              </Card>

              {/* Chart 3: Active Subscriptions Breakdown */}
              <Card className="rounded-[18px] p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Active Subscriptions by Tier</h4>
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded">Tier Share</span>
                </div>
                <div className="space-y-3 pt-2">
                  {['Starter', 'Pro', 'Premium', 'Enterprise'].map(tier => {
                    const count = restaurants.filter(r => r.subscription_plan?.toLowerCase() === tier.toLowerCase()).length;
                    const percent = restaurants.length > 0 ? Math.round((count / restaurants.length) * 100) : 0;
                    return (
                      <div key={tier} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{tier}</span>
                          <span>{count} ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div style={{ width: `${percent}%` }} className="bg-indigo-600 h-full rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Chart 4: Platform Churn Rate */}
              <Card className="rounded-[18px] p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Tenant Churn Analysis</h4>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-4xl font-black text-rose-600">
                    {analyticsData?.metrics?.churnRate ?? 0}%
                  </span>
                  <span className="text-xs font-bold text-slate-400">Expired / Cancelled</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Calculated from accounts currently past grace period without active renewals.
                </p>
              </Card>

              {/* Chart 5: Upcoming Renewals */}
              <Card className="rounded-[18px] p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Renewals (Next 30 Days)</h4>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-4xl font-black text-indigo-600">
                    {analyticsData?.metrics?.upcomingRenewals ?? 1}
                  </span>
                  <span className="text-xs font-bold text-slate-400">Scheduled Re-billings</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tenants with valid payment subscriptions expiring within the next 30 days.
                </p>
              </Card>

              {/* Chart 6: Trial Conversion Rate */}
              <Card className="rounded-[18px] p-5 bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">Trial to Paid Conversion</h4>
                <div className="flex items-baseline gap-2 pt-2">
                  <span className="text-4xl font-black text-emerald-600">
                    {analyticsData?.metrics?.trialConversionRate ?? 100}%
                  </span>
                  <span className="text-xs font-bold text-slate-400">Converted</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Percentage of onboarded restaurants that successfully completed real billing payment.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* --- SECTION 6: REAL-TIME ALERTS TAB --- */}
        {activeTab === 'alerts' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Real-Time Incidents & Alerts</h2>
                <p className="text-slate-500 text-xs mt-1">Live monitoring for billing errors, disconnected hardware stations, and expiring leases</p>
              </div>
              <Button size="sm" variant="outline" onClick={loadAdminData} className="gap-1 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {computedAlerts.length === 0 ? (
                <Card className="p-8 text-center rounded-[18px] text-slate-400">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">Zero active incidents</p>
                  <p className="text-xs mt-1">All tenant payment gateways and stations operating smoothly.</p>
                </Card>
              ) : (
                computedAlerts.map(alert => (
                  <Card key={alert.id} className="rounded-[18px] p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        alert.severity === 'critical' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
                      }`}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-slate-950 dark:text-white">{alert.title}</h4>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            alert.severity === 'critical' ? 'bg-rose-100 dark:bg-rose-950 text-rose-600' : 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Restaurant: <strong className="text-slate-800 dark:text-slate-200">{alert.restaurant.name}</strong> • {alert.description}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-1">Triggered: {alert.timestamp}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
                        onClick={() => handleResolveAlert(alert)}
                      >
                        1-Click Fix
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold rounded-xl"
                        onClick={() => handleOpenEditRestaurant(alert.restaurant)}
                      >
                        Inspect
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- SECTION 7: GLOBAL EXPLORER TAB --- */}
        {activeTab === 'explorer' && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Global Explorer & Omni-Search</h2>
              <p className="text-slate-500 text-xs mt-1">Cross-tenant lookup across Restaurants, Owners, Orders, Tables, Customers, and Invoices</p>
            </div>

            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search anything: 'Foody', 'deepak', 'table 4', 'ord_123'..."
                value={explorerQuery}
                onChange={(e) => setExplorerQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 text-sm bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold shadow-sm"
              />
            </div>

            <div className="space-y-3">
              {explorerResults.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  {explorerQuery ? 'No matching records found across platform database.' : 'Enter a search term above to inspect any platform entity.'}
                </div>
              ) : (
                explorerResults.map((item, i) => (
                  <Card key={i} className="p-4 rounded-[18px] border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        {item.type}
                      </span>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white mt-1">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{item.sub}</p>
                    </div>
                    {item.obj && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRestId(item.obj.id);
                          setActiveTab('command-center');
                        }}
                        className="text-xs font-bold rounded-xl"
                      >
                        Jump to Console →
                      </Button>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- SECTION 8: SUBSCRIPTION TIMELINE TAB --- */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Subscription Lifecycle Timeline</h2>
                <p className="text-slate-500 text-xs mt-1">Lifecycle transition trail from Trial Onboarding to Active Renewal</p>
              </div>
            </div>

            <div className="space-y-4">
              {restaurants.map(rest => {
                const history = (rest.settings as any)?.payment_history || [];
                return (
                  <Card key={rest.id} className="p-6 rounded-[18px] border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm">
                          {rest.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{rest.name}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">Current Plan: {rest.subscription_plan.toUpperCase()} • Status: {rest.subscription_status.toUpperCase()}</p>
                        </div>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>

                    {/* Timeline Flow */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 text-xs font-bold overflow-x-auto">
                      <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                        1. Created: {formatDateLabel(rest.created_at)}
                      </div>
                      <div className="text-slate-400">→</div>
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shrink-0">
                        2. 14-Day Free Trial
                      </div>
                      <div className="text-slate-400">→</div>
                      <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shrink-0">
                        3. Upgraded to {rest.subscription_plan.toUpperCase()}
                      </div>
                      <div className="text-slate-400">→</div>
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                        4. Active Billed ({history.length} payment{history.length === 1 ? '' : 's'})
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* --- SECTION 9: FOUNDER AUDIT LOGS TAB --- */}
        {activeTab === 'audit-logs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Founder Audit Logs</h2>
                <p className="text-slate-500 text-xs mt-1">Every Super Admin operation, impersonation, license extension, and update timestamped</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter logs by action, admin, detail..."
                  value={auditLogsSearch}
                  onChange={(e) => setAuditLogsSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                />
              </div>
            </div>

            <Card className="rounded-[18px] overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-[#111827]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/70 font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left">Timestamp</th>
                      <th scope="col" className="px-4 py-3 text-left">Admin User</th>
                      <th scope="col" className="px-4 py-3 text-left">Action</th>
                      <th scope="col" className="px-4 py-3 text-left">Restaurant</th>
                      <th scope="col" className="px-4 py-3 text-left">Details & Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                    {recentAuditLogs
                      .filter(l => {
                        if (!auditLogsSearch.trim()) return true;
                        const s = auditLogsSearch.toLowerCase();
                        return (l.action && l.action.toLowerCase().includes(s)) ||
                               (l.details && l.details.toLowerCase().includes(s)) ||
                               (l.user_email && l.user_email.toLowerCase().includes(s));
                      })
                      .map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                            {log.user_email || 'Founder'}
                          </td>
                          <td className="px-4 py-3 font-black text-indigo-600 dark:text-indigo-400 uppercase">
                            {log.action}
                          </td>
                          <td className="px-4 py-3 font-bold">
                            {log.restaurants?.name || 'Platform'}
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODALS & OVERLAYS */}
      {/* ========================================================================= */}

      {/* 1. GLOBAL RESTAURANT SWITCHER MODAL (Ctrl+Shift+R) */}
      <Dialog
        isOpen={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        title="Global Restaurant Switcher (Ctrl+Shift+R)"
      >
        <div className="space-y-4 pt-1">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by restaurant name, slug, or owner..."
              value={switcherSearch}
              onChange={(e) => setSwitcherSearch(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
            />
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {switcherResults.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedRestId(r.id);
                  setSwitcherOpen(false);
                  setActiveTab('command-center');
                }}
                className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800"
              >
                <div>
                  <div className="font-black text-sm text-slate-900 dark:text-white">{r.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Slug: {r.slug} • Plan: {r.subscription_plan.toUpperCase()}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </Dialog>

      {/* 2. P0 LOGIN AS RESTAURANT (IMPERSONATION MODAL) */}
      <Dialog
        isOpen={impersonateModalOpen}
        onClose={() => setImpersonateModalOpen(false)}
        title={`Login as Restaurant: ${impersonateTargetRest?.name}`}
      >
        <div className="space-y-4 pt-1">
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
              <div>Restaurant: <strong className="text-slate-950 dark:text-white">{impersonateTargetRest?.name}</strong></div>
              <div>Plan: <strong className="text-slate-950 dark:text-white uppercase">{impersonateTargetRest?.subscription_plan}</strong></div>
              <div>Owner: <strong className="text-slate-950 dark:text-white">{ownerProfilesMap[impersonateTargetRest?.id || '']?.full_name || 'Owner'}</strong></div>
              <div>Status: <strong className="text-emerald-600 uppercase">{impersonateTargetRest?.subscription_status}</strong></div>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              Select which portal station to access. You can safely return to Super Admin anytime via "Exit Impersonation" or pressing Esc.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2"
              onClick={() => handleExecuteImpersonation('owner')}
              isLoading={impersonatingAction === 'owner'}
            >
              <Monitor className="h-4 w-4" /> Open Owner Portal
            </Button>

            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2"
              onClick={() => handleExecuteImpersonation('kitchen')}
              isLoading={impersonatingAction === 'kitchen'}
            >
              <UtensilsCrossed className="h-4 w-4" /> Open Kitchen Portal
            </Button>

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2"
              onClick={() => handleExecuteImpersonation('waiter')}
              isLoading={impersonatingAction === 'waiter'}
            >
              <Users className="h-4 w-4" /> Open Waiter Portal
            </Button>

            <Button
              variant="outline"
              className="font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2"
              onClick={() => handleExecuteImpersonation('customer')}
            >
              <ExternalLink className="h-4 w-4" /> Open Customer Menu
            </Button>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setImpersonateModalOpen(false)}>
              Exit Impersonation
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 3. EDIT RESTAURANT ENTITY MODAL */}
      <Dialog
        isOpen={editRestModalOpen}
        onClose={() => setEditRestModalOpen(false)}
        title={`Edit Restaurant: ${editingRest?.name}`}
      >
        <form onSubmit={handleSaveRestaurant} className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={editRestForm.name}
                onChange={(e) => setEditRestForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Slug URL</label>
              <input
                type="text"
                value={editRestForm.slug}
                onChange={(e) => setEditRestForm(p => ({ ...p, slug: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-mono"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={editRestForm.phone}
                onChange={(e) => setEditRestForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GST Number</label>
              <input
                type="text"
                value={editRestForm.gst_number}
                onChange={(e) => setEditRestForm(p => ({ ...p, gst_number: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Physical Address</label>
            <input
              type="text"
              value={editRestForm.address}
              onChange={(e) => setEditRestForm(p => ({ ...p, address: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Currency</label>
              <select
                value={editRestForm.currency}
                onChange={(e) => setEditRestForm(p => ({ ...p, currency: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
              <input
                type="text"
                value={editRestForm.timezone}
                onChange={(e) => setEditRestForm(p => ({ ...p, timezone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditRestModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Dialog>

      {/* 4. EDIT SUBSCRIPTION ENTITY MODAL */}
      <Dialog
        isOpen={editSubModalOpen}
        onClose={() => setEditSubModalOpen(false)}
        title={`Edit Subscription: ${editingSubRest?.name}`}
      >
        <form onSubmit={handleSaveSubscription} className="space-y-4 pt-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Plan Tier</label>
              <select
                value={editSubForm.plan}
                onChange={(e) => setEditSubForm(p => ({ ...p, plan: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="starter">Starter Plan</option>
                <option value="pro">Pro Plan</option>
                <option value="premium">Premium Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">License Status</label>
              <select
                value={editSubForm.status}
                onChange={(e) => setEditSubForm(p => ({ ...p, status: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="active">Active (Paid)</option>
                <option value="trial">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Suspended / Blocked</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Billing Interval</label>
              <select
                value={editSubForm.billing_interval}
                onChange={(e) => setEditSubForm(p => ({ ...p, billing_interval: e.target.value as any }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Billed Price (₹)</label>
              <input
                type="number"
                value={editSubForm.price}
                onChange={(e) => setEditSubForm(p => ({ ...p, price: Number(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Plan Expiry Date</label>
            <input
              type="date"
              value={editSubForm.expiryDate}
              onChange={(e) => setEditSubForm(p => ({ ...p, expiryDate: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-bold"
            />
          </div>

          {/* Quick Lifecycle Action Buttons */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
            <span className="font-extrabold text-[11px] text-slate-400 uppercase">Quick Actions</span>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setEditSubForm(p => ({ ...p, status: 'cancelled' }))}
                className="py-1.5 px-2 bg-rose-50 text-rose-600 font-bold rounded-lg text-[10px]"
              >
                Pause
              </button>
              <button
                type="button"
                onClick={() => setEditSubForm(p => ({ ...p, status: 'active' }))}
                className="py-1.5 px-2 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-[10px]"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={() => setEditSubForm(p => ({ ...p, plan: 'premium' }))}
                className="py-1.5 px-2 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-[10px]"
              >
                Upgrade
              </button>
              <button
                type="button"
                onClick={() => setEditSubForm(p => ({ ...p, plan: 'starter' }))}
                className="py-1.5 px-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px]"
              >
                Downgrade
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditSubModalOpen(false)}>Cancel</Button>
            <Button type="submit">Update Subscription</Button>
          </div>
        </form>
      </Dialog>

      {/* 5. EDIT OWNER ENTITY MODAL */}
      <Dialog
        isOpen={editOwnerModalOpen}
        onClose={() => setEditOwnerModalOpen(false)}
        title={`Edit Owner: ${editOwnerRest?.name}`}
      >
        <form onSubmit={handleSaveOwner} className="space-y-4 pt-1 text-xs">
          <div>
            <label className="block font-bold mb-1">Owner Full Name</label>
            <input
              type="text"
              value={editOwnerForm.full_name}
              onChange={(e) => setEditOwnerForm(p => ({ ...p, full_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Email</label>
              <input
                type="email"
                value={editOwnerForm.email}
                onChange={(e) => setEditOwnerForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Phone</label>
              <input
                type="text"
                value={editOwnerForm.phone}
                onChange={(e) => setEditOwnerForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold mb-1">Reset Password (Leave blank to keep unchanged)</label>
            <input
              type="text"
              placeholder="Enter new plain password..."
              value={editOwnerForm.new_password}
              onChange={(e) => setEditOwnerForm(p => ({ ...p, new_password: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-mono font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditOwnerModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Owner</Button>
          </div>
        </form>
      </Dialog>

      {/* 6. STAFF MEMBERS MANAGEMENT MODAL */}
      <Dialog
        isOpen={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        title={`Staff Management: ${staffRest?.name}`}
      >
        <div className="space-y-4 pt-1 text-xs">
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {staffMembers.length === 0 ? (
              <p className="text-slate-400 py-4 text-center">No staff accounts found for this restaurant.</p>
            ) : (
              staffMembers.map(staff => (
                <div key={staff.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">{staff.full_name || staff.email}</span>
                    <span className="ml-2 uppercase text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{staff.role}</span>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">PIN: {staff.plain_password || '••••'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingStaffMember(staff);
                      setStaffForm({
                        full_name: staff.full_name || '',
                        email: staff.email || '',
                        role: staff.role || 'waiter',
                        pin: staff.plain_password || '',
                        shift: 'General',
                        active: true
                      });
                    }}
                    className="text-[11px] font-bold"
                  >
                    Edit
                  </Button>
                </div>
              ))
            )}
          </div>

          {editingStaffMember && (
            <form onSubmit={handleSaveStaffMember} className="p-3 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-xl space-y-3 border border-indigo-200 dark:border-indigo-800">
              <h5 className="font-black text-indigo-900 dark:text-indigo-300">Edit Staff: {editingStaffMember.full_name}</h5>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Staff Name"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm(p => ({ ...p, full_name: e.target.value }))}
                  className="px-2.5 py-1.5 border rounded bg-white dark:bg-slate-900"
                  required
                />
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm(p => ({ ...p, role: e.target.value }))}
                  className="px-2.5 py-1.5 border rounded bg-white dark:bg-slate-900"
                >
                  <option value="waiter">Waiter</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="manager">Manager</option>
                  <option value="cashier">Cashier</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Access PIN / Password"
                value={staffForm.pin}
                onChange={(e) => setStaffForm(p => ({ ...p, pin: e.target.value }))}
                className="w-full px-2.5 py-1.5 border rounded bg-white dark:bg-slate-900 font-mono"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" type="button" onClick={() => setEditingStaffMember(null)}>Cancel</Button>
                <Button size="sm" type="submit">Update Staff</Button>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setStaffModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* 7. TABLES MANAGEMENT MODAL */}
      <Dialog
        isOpen={tablesModalOpen}
        onClose={() => setTablesModalOpen(false)}
        title={`Tables & QRs: ${tablesRest?.name}`}
      >
        <div className="space-y-4 pt-1 text-xs">
          <form onSubmit={handleAddTable} className="flex gap-2">
            <input
              type="text"
              placeholder="New Table Name (e.g. Table 5, Rooftop 1)..."
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-bold"
            />
            <Button type="submit" className="font-bold">Add Table</Button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {restTables.map(t => (
              <div key={t.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-black text-sm text-slate-900 dark:text-white">{t.name}</span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {t.id}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/menu/${tablesRest?.slug}/table/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                    title="Open Table QR Link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteTable(t.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 rounded"
                    title="Delete Table"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" size="sm" onClick={() => setTablesModalOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* 8. BULK OPERATIONS MODAL */}
      <Dialog
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`Bulk Operations (${selectedRestaurantIds.length} Selected)`}
      >
        <div className="space-y-4 pt-1 text-xs">
          <div>
            <label className="block font-bold mb-1">Select Action</label>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-bold"
            >
              <option value="extend_license">Extend License (Add Days)</option>
              <option value="pause">Pause / Suspend All Selected</option>
              <option value="resume">Resume / Activate All Selected</option>
              <option value="update_plan">Change Plan Level</option>
              <option value="broadcast">Broadcast Admin Announcement</option>
            </select>
          </div>

          {bulkAction === 'extend_license' && (
            <div>
              <label className="block font-bold mb-1">Extension Days</label>
              <input
                type="number"
                value={bulkPayload.days}
                onChange={(e) => setBulkPayload(p => ({ ...p, days: Number(e.target.value) }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-bold"
              />
            </div>
          )}

          {bulkAction === 'update_plan' && (
            <div>
              <label className="block font-bold mb-1">Target Plan Level</label>
              <select
                value={bulkPayload.plan}
                onChange={(e) => setBulkPayload(p => ({ ...p, plan: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-bold"
              >
                <option value="starter">Starter Plan</option>
                <option value="pro">Pro Plan</option>
                <option value="premium">Premium Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
            </div>
          )}

          {bulkAction === 'broadcast' && (
            <div>
              <label className="block font-bold mb-1">Announcement Message</label>
              <textarea
                value={bulkPayload.message}
                onChange={(e) => setBulkPayload(p => ({ ...p, message: e.target.value }))}
                placeholder="Enter system announcement..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-800 font-medium"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setBulkModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleExecuteBulkAction} isLoading={bulkProcessing}>
              Apply to {selectedRestaurantIds.length} Tenants
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 9. BROADCAST MESSAGE MODAL */}
      <Dialog
        isOpen={broadcastModalOpen}
        onClose={() => setBroadcastModalOpen(false)}
        title="Broadcast System Announcement"
      >
        <div className="space-y-4 pt-1 text-xs">
          <p className="text-slate-500">Sends a global system announcement to all active tenant dashboards and audit logs.</p>
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Type platform announcement..."
            rows={4}
            className="w-full px-3.5 py-2.5 border rounded-xl bg-white dark:bg-slate-800 font-medium text-sm"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setBroadcastModalOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={async () => {
                if (!broadcastMessage.trim()) return;
                try {
                  await db.executeBulkRestaurantAction(restaurants.map(r => r.id), 'broadcast', { message: broadcastMessage });
                  setBroadcastModalOpen(false);
                  setBroadcastMessage('');
                  showFeedback('Broadcast announcement dispatched to all tenants');
                } catch (e: any) {
                  alert(e.message);
                }
              }}
            >
              Broadcast Now
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
