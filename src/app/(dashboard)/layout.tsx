'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getActiveUser, supabase, clearActiveUserCache, signOutUser } from '@/lib/supabase';
import { db, Profile, Restaurant, isSubscriptionExpired } from '@/lib/db';
import { DEFAULT_PLAN_SPECS, parsePlanSpec, PlanEntitlementSpec, getCachedPlanSpec } from '@/lib/entitlements';
import LockedFeatureView from '@/components/shared/LockedFeatureView';
import TrialCountdownBanner from '@/components/dashboard/TrialCountdownBanner';
import MockBanner from '@/components/shared/MockBanner';
import { dashboardStore } from '@/lib/dashboardStore';
import { PreviewModeProvider } from '@/context/PreviewModeContext';

import { 
  UtensilsCrossed, LayoutDashboard, Menu as MenuIcon, 
  QrCode, ClipboardList, ChefHat, BarChart3, CreditCard, 
  LogOut, MenuSquare, X, ChevronRight, User, Settings,
  ShieldAlert, Sparkles, AlertTriangle, Tag, Boxes, Lock, Users,
  Bell, BellOff, UserCheck, Banknote, Search, ArrowRight
} from 'lucide-react';
import GlobalCommandPalette from '@/components/dashboard/GlobalCommandPalette';
import { setGlobalMute, stopLoudBell, isGloballyMuted, playLoudBell } from '@/lib/soundAlert';
import { registerDeviceActivity, getOrCreateDeviceId } from '@/lib/sessionManager';

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
  owner: ['/dashboard', '/dashboard/menu', '/dashboard/ai-menu', '/dashboard/offers', '/dashboard/tables', '/dashboard/kds', '/dashboard/orders', '/dashboard/reports', '/dashboard/billing', '/dashboard/settings', '/dashboard/inventory', '/dashboard/staff', '/dashboard/attendance', '/dashboard/attendance/punch', '/dashboard/founder', '/dashboard/founder/control-center', '/dashboard/cash-closing'],
  manager: ['/dashboard', '/dashboard/menu', '/dashboard/ai-menu', '/dashboard/offers', '/dashboard/tables', '/dashboard/orders', '/dashboard/reports', '/dashboard/billing', '/dashboard/settings', '/dashboard/inventory', '/dashboard/staff', '/dashboard/attendance', '/dashboard/attendance/punch', '/dashboard/founder', '/dashboard/founder/control-center', '/dashboard/cash-closing'],
  supervisor: ['/dashboard', '/dashboard/orders', '/dashboard/tables', '/dashboard/inventory', '/dashboard/reports', '/dashboard/menu', '/dashboard/attendance', '/dashboard/attendance/punch', '/dashboard/cash-closing'],
  head_chef: ['/dashboard/kds', '/dashboard/inventory', '/dashboard/menu', '/dashboard/attendance', '/dashboard/attendance/punch'],
  chef: ['/dashboard/kds', '/dashboard/inventory', '/dashboard/menu', '/dashboard/attendance', '/dashboard/attendance/punch'],
  kitchen: ['/dashboard/kds', '/dashboard/inventory', '/dashboard/menu', '/dashboard/attendance', '/dashboard/attendance/punch'],
  kitchen_helper: ['/dashboard/kds', '/dashboard/attendance', '/dashboard/attendance/punch'],
  captain: ['/dashboard/orders', '/dashboard/tables', '/dashboard/menu', '/dashboard/attendance', '/dashboard/attendance/punch'],
  waiter: ['/dashboard/orders', '/dashboard/tables', '/dashboard/attendance', '/dashboard/attendance/punch'],
  cashier: ['/dashboard/orders', '/dashboard/tables', '/dashboard/reports', '/dashboard/attendance', '/dashboard/attendance/punch', '/dashboard/cash-closing'],
  cleaner: ['/dashboard/attendance', '/dashboard/attendance/punch'],
  helper: ['/dashboard/attendance', '/dashboard/attendance/punch'],
  staff: ['/dashboard/attendance', '/dashboard/attendance/punch']
};

