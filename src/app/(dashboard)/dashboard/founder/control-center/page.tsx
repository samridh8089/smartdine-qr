'use client';

/**
 * Phase-19: Founder Control Center
 * Route: /dashboard/founder/control-center
 *
 * Access: owner, manager, super_admin (via 5-tap logo or Ctrl+Shift+M)
 * Strict Compliance: CleverOps React Hooks Safety Guardrail
 * All hooks declared first; zero hooks below conditional returns.
 */

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRestaurant } from '@/app/(dashboard)/layout';
import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues with Konva / large component tree
const FounderControlCenter = dynamic(
  () => import('@/components/founder/FounderControlCenter'),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-emerald-400 font-mono text-sm">Initializing Founder Control Center...</p>
        </div>
      </div>
    ),
  }
);

function FounderControlCenterInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { restaurant, profile, dbRole } = useRestaurant();
  const [hasFounderSession, setHasFounderSession] = useState<boolean>(false);

  const restaurantId = useMemo(() => {
    const fromQuery = searchParams.get('restaurantId') || searchParams.get('restaurant');
    return fromQuery || restaurant?.id || profile?.restaurant_id || '';
  }, [searchParams, restaurant?.id, profile?.restaurant_id]);

  // Access control check: authorized role (owner, manager, super_admin)
  const isRoleAuthorized = useMemo(() => {
    if (!profile) return false;
    return (
      dbRole === 'super_admin' ||
      (profile.role as string) === 'super_admin' ||
      dbRole === 'owner' ||
      dbRole === 'manager'
    );
  }, [profile, dbRole]);

  const isAuthorized = isRoleAuthorized;

  // Once authorized via role, persist founder session in sessionStorage
  useEffect(() => {
    if (isRoleAuthorized && typeof window !== 'undefined') {
      sessionStorage.setItem('founder_mode', 'true');
    }
  }, [isRoleAuthorized]);

  useEffect(() => {
    if (profile && !isAuthorized) {
      router.replace('/dashboard');
    }
  }, [profile, isAuthorized, router]);

  // Don't render until we know the user is authorized
  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-screen">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-screen">
        <p className="text-rose-400 font-mono text-sm">Access Denied</p>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-screen">
        <div className="text-center space-y-3">
          <p className="text-amber-400 font-mono text-sm">No restaurant context available.</p>
          <p className="text-slate-500 text-xs">
            Super Admin: please impersonate a restaurant first, then access the Founder Control Center.
          </p>
          <button
            onClick={() => router.push('/super-admin')}
            className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700"
          >
            Go to Super Admin Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-hidden" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <FounderControlCenter
        restaurantId={restaurantId}
        profile={profile}
      />
    </div>
  );
}

export default function FounderControlCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-slate-950 min-h-screen">
          <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FounderControlCenterInner />
    </Suspense>
  );
}
