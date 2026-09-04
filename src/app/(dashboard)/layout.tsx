'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getActiveUser, supabase, clearActiveUserCache } from '@/lib/supabase';
import { db, Profile, Restaurant, isSubscriptionExpired } from '@/lib/db';
import { DEFAULT_PLAN_SPECS, parsePlanSpec, PlanEntitlementSpec } from '@/lib/entitlements';
import LockedFeatureView from '@/components/shared/LockedFeatureView';
import MockBanner from '@/components/shared/MockBanner';
import buildInfo from '@/lib/build-info.json';

import { 
  UtensilsCrossed, LayoutDashboard, Menu as MenuIcon, 
  QrCode, ClipboardList, ChefHat, BarChart3, CreditCard, 
  LogOut, MenuSquare, X, ChevronRight, User, Settings,
  ShieldAlert, Sparkles, AlertTriangle, Tag, Boxes, Lock
} from 'lucide-react';

// Central Route to Entitlement Feature Key Mapping
const ROUTE_FEATURE_KEYS: Record<string, { key: string; name: string; desc: string }> = {
  '/dashboard/ai-menu': { key: 'ai_menu', name: 'Smart Menu by CleverOps', desc: 'AI Menu Analysis & OCR is not available on your current plan.' },
  '/dashboard/offers': { key: 'manual_discount', name: 'Offers & Discounts', desc: 'Offers & Custom Discounts are not available on your current plan.' },
  '/dashboard/inventory': { key: 'inventory', name: 'Inventory & Recipes', desc: 'Inventory Management & Recipe Costing is not available on your current plan.' },
  '/dashboard/tables': { key: 'table_management', name: 'Tables & QRs', desc: 'Table Management & Floor Layout is not available on your current plan.' },
  '/dashboard/kds': { key: 'kds', name: 'Kitchen Display System', desc: 'Kitchen Display System (KDS) is not available on your current plan.' },
  '/dashboard/orders': { key: 'ordering', name: 'Live Orders', desc: 'Dine-In & QR Ordering is not available on your current plan.' },
  '/dashboard/reports': { key: 'advanced_analytics', name: 'Reports & Analytics', desc: 'Advanced Sales Analytics & Financial Reports are not available on your current plan.' },
  '/dashboard/staff-tasks': { key: 'staff_tasks', name: 'Staff Tasks', desc: 'Staff Tasks & Photo Proof Workflows are not available on your current plan.' }
};

// Create Restaurant Context
export const RestaurantContext = createContext<{
  restaurant: Restaurant | null;
  profile: Profile | null;
  activeRole: Profile['role'];
  dbRole: Profile['role'];
  planSpec: PlanEntitlementSpec;
  refresh: () => Promise<void>;
  alarmMuted: boolean;
  setAlarmMuted: (muted: boolean) => void;
} | null>(null);

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantContext Provider');
  return context;
}

