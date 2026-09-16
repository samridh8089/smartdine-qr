'use client';

/**
 * CleverOps Founder Control Center — Dedicated Route
 * Route: /dashboard/founder/control-center
 *
 * Strictly adheres to React Hook Safety Guardrail:
 * All hooks declared at the top level in exact order before any conditional returns.
 */

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useRestaurant } from '@/app/(dashboard)/layout';
import FounderControlCenter from '@/components/founder/FounderControlCenter';

function FounderControlCenterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── 1. useState Declarations ──────────────────────────────────────────────
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);

  // ── 2. useRef Declarations (None needed) ──────────────────────────────────

  // ── 3. useMemo Declarations ───────────────────────────────────────────────
  const { restaurant, profile, dbRole } = useRestaurant();

  const urlRestaurantId = useMemo(() => {
    return searchParams.get('restaurantId') || '';
  }, [searchParams]);

  const targetRestaurantId = useMemo(() => {
    return (
      urlRestaurantId ||
      restaurant?.id ||
      profile?.restaurant_id ||
      '81fa8201-51d7-4da5-98f5-a52dbff4e6ae'
    );
  }, [urlRestaurantId, restaurant?.id, profile?.restaurant_id]);

  const isRoleAuthorized = useMemo(() => {
    if (!profile) return false;
    const roleStr = (profile.role as string) || dbRole || '';
    return (
      roleStr === 'super_admin' ||
      roleStr === 'owner' ||
      roleStr === 'manager' ||
      dbRole === 'super_admin' ||
      dbRole === 'owner' ||
      dbRole === 'manager'
    );
  }, [profile, dbRole]);

  // ── 4. useCallback Declarations ───────────────────────────────────────────
  const handleExit = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  // ── 5. useEffect Declarations ─────────────────────────────────────────────
  // Mark loaded
  useEffect(() => {
    setHasLoaded(true);
  }, []);

  // Persist founder mode in session storage
  useEffect(() => {
    if (isRoleAuthorized && typeof window !== 'undefined') {
      sessionStorage.setItem('founder_mode', 'true');
    }
  }, [isRoleAuthorized]);

  // Redirect unauthorized users
  useEffect(() => {
    if (profile && !isRoleAuthorized) {
      router.replace('/dashboard');
    }
  }, [profile, isRoleAuthorized, router]);

  // Ensure restaurantId is reflected in URL so it survives refresh
  useEffect(() => {
    if (targetRestaurantId && !urlRestaurantId && typeof window !== 'undefined') {
      router.replace(`/dashboard/founder/control-center?restaurantId=${targetRestaurantId}`);
    }
  }, [targetRestaurantId, urlRestaurantId, router]);

  // ── Conditional Returns (Only AFTER all hooks) ────────────────────────────
  if (!profile && !hasLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070b12] min-h-screen">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (profile && !isRoleAuthorized) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#070b12] min-h-screen">
        <p className="text-rose-400 font-mono text-sm">Access Denied: Founder authorization required.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#070b12] overflow-hidden" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <FounderControlCenter
        restaurantId={targetRestaurantId}
        profile={profile}
        onExit={handleExit}
      />
    </div>
  );
}

export default function FounderControlCenterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#070b12] min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-emerald-400 font-mono text-xs">Initializing Control Tower V4...</p>
          </div>
        </div>
      }
    >
      <FounderControlCenterContent />
    </Suspense>
  );
}
