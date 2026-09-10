'use client';

/**
 * Phase-19: Founder Control Center — Main Shell
 * Routes between Live | Replay | System | Debug modes.
 * Session-persistent mode state.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  RotateCcw,
  PauseCircle,
  Network,
  Bug,
  Wifi,
  WifiOff,
  Zap,
  LogOut,
  HelpCircle,
  BookOpen,
  X,
  Sparkles,
} from 'lucide-react';
import { useSystemEvents } from '@/hooks/useSystemEvents';
import LiveMode from './LiveMode';
import ReplayMode from './ReplayMode';
import FreezeMode from './FreezeMode';
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
  { id: 'freeze', label: 'Freeze', icon: PauseCircle },
  { id: 'system', label: 'System', icon: Network },
  { id: 'debug',  label: 'Debug',  icon: Bug },
];

function readSavedMode(): FounderMode {
  if (typeof window === 'undefined') return 'live';
  const tab = sessionStorage.getItem('founder_active_tab');
  if (tab && ['live', 'replay', 'freeze', 'system', 'debug'].includes(tab)) {
    return tab as FounderMode;
  }
  return 'live';
}

export default function FounderControlCenter({ restaurantId, profile }: FounderControlCenterProps) {
  // ─── All hooks FIRST (React Hook Safety Rule) ────────────────────────────
  const router = useRouter();
  const [activeMode, setActiveMode] = useState<FounderMode>(readSavedMode);
  const [followingOrderId, setFollowingOrderId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [recorderEnabled, setRecorderEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('founder_recorder_enabled') !== 'false';
  });
  const [recorderMode, setRecorderMode] = useState<'production' | 'test'>(() => {
    if (typeof window === 'undefined') return 'production';
    return (localStorage.getItem('founder_recorder_mode') as 'production' | 'test') || 'production';
  });

  const { events, orderDots, isConnected, connectionStatus, totalEventCount } = useSystemEvents({
    restaurantId,
    enabled: true,
  });

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

  const handleModeChange = useCallback((mode: FounderMode) => {
    setActiveMode(mode);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('founder_active_tab', mode);
    }
  }, []);

  const handleFollowOrder = useCallback((id: string | null) => {
    setFollowingOrderId(id);
  }, []);

  const handleToggleRecorder = useCallback(() => {
    setRecorderEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('founder_recorder_enabled', next ? 'true' : 'false');
      }
      return next;
    });
  }, []);

  const handleSetRecorderMode = useCallback((mode: 'production' | 'test') => {
    setRecorderMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('founder_recorder_mode', mode);
    }
  }, []);

  const handleToggleHelp = useCallback(() => {
    setHelpOpen((prev) => !prev);
  }, []);

  const handleExitFounderMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('founder_mode');
      sessionStorage.removeItem('founder_active_tab');
    }
    router.push('/dashboard');
  }, [router]);

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

        {/* ── Event Recorder Controls ── */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1">
          <button
            onClick={handleToggleRecorder}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
              recorderEnabled
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                : 'bg-slate-700 text-slate-400'
            }`}
            title={recorderEnabled ? 'Click to turn Event Recorder OFF' : 'Click to turn Event Recorder ON'}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${recorderEnabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
            <span>Recorder: {recorderEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {recorderEnabled && (
            <div className="flex items-center bg-slate-900 rounded p-0.5 text-[9px] font-mono border border-slate-700/50">
              <button
                onClick={() => handleSetRecorderMode('production')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  recorderMode === 'production'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Production mode: Essential events only (orders, transitions, payments)"
              >
                Prod (Essential)
              </button>
              <button
                onClick={() => handleSetRecorderMode('test')}
                className={`px-1.5 py-0.5 rounded transition-colors ${
                  recorderMode === 'test'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Test mode: Verbose (QR scan, cart update, API timings)"
              >
                Test (Verbose)
              </button>
            </div>
          )}
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

          {/* Help & Guide button */}
          <button
            data-testid="btn-help-guide"
            onClick={handleToggleHelp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:text-white bg-sky-950/60 hover:bg-sky-600 border border-sky-800/60 hover:border-sky-500 rounded-lg transition-all shadow-sm cursor-pointer ml-1"
            title="Open Interactive Demo & Walkthrough Guide"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Help & Guide</span>
            <span className="sm:hidden">Help</span>
          </button>

          {/* Exit Founder Mode */}
          <button
            onClick={handleExitFounderMode}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-600 border border-rose-800/60 hover:border-rose-500 rounded-lg transition-all shadow-sm cursor-pointer"
            title="Exit Founder Control Center"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exit Founder Mode</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </div>

      {/* ── Mode Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeMode === 'live' && (
          <LiveMode
            restaurantId={restaurantId}
            followingOrderId={followingOrderId}
            onFollowOrder={handleFollowOrder}
            events={events}
            orderDots={orderDots}
          />
        )}
        {activeMode === 'replay' && (
          <ReplayMode restaurantId={restaurantId} initialEvents={events} />
        )}
        {activeMode === 'freeze' && (
          <FreezeMode
            restaurantId={restaurantId}
            events={events}
          />
        )}
        {activeMode === 'system' && (
          <SystemMode restaurantId={restaurantId} />
        )}
        {activeMode === 'debug' && (
          <DebugMode restaurantId={restaurantId} events={events} />
        )}
      </div>

      {/* ── Part 10: Demo Walkthrough Mode Modal ─────────────────────────── */}
      {helpOpen && (
        <div
          data-testid="help-guide-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-950/80 border border-sky-600/50 text-sky-400">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Founder Control Center — Interactive Guide
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Mission control flight deck for smart restaurant operations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Live Mode */}
                <div className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold">
                    <Activity className="h-4 w-4" />
                    <span>Live Mode & Pipeline</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Visualizes active orders moving from QR scan through Kitchen prep to Billing. Click glowing dots to trace complete order journey. Click nodes to open telemetry.
                  </p>
                </div>

                {/* 2. Interactive Floor Twin */}
                <div className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Sparkles className="h-4 w-4" />
                    <span>Interactive Floor Twin</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Click any occupied table to view session ID, assigned waiter, bill amount, ordered items, and kitchen stage pills. Click empty tables to generate QR codes.
                  </p>
                </div>

                {/* 3. Actionable Inspector */}
                <div className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <Network className="h-4 w-4" />
                    <span>Actionable Inspector</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Inspect telemetry for any subsystem. Customer Calls node includes instant dispatch buttons (&quot;I&apos;m Coming&quot;, &quot;Assign Ravi&quot;), Push alerts, and Executive Reports.
                  </p>
                </div>

                {/* 4. CCTV Replay Mode */}
                <div className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <RotateCcw className="h-4 w-4" />
                    <span>CCTV Replay Mode</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Auto-loads today&apos;s events. Scrub through time, choose 1x, 2x, or 5x playback speed, and watch orders traverse the pipeline with glowing camera tracking.
                  </p>
                </div>

                {/* 5. Freeze Mode & Time Travel */}
                <div className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-cyan-400 font-bold">
                    <PauseCircle className="h-4 w-4" />
                    <span>Freeze Frame & Diff</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Freezes incoming updates. Scrubber slider reconstructs historical floor occupancy and KDS counts. Ghost Mode and Compare Diff compute state deltas.
                  </p>
                </div>

                {/* 6. Frozen Inventory Telemetry */}
                <div className="p-3.5 rounded-xl bg-slate-850/80 border border-slate-700/80 space-y-1.5">
                  <div className="flex items-center gap-2 text-teal-400 font-bold">
                    <Zap className="h-4 w-4" />
                    <span>Frozen Inventory Telemetry</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Permanent frozen inventory engine. Real-time audit logs track reservations on acceptance and recipe deductions on kitchen preparation with idempotency.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                CleverOps Founder Flight Deck v21.4
              </span>
              <button
                onClick={() => setHelpOpen(false)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold font-mono cursor-pointer transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
