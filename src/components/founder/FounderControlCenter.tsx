'use client';

/**
 * SmartDine Control Tower V4 (Live NOC & Digital Twin) Host Component
 *
 * Hosts the high-performance 92-node vector digital twin, realtime WebSocket bus,
 * live CCTV floor grid, and time-travel replay engine.
 *
 * Strict Compliance: CleverOps React Hooks Safety Guardrail
 * Declarations strictly ordered: useState -> useRef -> useMemo -> useCallback -> useEffect
 * Zero hooks below conditional returns.
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink,
  RotateCw,
  X,
  Radio,
  ShieldCheck,
  Maximize2
} from 'lucide-react';

export interface FounderControlCenterProps {
  restaurantId: string;
  profile?: {
    role?: string | null;
    full_name?: string | null;
    email?: string | null;
    restaurant_id?: string | null;
    [key: string]: any;
  } | null;
  onExit?: () => void;
}

export default function FounderControlCenter({
  restaurantId,
  profile,
  onExit,
}: FounderControlCenterProps) {
  const router = useRouter();

  // ── 1. ALL useState HOOKS ──
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // ── 2. ALL useRef HOOKS ──
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // ── 3. ALL useMemo HOOKS ──
  const userRole = useMemo(() => {
    return profile?.role || 'owner';
  }, [profile?.role]);

  const isSuperAdmin = useMemo(() => {
    return userRole === 'super_admin';
  }, [userRole]);

  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams();
    if (restaurantId) {
      params.set('restaurantId', restaurantId);
      params.set('restaurant', restaurantId);
    }
    if (userRole) {
      params.set('role', userRole);
    }
    if (profile?.full_name) {
      params.set('name', profile.full_name);
    }
    params.set('v', `v4_${reloadKey}_${Date.now()}`);
    const qs = params.toString();
    return `/founder-control-center.html${qs ? `?${qs}` : ''}`;
  }, [restaurantId, userRole, profile?.full_name, reloadKey]);

  // ── 4. ALL useCallback HOOKS ──
  const handleExit = useCallback(() => {
    if (onExit) {
      onExit();
      return;
    }
    if (isSuperAdmin) {
      router.push('/super-admin');
    } else {
      router.push('/dashboard');
    }
  }, [onExit, isSuperAdmin, router]);

  const handlePopout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.open(iframeSrc, '_blank', 'noopener,noreferrer');
    }
  }, [iframeSrc]);

  const handleReload = useCallback(() => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // ── 5. ALL useEffect HOOKS ──
  // Listen for SMARTDINE_EXIT_CONTROL_CENTER postMessage from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SMARTDINE_EXIT_CONTROL_CENTER') {
        handleExit();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleExit]);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleExit]);

  // ── RENDER (Only after ALL hooks are declared) ──
  return (
    <div className="relative w-full h-full min-h-[600px] flex flex-col bg-[#070b12] text-slate-100 overflow-hidden select-none">
      {/* Top Embedded Header Bar */}
      <header className="h-11 px-3.5 bg-[#0c1322] border-b border-[#263859] flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono font-semibold text-emerald-400">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>NOC V4 LIVE</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300">
            <span className="font-bold text-white tracking-tight">SmartDine Control Tower</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 font-mono text-[11px]">
              Tenant: {restaurantId ? `${restaurantId.slice(0, 8)}...` : 'All Tenants'}
            </span>
          </div>

          {isSuperAdmin && (
            <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono text-purple-300">
              <ShieldCheck className="w-3 h-3 text-purple-400" />
              SUPER ADMIN
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReload}
            title="Refresh Control Tower Frame"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePopout}
            title="Open Control Tower in Fullscreen Tab"
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-sky-400 bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/60 transition-colors font-medium"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Pop Out</span>
          </button>

          <button
            onClick={handleExit}
            title="Exit Control Center (Esc)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Main Content Area hosting the V4 HTML iframe */}
      <div className="relative flex-1 w-full h-full bg-[#070b12] overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#070b12]/95 backdrop-blur-sm transition-opacity duration-300">
            <div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="mt-3 font-mono text-xs text-emerald-400 tracking-wider">
              CONNECTING TO DIGITAL TWIN NOC...
            </p>
            <span className="mt-1 font-mono text-[10px] text-slate-500">
              Initializing 92 Vector Nodes & Supabase Realtime Bus
            </span>
          </div>
        )}

        <iframe
          key={reloadKey}
          ref={iframeRef}
          src={iframeSrc}
          title="SmartDine Control Tower V4"
          className="w-full h-full border-none m-0 p-0 block bg-[#070b12]"
          onLoad={handleIframeLoad}
          allow="autoplay; fullscreen; clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