const ALLOWED_PATHS: Record<string, string[]> = {
  owner: ['/dashboard', '/dashboard/menu', '/dashboard/ai-menu', '/dashboard/offers', '/dashboard/tables', '/dashboard/kds', '/dashboard/orders', '/dashboard/reports', '/dashboard/billing', '/dashboard/settings', '/dashboard/inventory'],
  manager: ['/dashboard', '/dashboard/menu', '/dashboard/ai-menu', '/dashboard/offers', '/dashboard/tables', '/dashboard/kds', '/dashboard/orders', '/dashboard/reports', '/dashboard/settings', '/dashboard/inventory'],
  supervisor: ['/dashboard/orders', '/dashboard/tables', '/dashboard/kds', '/dashboard/inventory', '/dashboard/reports', '/dashboard/menu'],
  waiter: ['/dashboard/orders', '/dashboard/tables'],
  kitchen: ['/dashboard/kds', '/dashboard/inventory', '/dashboard/menu'],
  cashier: ['/dashboard/orders', '/dashboard/tables']
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState(false);

  // Separate Portals Role View
  const [dbRole, setDbRole] = useState<Profile['role']>('owner');
  const [activeRole, setActiveRole] = useState<Profile['role']>('owner');

  // Plan Entitlement Specification State
  const [planSpec, setPlanSpec] = useState<PlanEntitlementSpec>(DEFAULT_PLAN_SPECS.starter);

  const [isImpersonating, setIsImpersonating] = useState(false);

  const fetchPlanSpec = async (planId: string) => {
    try {
      const pId = (planId || 'starter').toLowerCase();
      const { data: row } = await supabase.from('pricing_plans').select('*').eq('id', pId).maybeSingle();
      const spec = parsePlanSpec(row || { id: pId });
      setPlanSpec(spec);
    } catch (e) {
      setPlanSpec(DEFAULT_PLAN_SPECS.starter);
    }
  };

  const checkAuth = async () => {
    // Check if in Super Admin impersonation mode
    if (typeof window !== 'undefined') {
      const impersonated = sessionStorage.getItem('smartdine_impersonated_profile');
      if (impersonated) {
        try {
          const impProf = JSON.parse(impersonated);
          setIsImpersonating(true);
          setProfile(impProf);
          setDbRole(impProf.role || 'owner');
          setActiveRole(impProf.role || 'owner');

          if (impProf.restaurant_id) {
            const rest = await db.getRestaurantById(impProf.restaurant_id);
            if (rest) {
              setRestaurant(rest);
              await fetchPlanSpec(rest.subscription_plan || 'starter');
            }
          }
          setLoading(false);
          return;
        } catch (e) {}
      }
    }

    const user = await getActiveUser();
    if (!user) {
      const redirectUrl = pathname && pathname.startsWith('/dashboard') ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.push(redirectUrl);
      return;
    }
    if (user.role === 'super_admin') {
      router.push('/super-admin');
      return;
    }
    setProfile(user);
    setDbRole(user.role);
    setActiveRole(user.role);

    // Parallel fetch restaurant and plan spec
    if (user.restaurant_id) {
      try {
        const rest = await db.getRestaurantById(user.restaurant_id);
        if (rest) {
          setRestaurant(rest);
          await fetchPlanSpec(rest.subscription_plan || 'starter');
        }
      } catch (e) {
        console.warn('DashboardLayout restaurant load notice:', e);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    checkAuth();

    // Safe storage listener (prevent cross-tab hijacking)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'smartdine_auth_token_v2' || e.key === 'smartdine_impersonated_profile') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  // Realtime Supabase Subscription for Restaurant License/Plan updates
  useEffect(() => {
    if (!profile?.restaurant_id) return;

    const channel = supabase
      .channel(`db_layout_restaurant_${profile.restaurant_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurants',
          filter: `id=eq.${profile.restaurant_id}`
        },
        async (payload) => {
          const updatedRest = payload.new as Restaurant;
          setRestaurant(updatedRest);
          if (updatedRest.subscription_plan) {
            await fetchPlanSpec(updatedRest.subscription_plan);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.restaurant_id]);

  // Realtime Supabase Subscription for Super Admin Pricing Plans updates
  useEffect(() => {
    const channel = supabase
      .channel('realtime_pricing_plans_dashboard_layout')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pricing_plans' },
        async () => {
          if (restaurant?.subscription_plan) {
            await fetchPlanSpec(restaurant.subscription_plan);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.subscription_plan]);

  // ==========================================
  // GLOBAL NOTIFICATION & ALARM SYSTEM
  // ==========================================
  const localOrderIdsRef = useRef<Set<string>>(new Set());

  const stopGlobalAlarm = () => {
    // Web app order bells removed per product specification
  };

  const checkActiveAlarmsGlobal = async (restId: string, role: string) => {
    try {
      const allOrders = await db.getOrders(restId);
      localOrderIdsRef.current = new Set(allOrders.map(o => o.id));
    } catch (e) {
      console.warn('Error checking global order IDs:', e);
    }
  };

  // Background state recovery
  useEffect(() => {
    const handleActive = () => {
      if (document.visibilityState === 'visible') {
        window.dispatchEvent(new Event('force-resync'));
        if (restaurant?.id) {
          checkActiveAlarmsGlobal(restaurant.id, activeRole);
        }
      }
    };
    
    window.addEventListener('visibilitychange', handleActive);
    window.addEventListener('focus', handleActive);
    window.addEventListener('online', handleActive);
    
    return () => {
      window.removeEventListener('visibilitychange', handleActive);
      window.removeEventListener('focus', handleActive);
      window.removeEventListener('online', handleActive);
    };
  }, [restaurant?.id, activeRole]);

  // Global Audio stop listeners triggered by actions
  useEffect(() => {
    const handleStopSound = () => stopGlobalAlarm();
    window.addEventListener('stop-kitchen-sound', handleStopSound);
    window.addEventListener('stop-waiter-sound', handleStopSound);
    return () => {
      window.removeEventListener('stop-kitchen-sound', handleStopSound);
      window.removeEventListener('stop-waiter-sound', handleStopSound);
    };
  }, []);

  // Global Realtime Alarm Listener
  useEffect(() => {
    if (!restaurant?.id) return;
    const restId = restaurant.id;

    checkActiveAlarmsGlobal(restId, activeRole);

    const channel = supabase
      .channel(`global_notifications_${restId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restId}` },
        async () => {
          await checkActiveAlarmsGlobal(restId, activeRole);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_requests', filter: `restaurant_id=eq.${restId}` },
        async () => {
          await checkActiveAlarmsGlobal(restId, activeRole);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_batches' },
        async (payload) => {
          const batch = payload.new as any;
          if (batch && (localOrderIdsRef.current.has(batch.order_id) || localOrderIdsRef.current.size === 0)) {
            await checkActiveAlarmsGlobal(restId, activeRole);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopGlobalAlarm();
    };
  }, [restaurant?.id, activeRole]);

  // Full RBAC navigation guard enforcing ALLOWED_PATHS[dbRole]
  useEffect(() => {
    if (!loading && profile) {
      const allowedPaths = ALLOWED_PATHS[dbRole] || ALLOWED_PATHS['owner'] || [];
      const isAllowed = pathname === '/dashboard' || allowedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`));
      if (!isAllowed) {
        const defaultRoute = dbRole === 'kitchen' ? '/dashboard/kds' : (dbRole === 'waiter' || dbRole === 'cashier') ? '/dashboard/orders' : '/dashboard';
        window.location.assign(defaultRoute);
      }
    }
  }, [loading, profile, dbRole, pathname]);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smartdine_impersonated_profile');
    }
    clearActiveUserCache();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleExitImpersonation = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smartdine_impersonated_profile');
    }
    clearActiveUserCache();
    router.push('/super-admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading CleverOps...</p>
        </div>
      </div>
    );
  }

  // Check path permissions based on actual database role
  const isPathAllowed = () => {
    const roleAllowedPaths = ALLOWED_PATHS[dbRole] || [];
    if (pathname === '/dashboard') return true;
    return roleAllowedPaths.some(p => pathname.startsWith(p));
  };

  const allowed = isPathAllowed();

  // Check if current route is feature-locked by Super Admin plan specs
  const matchingRouteKey = Object.keys(ROUTE_FEATURE_KEYS).find(k => pathname === k || pathname.startsWith(`${k}/`));
  const routeLockInfo = matchingRouteKey ? ROUTE_FEATURE_KEYS[matchingRouteKey] : undefined;
  const isCurrentRouteLocked = Boolean(routeLockInfo && planSpec.features[routeLockInfo.key] === false);

  // Define sidebar menu items based on ACTIVE portal view (activeRole)
  const allMenuItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager'] },
    { name: 'Menu Management', href: '/dashboard/menu', icon: MenuSquare, roles: ['owner', 'manager', 'kitchen', 'supervisor'] },
    { name: 'Smart Menu by CleverOps', href: '/dashboard/ai-menu', icon: Sparkles, roles: ['owner', 'manager'] },
    { name: 'Offers & Discounts', href: '/dashboard/offers', icon: Tag, roles: ['owner', 'manager'] },
    { name: 'Inventory & Recipes', href: '/dashboard/inventory', icon: Boxes, roles: ['owner', 'manager', 'supervisor'] },
    { name: 'Tables & QRs', href: '/dashboard/tables', icon: QrCode, roles: ['owner', 'manager', 'supervisor', 'waiter', 'cashier'] },
    { name: 'Kitchen Display', href: '/dashboard/kds', icon: ChefHat, roles: ['owner', 'manager', 'supervisor', 'kitchen'] },
    { name: 'Live Orders', href: '/dashboard/orders', icon: ClipboardList, roles: ['owner', 'manager', 'supervisor', 'waiter', 'cashier', 'kitchen'] },
    { name: 'Reports & Analytics', href: '/dashboard/reports', icon: BarChart3, roles: ['owner', 'manager', 'supervisor'] },
    { name: 'Billing & SaaS', href: '/dashboard/billing', icon: CreditCard, roles: ['owner'] },
    { name: 'Settings & Staff', href: '/dashboard/settings', icon: Settings, roles: ['owner', 'manager'] }
  ];

  const filteredMenuItems = allMenuItems.filter(item => {
    if (!item.roles.includes(activeRole)) return false;
    if (activeRole === 'supervisor') {
      const dept = (profile?.department || '').toLowerCase();
      if (dept === 'kitchen' && (item.href === '/dashboard/orders' || item.href === '/dashboard/tables')) return false;
      if (dept === 'waiter' && (item.href === '/dashboard/kds' || item.href === '/dashboard/inventory' || item.href === '/dashboard/menu')) return false;
    }
    return true;
  });

  const isExpired = restaurant ? isSubscriptionExpired(restaurant) : false;

  return (
    <RestaurantContext.Provider value={{ restaurant, profile, activeRole, dbRole, planSpec, refresh: checkAuth, alarmMuted, setAlarmMuted }}>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <MockBanner />

        {isImpersonating && (
          <div className="bg-indigo-600 text-white px-4 py-2 text-xs md:text-sm font-bold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md z-50 animate-fade-in">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>SUPER ADMIN IMPERSONATION ACTIVE — Viewing as {restaurant?.name} ({profile?.full_name})</span>
            </div>
            <button
              onClick={handleExitImpersonation}
              className="bg-white text-indigo-700 hover:bg-slate-100 px-3.5 py-1 rounded-lg font-black text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer hover:scale-105"
            >
              Exit Impersonation →
            </button>
          </div>
        )}

        {isExpired && !isImpersonating && (
          <div className="bg-rose-600 text-white px-4 py-2.5 text-xs md:text-sm font-bold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md z-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 animate-pulse" />
              <span>SUBSCRIPTION EXPIRED / PAYMENT PENDING — Live QR Ordering is currently locked for your customers.</span>
            </div>
            <Link href="/dashboard/billing">
              <button className="bg-white text-rose-700 hover:bg-slate-100 px-3.5 py-1 rounded-lg font-black text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer hover:scale-105">
                Pay & Activate Now →
              </button>
            </Link>
          </div>
        )}

        <div className="flex flex-1 relative overflow-hidden">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl text-white flex flex-col transform transition-transform duration-300 ease-in-out shrink-0 border-r border-slate-800/80 shadow-2xl shadow-slate-950/50
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            {/* Logo Section */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3">
                <img src="/logo.png" alt="CleverOps Logo" className="h-8 w-8 object-contain" />
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">CleverOps</span>
              </Link>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Portal Switcher for Owners / Managers */}
            {(dbRole === 'owner' || dbRole === 'manager') && (
              <div className="px-4 pt-4 pb-2 border-b border-slate-800 bg-slate-950/20">
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Active Portal View
                </label>
                <select
                  value={activeRole}
                  onChange={(e) => {
                    const newRole = e.target.value as any;
                    setActiveRole(newRole);
                    const target = newRole === 'kitchen' ? '/dashboard/kds' : newRole === 'waiter' ? '/dashboard/orders' : '/dashboard';
                    window.location.assign(target);
                  }}
                  className="block w-full px-2.5 py-1.5 text-xs text-slate-200 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
                >
                  <option value="owner">Owner Portal</option>
                  <option value="waiter">Waiter Portal</option>
                  <option value="kitchen">Kitchen Portal</option>
                </select>
              </div>
            )}

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {filteredMenuItems.map((item) => {
                const isActive = pathname === item.href;
                const itemLockInfo = ROUTE_FEATURE_KEYS[item.href];
                const isLocked = Boolean(itemLockInfo && planSpec.features[itemLockInfo.key] === false);

                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={(e) => {
                      if (sidebarOpen) setSidebarOpen(false);
                      if (pathname === item.href) {
                        e.preventDefault();
                      }
                    }}
                    className={`
                      flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
                      ${isActive 
                        ? 'bg-emerald-600 text-white shadow-xs font-semibold' 
                        : isLocked
                        ? 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'}
                    `}
                  >
                    <div className="flex items-center min-w-0">
                      <item.icon className={`h-4 w-4 mr-2.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {isLocked && (
                      <Lock className="h-3.5 w-3.5 text-amber-400/90 shrink-0 ml-1.5" />
                    )}
                  </a>
                );
              })}
            </nav>

            {/* User Section / Logout */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/40">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-slate-200">{profile?.full_name}</p>
                  <p className="text-[10px] text-slate-400 truncate capitalize">
                    {dbRole} {activeRole !== dbRole && `(as ${activeRole})`} • {restaurant?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign Out
              </button>
              <div className="mt-4 pt-2 border-t border-slate-800/60 text-center">
                <Link href="/debug/build-info" className="inline-flex flex-col items-center text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer font-mono gap-0.5">
                  <span>Build: {buildInfo.commit.slice(0, 7)}</span>
                  <span>{new Date(buildInfo.buildTime).toLocaleDateString()} {new Date(buildInfo.buildTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Dashboard Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30 transition-colors">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Open sidebar"
                >
                  <MenuIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-3">
                  {restaurant?.logo_url ? (
                    <img 
                      src={restaurant.logo_url} 
                      alt={restaurant.name} 
                      className="h-8 w-8 rounded-lg object-cover border border-slate-100 dark:border-slate-800" 
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      {restaurant?.name?.charAt(0) || 'R'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-sm font-semibold text-slate-950 dark:text-white leading-none">{restaurant?.name}</h1>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live QR Ordering Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {restaurant?.subscription_plan && (
                  <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-wider">
                    {planSpec.name} Plan
                  </span>
                )}
                {restaurant && (
                  <Link 
                    href={`/menu/${restaurant.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                  >
                    View Digital Menu
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </header>

            {/* Dashboard Content Container */}
            <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
              {!allowed ? (
                <div className="min-h-[50vh] flex items-center justify-center p-6">
                  <div className="max-w-md text-center space-y-4">
                    <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30 shadow-md">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Permission Denied</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                      Your current account role (<strong>{dbRole.toUpperCase()}</strong>) does not have permission to access the path <code>{pathname}</code>. Please contact your administrator.
                    </p>
                    <div className="pt-4">
                      <Link href={dbRole === 'kitchen' ? '/dashboard/kds' : '/dashboard/orders'}>
                        <button className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all">
                          Return to Portal
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : isCurrentRouteLocked && routeLockInfo ? (
                <LockedFeatureView
                  featureName={routeLockInfo.name}
                  featureDescription={routeLockInfo.desc}
                  planName={planSpec.name}
                />
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </div>
    </RestaurantContext.Provider>
  );
}
