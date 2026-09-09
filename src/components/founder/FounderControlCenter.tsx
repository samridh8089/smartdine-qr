'use client';

/**
 * Phase-19: Founder Control Center — Main Shell
 * Routes between Live | Replay | System | Debug modes.
 * Session-persistent mode state.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Activity, RotateCcw, Network, Bug, Wifi, WifiOff, Zap } from 'lucide-react';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import LiveMode from './LiveMode';
import ReplayMode from './ReplayMode';
import SystemMode from './SystemMode';
import DebugMode from './DebugMode';
import type { FounderMode } from './types';

interface FounderControlCenterProps {
  restaurantId: string;
  profile: { role?: string; full_name?: string; email?: string } | null;
}

const MODE_CONFIG: Array<{ id: FounderMode; label: string; icon: typeof Activity }> = [
  { id: 'live',   label: 'Live',   icon: Activity },
  { id: 'replay', label: 'Replay', icon: RotateCcw },
  { id: 'system', label: 'System', icon: Network },
  { id: 'debug',  label: 'Debug',  icon: Bug },
];

function readSavedMode(): FounderMode {
  if (typeof window === 'undefined') return 'live';
  return (sessionStorage.getItem('founder_mode') as FounderMode) || 'live';
}

export default function FounderControlCenter({ restaurantId, profile }: FounderControlCenterProps) {
  // ─── All hooks FIRST (React Hook Safety Rule) ────────────────────────────
  const [activeMode, setActiveMode] = useState<FounderMode>(readSavedMode);
  const [followingOrderId, setFollowingOrderId] = useState<string | null>(null);

  const { events, isConnected, connectionStatus, totalEventCount } = useSystemEvents({
    restaurantId,
    enabled: true,
  });

  const handleModeChange = useCallback((mode: FounderMode) => {
    setActiveMode(mode);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('founder_mode', mode);
    }
  }, []);

  const handleFollowOrder = useCallback((id: string | null) => {
    setFollowingOrderId(id);
  }, []);

  const statusColor = useMemo(() => {
    if (connectionStatus === 'connected') return 'text-emerald-400';
    if (connectionStatus === 'connecting') return 'text-amber-400';
    return 'text-rose-400';
  }, [connectionStatus]);

  const statusLabel = useMemo(() => {
    if (connectionStatus === 'connected') return 'Live';
    if (connectionStatus === 'connecting') return 'Connecting';
    if (connectionStatus === 'error') return 'Error';
    return 'Offline';
  }, [connectionStatus]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full bg-slate-950 overflow-hidden">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="h-12 shrink-0 flex items-center gap-4 px-4 bg-slate-900 border-b border-slate-800">
        {/* Title */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-100 tracking-wide hidden sm:block">
            Founder Control Center
          </span>
          <span className="text-xs font-bold text-slate-100 tracking-wide sm:hidden">
            FCC
          </span>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg p-0.5">
          {MODE_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleModeChange(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${activeMode === id
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:block">{label}</span>
            </button>
          ))}
        </div>

        {/* Right side: connection + stats */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {/* Total events */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 rounded-full">
            <Zap className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-slate-400 font-mono">
              {totalEventCount.toLocaleString()} events
            </span>
          </div>

          {/* Realtime connection status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 ${statusColor}`}>
            {isConnected
              ? <Wifi className="h-3.5 w-3.5" />
              : <WifiOff className="h-3.5 w-3.5" />
            }
            <span className="text-[10px] font-medium hidden sm:block">{statusLabel}</span>
            {isConnected && (
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>

          {/* Restaurant info */}
          {profile && (
            <div className="hidden lg:block text-right">
              <p className="text-[9px] text-slate-500 truncate max-w-32">
                {profile.full_name || profile.email || 'Founder'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mode Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeMode === 'live' && (
          <LiveMode
            restaurantId={restaurantId}
            followingOrderId={followingOrderId}
            onFollowOrder={handleFollowOrder}
          />
        )}
        {activeMode === 'replay' && (
          <ReplayMode restaurantId={restaurantId} />
        )}
        {activeMode === 'system' && (
          <SystemMode restaurantId={restaurantId} />
        )}
        {activeMode === 'debug' && (
          <DebugMode restaurantId={restaurantId} events={events} />
        )}
      </div>
    </div>
  );
}