const ALL_MENU_ITEMS = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['owner', 'manager', 'supervisor'] },
  { name: 'Live Orders', href: '/dashboard/orders', icon: ClipboardList, roles: ['owner', 'manager', 'supervisor', 'captain', 'waiter', 'cashier'] },
  { name: 'Cash Register', href: '/dashboard/cash-closing', icon: Banknote, roles: ['owner', 'manager', 'supervisor', 'cashier'] },
  { name: 'Kitchen KDS', href: '/dashboard/kds', icon: ChefHat, roles: ['head_chef', 'chef', 'kitchen', 'kitchen_helper'] },
  { name: 'Tables', href: '/dashboard/tables', icon: QrCode, roles: ['owner', 'manager', 'supervisor', 'captain', 'waiter', 'cashier'] },
  { name: 'Smart Menu by Clever Ops', href: '/dashboard/menu', icon: Sparkles, roles: ['owner', 'manager', 'head_chef', 'chef', 'kitchen', 'supervisor', 'captain'] },
  { name: 'Offers & Discounts', href: '/dashboard/offers', icon: Tag, roles: ['owner', 'manager'] },
  { name: 'Attendance & Shifts', href: '/dashboard/attendance', icon: UserCheck, roles: ['owner', 'manager', 'supervisor', 'head_chef', 'chef', 'kitchen', 'kitchen_helper', 'captain', 'waiter', 'cashier', 'cleaner', 'helper', 'staff'] },
  { name: 'Inventory & Recipes', href: '/dashboard/inventory', icon: Boxes, roles: ['owner', 'manager', 'supervisor', 'head_chef', 'chef', 'kitchen'] },
  { name: 'Reports & Analytics', href: '/dashboard/reports', icon: BarChart3, roles: ['owner', 'manager', 'supervisor', 'cashier'] },
  { name: 'Billing & SaaS', href: '/dashboard/billing', icon: CreditCard, roles: ['owner', 'manager'] },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['owner', 'manager'] }
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // 1. useState hooks
  const [profile, setProfile] = useState<Profile | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [alarmMuted, setAlarmMuted] = useState<boolean>(false);
  const [isRinging, setIsRinging] = useState(false);
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [dbRole, setDbRole] = useState<Profile['role']>('owner');
  const [activeRole, setActiveRole] = useState<Profile['role']>('owner');
  const [planSpec, setPlanSpec] = useState<PlanEntitlementSpec>(DEFAULT_PLAN_SPECS.starter);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // 2. useRef hooks
  const logoTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localOrderIdsRef = useRef<Set<string>>(new Set());
  const inFlightAlarmsCheckRef = useRef<Promise<void> | null>(null);
  const lastAlarmsCheckTimestampRef = useRef<number>(0);

  const fetchPlanSpec = async (planId: string) => {
    try {
      const spec = await getCachedPlanSpec(planId);
      setPlanSpec(spec);
    } catch (e) {
      const pId = (planId || 'starter').toLowerCase();
      setPlanSpec(DEFAULT_PLAN_SPECS[pId] || DEFAULT_PLAN_SPECS.starter);
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
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('smartdine_cached_profile');
        sessionStorage.removeItem('smartdine_cached_restaurant');
        sessionStorage.removeItem('smartdine_cached_rest_id');
      }
      router.push('/login');
      return;
    }
    if (user.role === 'super_admin') {
      // Phase-19: Allow super_admin to access /dashboard/founder/control-center
      if (!pathname.startsWith('/dashboard/founder')) {
        router.push('/super-admin');
        return;
      }
      // For founder paths: set a minimal profile so the layout renders
      setProfile(user);
      setDbRole('super_admin' as any);
      setActiveRole('owner' as any);
      setLoading(false);
      return;
    }
    setProfile(user);
    setDbRole(user.role);
    setActiveRole(user.role);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('smartdine_cached_profile', JSON.stringify(user));
      } catch (_) {}
    }

    // Parallel fetch restaurant and plan spec
    if (user.restaurant_id) {
      try {
        const rest = await db.getRestaurantById(user.restaurant_id);
        if (rest) {
          setRestaurant(rest);
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem('smartdine_cached_restaurant', JSON.stringify(rest));
              sessionStorage.setItem('smartdine_cached_rest_id', rest.id);
            } catch (_) {}
          }
          await fetchPlanSpec(rest.subscription_plan || 'starter');
        }
      } catch (e) {
        console.warn('DashboardLayout restaurant load notice:', e);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    // Read cached values from client storage immediately post-mount without SSR mismatch
    try {
      const storedMuted = localStorage.getItem('cleverops_bell_muted');
      if (storedMuted !== null) setAlarmMuted(storedMuted === 'true');

      const storedProfile = sessionStorage.getItem('smartdine_cached_profile');
      const storedRest = sessionStorage.getItem('smartdine_cached_restaurant');
      if (storedProfile && storedRest) {
        const prof = JSON.parse(storedProfile);
        const rest = JSON.parse(storedRest);
        setProfile(prof);
        setRestaurant(rest);
        const role = prof?.role || 'owner';
        setDbRole(role);
        setActiveRole(role);
        const p = (rest?.subscription_plan || 'starter').toLowerCase();
        setPlanSpec(DEFAULT_PLAN_SPECS[p] || DEFAULT_PLAN_SPECS.starter);
        setLoading(false);
      }
    } catch (_) {}

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

  useEffect(() => {
    setGlobalMute(alarmMuted);
  }, [alarmMuted]);

  useEffect(() => {
    if (restaurant?.id && profile) {
      registerDeviceActivity(restaurant.id, profile);
    }
  }, [restaurant?.id, profile?.id]);

  // Periodic Remote Session Revocation Guard (5-second tick + window focus check)
  useEffect(() => {
    if (!restaurant?.id || !profile) return;

    const checkRevocation = async () => {
      try {
        const myDevId = getOrCreateDeviceId();
        const freshRest = await db.getRestaurantById(restaurant.id);
        if (!freshRest) return;
        const revocation = freshRest.settings?.revoked_devices?.[myDevId];
        let authTimestamp = Number(localStorage.getItem('cleverops_auth_timestamp') || 0);
        if (!authTimestamp) {
          authTimestamp = Date.now();
          localStorage.setItem('cleverops_auth_timestamp', String(authTimestamp));
        }
        const revocationTime = revocation?.revoked_at ? new Date(revocation.revoked_at).getTime() : 0;
        const isRevoked = Boolean(revocation && revocationTime > authTimestamp);

        if (isRevoked) {
          console.warn('[RemoteLogout] Session was revoked remotely via heartbeat.');
          localStorage.removeItem('cleverops_device_id');
          localStorage.removeItem('cleverops_auth_timestamp');
          await signOutUser();
          window.location.href = '/login?reason=session_revoked';
        }
      } catch (_) {}
    };

    const interval = setInterval(checkRevocation, 5000);
    window.addEventListener('focus', checkRevocation);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkRevocation();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkRevocation);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [restaurant?.id, profile?.id]);

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
          db.clearRestaurantCache(profile.restaurant_id);
          setRestaurant(updatedRest);
          if (updatedRest.subscription_plan) {
            await fetchPlanSpec(updatedRest.subscription_plan);
          }

          // Realtime Remote Logout Detection
          if (typeof window !== 'undefined') {
            const myDevId = getOrCreateDeviceId();
            const revocation = updatedRest.settings?.revoked_devices?.[myDevId];
            let authTimestamp = Number(localStorage.getItem('cleverops_auth_timestamp') || 0);
            if (!authTimestamp) {
              authTimestamp = Date.now();
              localStorage.setItem('cleverops_auth_timestamp', String(authTimestamp));
            }
            const revocationTime = revocation?.revoked_at ? new Date(revocation.revoked_at).getTime() : 0;
            const isRevoked = Boolean(revocation && revocationTime > authTimestamp);

            if (isRevoked) {
              console.warn('[RemoteLogout] Session was revoked remotely via realtime.');
              localStorage.removeItem('cleverops_device_id');
              localStorage.removeItem('cleverops_auth_timestamp');
              await signOutUser();
              window.location.href = '/login?reason=session_revoked';
              return;
            }
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
  const stopGlobalAlarm = () => {
    stopLoudBell();
  };

  const checkActiveAlarmsGlobal = async (restId: string, role: string) => {
    const now = Date.now();
    if (now - lastAlarmsCheckTimestampRef.current < 15000 && localOrderIdsRef.current.size > 0) {
      return;
    }
    if (inFlightAlarmsCheckRef.current) {
      return inFlightAlarmsCheckRef.current;
    }
    try {
      const cached = dashboardStore.getCachedOrders(restId);
      if (cached) {
        localOrderIdsRef.current = new Set(cached.map(o => o.id));
        lastAlarmsCheckTimestampRef.current = now;
        return;
      }
      const p = (async () => {
        const { data } = await supabase
          .from('orders')
          .select('id')
          .eq('restaurant_id', restId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (data) {
          localOrderIdsRef.current = new Set(data.map(o => o.id));
        }
        lastAlarmsCheckTimestampRef.current = Date.now();
      })();
      inFlightAlarmsCheckRef.current = p;
      await p;
    } catch (e) {
      console.warn('Error checking global order IDs:', e);
    } finally {
      inFlightAlarmsCheckRef.current = null;
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

  // Global Audio stop listeners triggered by actions & bell ringing state
  useEffect(() => {
    const handleStopSound = () => {
      stopGlobalAlarm();
      setIsRinging(false);
    };
    const handleBellState = (e: any) => {
      setIsRinging(Boolean(e?.detail?.isRinging));
    };
    window.addEventListener('stop-kitchen-sound', handleStopSound);
    window.addEventListener('stop-waiter-sound', handleStopSound);
    window.addEventListener('cleverops-bell-state-changed', handleBellState);
    return () => {
      window.removeEventListener('stop-kitchen-sound', handleStopSound);
      window.removeEventListener('stop-waiter-sound', handleStopSound);
      window.removeEventListener('cleverops-bell-state-changed', handleBellState);
    };
  }, []);

  // Phase-19 & Phase-31: Keyboard shortcuts (Ctrl+K for Smart Search, Ctrl+Shift+M for Founder Control Center, Esc for Exit Impersonation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global search shortcut (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setSearchPaletteOpen(prev => !prev);
        return;
      }

      // Quick slash '/' shortcut to search when not typing in form inputs
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        setSearchPaletteOpen(true);
        return;
      }

      if (e.key === 'Escape' && isImpersonating) {
        handleExitImpersonation();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('founder_mode', 'true');
        }
        const targetUrl = restaurant?.id 
          ? `/dashboard/founder/control-center?restaurantId=${restaurant.id}`
          : '/dashboard/founder/control-center';
        router.push(targetUrl);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isImpersonating, restaurant?.id]);

  // Global Realtime Alarm Listener
  useEffect(() => {
    if (!restaurant?.id) return;
    const restId = restaurant.id;

    checkActiveAlarmsGlobal(restId, activeRole);

    const channel = supabase
      .channel(`global_notifications_${restId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restId}` },
        async (payload) => {
          const newOrder = payload.new as any;
          if (newOrder && !localOrderIdsRef.current.has(newOrder.id)) {
            localOrderIdsRef.current.add(newOrder.id);
            if (!isGloballyMuted()) {
              playLoudBell(['kitchen', 'head_chef', 'chef', 'kitchen_helper'].includes(activeRole) ? 'kitchen' : ['waiter', 'captain'].includes(activeRole) ? 'waiter' : 'owner');
            }
          }
          await checkActiveAlarmsGlobal(restId, activeRole);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restId}` },
        async () => {
          await checkActiveAlarmsGlobal(restId, activeRole);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_requests', filter: `restaurant_id=eq.${restId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT' && !isGloballyMuted()) {
            playLoudBell('waiter');
          }
          await checkActiveAlarmsGlobal(restId, activeRole);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_batches' },
        async (payload) => {
          const batch = payload.new as any;
          if (payload.eventType === 'UPDATE' && batch?.status === 'ready' && !isGloballyMuted()) {
            playLoudBell('waiter');
          }
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
    // Phase-19 Hotfix-R2: Bypass every dashboard redirect when pathname starts with /dashboard/founder
    if (pathname?.startsWith('/dashboard/founder')) {
      return;
    }

    if (!loading && profile) {
      const allowed = ALLOWED_PATHS[dbRole] || ALLOWED_PATHS['owner'];
      const isPathAllowed = allowed.some(p => pathname === p || pathname?.startsWith(p + '/'));
      if (!isPathAllowed) {
        const isKitchenRole = ['kitchen', 'head_chef', 'chef', 'kitchen_helper'].includes(dbRole);
        const isSupportRole = ['cleaner', 'helper', 'staff'].includes(dbRole);
        const isFloorRole = ['waiter', 'captain', 'cashier', 'supervisor'].includes(dbRole);
        const defaultRoute = isKitchenRole ? '/dashboard/kds' : isSupportRole ? '/dashboard/attendance/punch' : isFloorRole ? '/dashboard/orders' : '/dashboard';
        router.replace(defaultRoute);
      }
    }
  }, [loading, profile, dbRole, pathname, router]);

  const filteredMenuItems = ALL_MENU_ITEMS.filter(item => {
    if (!item.roles.includes(activeRole)) return false;
    if (activeRole === 'manager' && item.href === '/dashboard/reports' && (restaurant?.settings as any)?.manager_reports_enabled === false) return false;
    if (activeRole === 'supervisor') {
      const dept = (profile?.department || '').toLowerCase();
      if (dept === 'kitchen' && (item.href === '/dashboard/orders' || item.href === '/dashboard/tables')) return false;
      if (dept === 'waiter' && (item.href === '/dashboard/kds' || item.href === '/dashboard/inventory' || item.href === '/dashboard/menu')) return false;
    }
    return true;
  });

  // Eagerly prefetch core dashboard routes for instantaneous sub-100ms transitions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const prefetchRoutes = () => {
        filteredMenuItems.forEach(item => {
          try {
            router.prefetch(item.href);
          } catch (e) {}
        });
        try {
          router.prefetch('/dashboard/staff');
        } catch (e) {}
      };

      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(prefetchRoutes);
      } else {
        setTimeout(prefetchRoutes, 300);
      }
    }
  }, [filteredMenuItems, router]);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smartdine_impersonated_profile');
      sessionStorage.clear();
      localStorage.removeItem('cleverops_auth_timestamp');
    }
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView?.postMessage) {
      try { (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'SIGN_OUT' })); } catch (_) {}
    }
    clearActiveUserCache();
    // Non-blocking background signOut so client navigates to /login instantly (< 150 ms)
    supabase.auth.signOut().catch(() => {});
    router.push('/login');
  };

  const handleExitImpersonation = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smartdine_impersonated_profile');
    }
    clearActiveUserCache();
    router.push('/super-admin');
  };

  const handleSwitchPortal = async (newRole: 'owner' | 'kitchen' | 'waiter' | 'customer') => {
    if (!restaurant) return;
    if (newRole === 'customer') {
      window.open(`/menu/${restaurant.slug}`, '_blank');
      return;
    }
    const currentImp = sessionStorage.getItem('smartdine_impersonated_profile');
    if (currentImp) {
      try {
        const p = JSON.parse(currentImp);
        p.role = newRole;
        sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(p));
        setDbRole(newRole);
        setActiveRole(newRole);
      } catch (e) {}
    }
    try {
      fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRestaurantId: restaurant.id, targetRole: newRole })
      }).catch(() => {});
    } catch (e) {}

    if (newRole === 'kitchen') router.push('/dashboard/kds');
    else if (newRole === 'waiter') router.push('/dashboard/orders');
    else router.push('/dashboard');
  };

  const handleReturnToSuperAdmin = () => {
    router.push('/super-admin');
  };

  const handleToggleBellMute = async () => {
    // If bell is actively ringing, 1-tap immediately silences the active chime
    if (isRinging) {
      stopGlobalAlarm();
      setIsRinging(false);
      return;
    }

    const nextMuted = !alarmMuted;
    setAlarmMuted(nextMuted);
    setGlobalMute(nextMuted);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cleverops_bell_muted', nextMuted ? 'true' : 'false');
      } catch (_) {}
    }
    if (nextMuted) {
      stopLoudBell();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('stop-kitchen-sound'));
        window.dispatchEvent(new Event('stop-waiter-sound'));
      }
    }

    // If current user is Owner, persist in restaurant.settings.owner_bell_enabled (pure background non-blocking)
    if (restaurant?.id && (dbRole === 'owner' || activeRole === 'owner')) {
      const newSettings = {
        ...(restaurant.settings || {}),
        owner_bell_enabled: !nextMuted
      };
      (async () => {
        try {
          await supabase.from('restaurants').update({ settings: newSettings }).eq('id', restaurant.id);
        } catch (_) {}
      })();
    }
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

  // Check path permissions based on actual database role (OP-006: strict exact/subpath matching)
  const isPathAllowed = () => {
    if (pathname?.startsWith('/dashboard/founder')) return true;
    const roleAllowedPaths = ALLOWED_PATHS[dbRole] || ALLOWED_PATHS['owner'];
    return roleAllowedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
  };

  const allowed = isPathAllowed();

  // Check if current route is feature-locked by Super Admin plan specs
  const matchingRouteKey = Object.keys(ROUTE_FEATURE_KEYS).find(k => pathname === k || pathname.startsWith(`${k}/`));
  const routeLockInfo = matchingRouteKey ? ROUTE_FEATURE_KEYS[matchingRouteKey] : undefined;
  const isCurrentRouteLocked = Boolean(routeLockInfo && planSpec.features[routeLockInfo.key] === false);

  const isExpired = restaurant ? isSubscriptionExpired(restaurant) : false;
  const isFounderRoute = pathname?.startsWith('/dashboard/founder');

  if (isFounderRoute) {
    return (
      <RestaurantContext.Provider value={{ restaurant, profile, activeRole, dbRole, planSpec, refresh: checkAuth, alarmMuted, setAlarmMuted }}>
        <PreviewModeProvider>
          <div className="fixed inset-0 w-full h-full bg-slate-950 text-slate-100 overflow-hidden z-50">
            {children}
          </div>
        </PreviewModeProvider>
      </RestaurantContext.Provider>
    );
  }

  return (
    <RestaurantContext.Provider value={{ restaurant, profile, activeRole, dbRole, planSpec, refresh: checkAuth, alarmMuted, setAlarmMuted }}>
      <PreviewModeProvider>
        <div className="h-screen max-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 overflow-hidden">
        <MockBanner />

        {isImpersonating && (
          <div className="bg-indigo-700 dark:bg-indigo-950 text-white px-4 py-2 text-xs md:text-sm font-bold flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg z-50 animate-fade-in border-b border-indigo-500/30">
            <div className="flex items-center gap-2 shrink-0">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="font-extrabold tracking-wide">
                Viewing as: {restaurant?.name || 'Restaurant'} ({activeRole ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1) : 'Owner'})
              </span>
            </div>

            {/* Portal Quick Switcher Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-mono text-indigo-200 hidden lg:inline mr-1">Switch Portal:</span>
              <button
                onClick={() => handleSwitchPortal('owner')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${activeRole === 'owner' ? 'bg-white text-indigo-900 shadow-sm' : 'bg-indigo-800/80 hover:bg-indigo-800 text-white'}`}
              >
                Owner
              </button>
              <button
                onClick={() => handleSwitchPortal('kitchen')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${activeRole === 'kitchen' ? 'bg-white text-indigo-900 shadow-sm' : 'bg-indigo-800/80 hover:bg-indigo-800 text-white'}`}
              >
                Kitchen
              </button>
              <button
                onClick={() => handleSwitchPortal('waiter')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${activeRole === 'waiter' ? 'bg-white text-indigo-900 shadow-sm' : 'bg-indigo-800/80 hover:bg-indigo-800 text-white'}`}
              >
                Waiter
              </button>
              <button
                onClick={() => handleSwitchPortal('customer')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-800/80 hover:bg-indigo-800 text-white transition-all flex items-center gap-1"
              >
                Customer Menu ↗
              </button>
            </div>

            {/* Return to Super Admin & Exit Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleReturnToSuperAdmin}
                className="bg-indigo-800/90 hover:bg-indigo-800 border border-indigo-400/40 text-white px-3 py-1 rounded-lg font-bold text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer"
              >
                Return to Super Admin
              </button>
              <button
                onClick={handleExitImpersonation}
                className="bg-white text-indigo-950 hover:bg-slate-100 px-3 py-1 rounded-lg font-black text-xs shadow-sm transition-all whitespace-nowrap cursor-pointer hover:scale-105"
              >
                Exit
              </button>
            </div>
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

        <div className="flex flex-1 relative overflow-hidden h-full">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar - Sticky on desktop */}
          <aside className={`
            fixed lg:sticky top-0 inset-y-0 left-0 z-40 w-72 lg:w-64 h-full max-h-screen overflow-hidden bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl text-white flex flex-col transform transition-transform duration-300 ease-in-out shrink-0 border-r border-slate-800/80 shadow-2xl shadow-slate-950/50
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>

            {/* Logo Section */}
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
                // Phase-19: 5-tap easter egg → Founder Control Center
                if (logoTapTimerRef.current) clearTimeout(logoTapTimerRef.current);
                const nextCount = logoTapCount + 1;
                setLogoTapCount(nextCount);
                if (nextCount >= 5) {
                  setLogoTapCount(0);
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('founder_mode', 'true');
                  }
                  const targetUrl = restaurant?.id
                    ? `/dashboard/founder/control-center?restaurantId=${restaurant.id}`
                    : '/dashboard/founder/control-center';
                  router.push(targetUrl);
                } else {
                  logoTapTimerRef.current = setTimeout(() => setLogoTapCount(0), 3000);
                }
              }}>
                <div className="h-8 w-8 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center shadow-xs">
                  <img src="/logo.png" alt="CleverOps Logo" className="h-full w-full object-contain select-none" />
                </div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent select-none">CleverOps</span>
                {logoTapCount > 0 && logoTapCount < 5 && (
                  <span className="text-[8px] text-emerald-400 font-mono opacity-60">{5 - logoTapCount}</span>
                )}
              </div>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-3 sm:px-3.5 py-2 space-y-2 lg:space-y-0.5 overflow-y-auto lg:overflow-y-hidden no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {filteredMenuItems.map((item) => {
                const isActive = pathname === item.href;
                const itemLockInfo = ROUTE_FEATURE_KEYS[item.href];
                const isLocked = Boolean(itemLockInfo && planSpec.features[itemLockInfo.key] === false);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={true}
                    onMouseEnter={() => {
                      try {
                        router.prefetch(item.href);
                        const restId = restaurant?.id || profile?.restaurant_id;
                        if (restId) dashboardStore.prewarmRoute(item.href, restId);
                      } catch (e) {}
                    }}
                    onTouchStart={() => {
                      try {
                        router.prefetch(item.href);
                        const restId = restaurant?.id || profile?.restaurant_id;
                        if (restId) dashboardStore.prewarmRoute(item.href, restId);
                      } catch (e) {}
                    }}
                    onClick={() => {
                      if (sidebarOpen) setSidebarOpen(false);
                    }}
                    className={`
                      flex items-center justify-between px-4 py-3 lg:py-1.5 lg:px-3 rounded-xl lg:rounded-lg text-[16px] sm:text-[17px] lg:text-[13px] font-bold lg:font-medium transition-all group
                      ${isActive 
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10 font-extrabold lg:font-bold' 
                        : isLocked
                        ? 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                    `}
                  >
                    <div className="flex items-center min-w-0">
                      <span className="truncate">{item.name}</span>
                    </div>
                    {isLocked && (
                      <Lock className="h-3.5 w-3.5 text-amber-400/90 shrink-0 ml-1.5" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User Section / Logout */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0">
              <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-800 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate text-slate-200">{profile?.full_name}</p>
                  <p className="text-[10px] text-slate-400 truncate capitalize mt-0.5">
                    {dbRole} {activeRole !== dbRole && `(as ${activeRole})`} • {restaurant?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign Out
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden h-full max-w-full">
            {/* Live 72-Hour Trial Countdown & Expiry Banner */}
            {restaurant && (
              <TrialCountdownBanner
                restaurant={restaurant}
                isOwner={dbRole === 'owner' || activeRole === 'owner'}
              />
            )}

            {/* Dashboard Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 pt-2 pb-2 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {restaurant?.logo_url && !logoError ? (
                    <img 
                      src={restaurant.logo_url} 
                      alt={restaurant.name || 'Restaurant Logo'} 
                      onError={() => setLogoError(true)}
                      className="h-8 w-8 rounded-lg object-cover border border-slate-100 dark:border-slate-800 shrink-0" 
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-black text-sm shadow-xs select-none shrink-0">
                      {restaurant?.name?.replace(/^(The\s+)/i, '').charAt(0) || restaurant?.name?.charAt(0) || 'R'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-sm font-bold text-slate-950 dark:text-white leading-none truncate max-w-[140px] xs:max-w-[180px] sm:max-w-[280px] md:max-w-[400px]" title={restaurant?.name}>{restaurant?.name}</h1>
                  </div>
                </div>
              </div>

              {/* 🔍 Global Search Bar for Desktop / Laptop / Tablet (Web View) */}
              <div className="hidden md:flex items-center flex-1 max-w-sm lg:max-w-md mx-3 lg:mx-6">
                <button
                  type="button"
                  onClick={() => setSearchPaletteOpen(true)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-400 text-xs font-semibold flex items-center transition shadow-2xs group cursor-pointer"
                  title="Search features, processes, or ask how to..."
                >
                  <span className="flex items-center gap-2 truncate">
                    <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
                    <span className="truncate">Search features or ask how to...</span>
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* 🔍 Mobile Search Icon Button (Mobile App View) */}
                <button
                  type="button"
                  onClick={() => setSearchPaletteOpen(true)}
                  className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shadow-xs"
                  title="Search features or ask how to"
                  aria-label="Open search and how-to assistant"
                >
                  <Search className="h-4 w-4 shrink-0" />
                </button>

                {/* 🔔 Minimalist Bell Alert Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleBellMute}
                  className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center gap-1.5 ${
                    isRinging
                      ? 'bg-rose-600 text-white border-rose-500 animate-pulse ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/20'
                      : alarmMuted
                      ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700 hover:bg-slate-200'
                      : 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white hover:bg-slate-800'
                  }`}
                  title={
                    isRinging
                      ? 'ALERT RINGING! Click to silence bell immediately.'
                      : alarmMuted
                      ? 'Order sound alerts are MUTED. Click to turn sound ON.'
                      : 'Order sound alerts are ACTIVE. Click to MUTE.'
                  }
                  aria-label="Toggle bell sound alerts"
                >
                  {isRinging ? (
                    <Bell className="h-4 w-4 shrink-0 fill-current animate-bounce text-white" />
                  ) : alarmMuted ? (
                    <BellOff className="h-4 w-4 shrink-0" />
                  ) : (
                    <Bell className="h-4 w-4 shrink-0 fill-current" />
                  )}
                  {isRinging && (
                    <span className="text-[10px] font-black uppercase tracking-wider pr-1">Silence</span>
                  )}
                </button>
              </div>
            </header>

            {/* Dashboard Content Container */}
            <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in overflow-x-hidden">
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
                      <Link href={['kitchen', 'head_chef', 'chef', 'kitchen_helper'].includes(dbRole) ? '/dashboard/kds' : ['cleaner', 'helper', 'staff'].includes(dbRole) ? '/dashboard/attendance/punch' : '/dashboard/orders'}>
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
              ) : (restaurant && isSubscriptionExpired(restaurant) && (dbRole === 'owner' || activeRole === 'owner') && pathname !== '/dashboard/billing' && pathname !== '/dashboard/settings') ? (
                <div className="min-h-[60vh] flex items-center justify-center p-4">
                  <div className="max-w-md w-full bg-white dark:bg-slate-900 border-2 border-rose-500/30 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-xl">
                    <div className="h-16 w-16 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/40">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">Trial Expired</h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Aapka 3-Din Trial samapt ho gaya hai. <strong>Aapka sara data, menu, recipes aur sales records 100% safe hain.</strong>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Naye orders, KOT aur billing chalu rakhne ke liye kripya apna regular plan activate karein.
                      </p>
                    </div>
                    <div className="pt-2 flex flex-col gap-2.5">
                      <Link href="/dashboard/billing">
                        <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-sm shadow-md cursor-pointer flex items-center justify-center gap-2">
                          <span>Upgrade to Continue</span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                      <Link href="/dashboard/settings">
                        <button className="w-full py-2.5 px-3 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                          View Restaurant Settings
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                children
              )}
            </main>

            {/* Pure Frosted Crystal Floating Manage Button for Mobile (Only 'Manage' Text) */}
            <div className="fixed bottom-6 right-5 z-40 lg:hidden pointer-events-auto">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="px-5 py-2.5 rounded-full cursor-pointer active:scale-95 transition-all backdrop-blur-md bg-white/80 dark:bg-slate-900/85 border border-white/70 dark:border-slate-700/70 shadow-xl flex items-center justify-center"
                aria-label="Open navigation menu"
              >
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
                  Manage
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Command Palette & Smart How-To Assistant */}
      <GlobalCommandPalette
        isOpen={searchPaletteOpen}
        onClose={() => setSearchPaletteOpen(false)}
        userRole={activeRole || profile?.role || 'owner'}
      />
      </PreviewModeProvider>
    </RestaurantContext.Provider>
  );
}
