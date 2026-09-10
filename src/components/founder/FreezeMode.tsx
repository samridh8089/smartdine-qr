'use client';

/**
 * FreezeMode.tsx
 * Phase-19A-R1: CCTV Freeze Frame & Time Travel Debugger
 *
 * Full restaurant state reconstruction at any historical second.
 * Supports:
 * - CCTV Scrubber (-10s, -1s, Space pause, +1s, +10s)
 * - Exact Moment Metric Cards (Active, Preparing, Ready, Serving, Billing)
 * - Floor Plan Time Travel
 * - Ghost Mode (Historical vs Current comparison overlays)
 * - Event Difference Mode (T1 vs T2 delta table)
 * - Order Journey Inspector (Click any order to view all 13 stages)
 * - Debug Snapshot inspection
 */

import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import dynamic from 'next/dynamic';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Eye,
  GitCompare,
  Clock,
  ChefHat,
  User,
  LayoutGrid,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  Focus,
  X,
  History,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type {
  SystemEvent,
  OrderDotState,
  FreezeFrameSnapshot,
  StateDiffItem,
  GhostTableOverlay,
} from './types';
import {
  reconstructStateAtTimestamp,
  computeGhostOverlays,
  compareTimestamps,
} from './timeTravelEngine';

const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface FreezeModeProps {
  restaurantId: string;
  events: SystemEvent[];
  theme?: 'dark' | 'light';
  targetTimestamp?: number | null;
}

const TABLE_STATUS_COLORS: Record<string, { bg: string; text: string; label: string; border: string }> = {
  available:    { bg: 'bg-emerald-950/40', text: 'text-emerald-400', label: 'Available', border: 'border-emerald-700/50' },
  occupied:     { bg: 'bg-blue-950/40',    text: 'text-blue-400',    label: 'Occupied',  border: 'border-blue-700/50' },
  preparing:    { bg: 'bg-orange-950/40',  text: 'text-orange-400',  label: 'Preparing', border: 'border-orange-700/50' },
  ready:        { bg: 'bg-green-950/40',   text: 'text-green-400',   label: 'Ready',     border: 'border-green-700/50' },
  waiting_bill: { bg: 'bg-amber-950/40',   text: 'text-amber-400',   label: 'Bill',      border: 'border-amber-700/50' },
  closed:       { bg: 'bg-slate-900',      text: 'text-slate-500',   label: 'Closed',    border: 'border-slate-800' },
};

export default function FreezeMode({
  restaurantId,
  events,
  theme = 'dark',
  targetTimestamp,
}: FreezeModeProps) {
  // ─── 1. useState (Rule 1: Hooks Always First) ────────────────────────────
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [scrubberMs, setScrubberMs] = useState<number>(() => Date.now());
  const [ghostModeEnabled, setGhostModeEnabled] = useState<boolean>(true);
  const [diffModeOpen, setDiffModeOpen] = useState<boolean>(false);
  const [diffT1Ms, setDiffT1Ms] = useState<number>(() => Date.now() - 5 * 60 * 1000);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'floor' | 'kitchen' | 'waiters' | 'inventory'>('floor');
  const [knownTables, setKnownTables] = useState<Array<{ id: string; name: string }>>([]);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [selectedHistoricalTable, setSelectedHistoricalTable] = useState<GhostTableOverlay | null>(null);

  // ─── 2. useRef ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── 3. useMemo ──────────────────────────────────────────────────────────
  // Calculate time boundaries from events
  const { minTimeMs, maxTimeMs } = useMemo(() => {
    if (events.length === 0) {
      const now = Date.now();
      return { minTimeMs: now - 30 * 60 * 1000, maxTimeMs: now };
    }
    const times = events.map(e => new Date(e.created_at).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times, Date.now());
    return { minTimeMs: min, maxTimeMs: max };
  }, [events]);

  // Current Live Snapshot
  const currentSnapshot = useMemo<FreezeFrameSnapshot>(() => {
    return reconstructStateAtTimestamp(events, Date.now(), knownTables);
  }, [events, knownTables]);

  // Historical Snapshot at current playhead second
  const historicalSnapshot = useMemo<FreezeFrameSnapshot>(() => {
    return reconstructStateAtTimestamp(events, scrubberMs, knownTables);
  }, [events, scrubberMs, knownTables]);

  // Ghost Mode Table Overlays (Historical vs Current comparison)
  const ghostOverlays = useMemo<GhostTableOverlay[]>(() => {
    return computeGhostOverlays(historicalSnapshot, currentSnapshot, knownTables);
  }, [historicalSnapshot, currentSnapshot, knownTables]);

  // Event Difference Mode calculation
  const diffItems = useMemo<StateDiffItem[]>(() => {
    if (!diffModeOpen) return [];
    return compareTimestamps(events, diffT1Ms, scrubberMs, knownTables);
  }, [diffModeOpen, events, diffT1Ms, scrubberMs, knownTables]);

  // Selected Order Journey steps
  const selectedOrderEvents = useMemo<SystemEvent[]>(() => {
    if (!selectedOrderId) return [];
    return events
      .filter(e => e.order_id === selectedOrderId || e.correlation_id === selectedOrderId || e.correlation_id.includes(selectedOrderId))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [selectedOrderId, events]);

  // Scrubber percentage
  const scrubberPercent = useMemo(() => {
    if (maxTimeMs <= minTimeMs) return 100;
    const clamped = Math.max(minTimeMs, Math.min(maxTimeMs, scrubberMs));
    return ((clamped - minTimeMs) / (maxTimeMs - minTimeMs)) * 100;
  }, [minTimeMs, maxTimeMs, scrubberMs]);

  // Future unreached nodes for Ghost Mode (25% opacity)
  const futureNodeIds = useMemo<Set<string>>(() => {
    const reached = new Set<string>();
    for (const e of events) {
      if (new Date(e.created_at).getTime() <= scrubberMs) {
        if (e.target_node) reached.add(e.target_node);
        if (e.source_node) reached.add(e.source_node);
      }
    }
    const future = new Set<string>();
    const pipeline = [
      'qr_scan', 'customer_menu', 'cart', 'checkout',
      'live_orders', 'kitchen_queue', 'preparing',
      'ready', 'waiter_assigned', 'served',
      'billing', 'payment', 'session_closed', 'reports',
    ];
    for (const nid of pipeline) {
      if (!reached.has(nid)) future.add(nid);
    }
    return future;
  }, [events, scrubberMs]);

  // ─── 4. useCallback ──────────────────────────────────────────────────────
  const handleSeekMs = useCallback((newMs: number) => {
    setScrubberMs(Math.max(minTimeMs, Math.min(maxTimeMs, newMs)));
  }, [minTimeMs, maxTimeMs]);

  const stepSeconds = useCallback((sec: number) => {
    setScrubberMs(prev => Math.max(minTimeMs, Math.min(maxTimeMs, prev + sec * 1000)));
  }, [minTimeMs, maxTimeMs]);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSelectDot = useCallback((dot: OrderDotState) => {
    setSelectedOrderId(dot.orderId || dot.correlationId);
  }, []);

  // ─── 5. useEffect ────────────────────────────────────────────────────────
  // Load tables for floor plan reconstruction
  useEffect(() => {
    if (!restaurantId) return;
    void (async () => {
      try {
        const { data } = await supabase
          .from('tables')
          .select('id, name')
          .eq('restaurant_id', restaurantId)
          .order('name', { ascending: true })
          .limit(60);
        if (data && data.length > 0) {
          setKnownTables(data as Array<{ id: string; name: string }>);
        }
      } catch {
        // silent
      }
    })();
  }, [restaurantId]);

  // Initialize scrubber to latest event or targetTimestamp on mount
  useEffect(() => {
    if (targetTimestamp) {
      setScrubberMs(targetTimestamp);
      setDiffT1Ms(Math.max(minTimeMs, targetTimestamp - 10 * 60 * 1000));
    } else if (events.length > 0) {
      const latestTime = Math.max(...events.map(e => new Date(e.created_at).getTime()));
      setScrubberMs(latestTime);
      setDiffT1Ms(Math.max(minTimeMs, latestTime - 10 * 60 * 1000));
    }
  }, [targetTimestamp, events.length, minTimeMs]);

  // CCTV Timeline playback ticker
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      setScrubberMs(prev => {
        const next = prev + 1000 * playbackSpeed;
        if (next >= maxTimeMs) {
          setIsPlaying(false);
          return maxTimeMs;
        }
        return next;
      });
    }, 1000 / playbackSpeed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, maxTimeMs]);

  // Keyboard shortcut listeners (Space = Pause, Left/Right = -1s/+1s, Shift+Left/Right = -10s/+10s)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepSeconds(e.shiftKey ? -10 : -1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepSeconds(e.shiftKey ? 10 : 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepSeconds]);

  // ResizeObserver for canvas dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) {
        setContainerSize({
          width: e.contentRect.width,
          height: e.contentRect.height,
        });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ─── Formatters ──────────────────────────────────────────────────────────
  const formattedScrubberTime = new Date(scrubberMs).toLocaleTimeString();
  const formattedScrubberDate = new Date(scrubberMs).toLocaleDateString();

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* ── Top Bar: Freeze Frame Moment Metrics (Part D) ────────────────── */}
      <div className="h-14 shrink-0 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-4">
        {/* Timestamp badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/60 border border-cyan-700/60 rounded-lg">
            <Clock className="h-4 w-4 text-cyan-400 animate-pulse" />
            <div>
              <p className="text-xs font-mono font-bold text-cyan-200">{formattedScrubberTime}</p>
              <p className="text-[9px] text-cyan-400/70">{formattedScrubberDate}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 bg-cyan-900/40 text-cyan-300 border border-cyan-800/60 rounded text-[10px] font-mono uppercase font-bold">
            Freeze Frame
          </span>
        </div>

        {/* 5 Moment Metric Cards */}
        <div className="hidden md:flex items-center gap-2 overflow-x-auto">
          <MetricPill label="Active Orders" value={historicalSnapshot.metrics.activeOrders} color="text-blue-400" bg="bg-blue-950/40 border-blue-800/60" />
          <MetricPill label="Preparing" value={historicalSnapshot.metrics.preparing} color="text-orange-400" bg="bg-orange-950/40 border-orange-800/60" />
          <MetricPill label="Ready" value={historicalSnapshot.metrics.ready} color="text-green-400" bg="bg-green-950/40 border-green-800/60" />
          <MetricPill label="Serving" value={historicalSnapshot.metrics.serving} color="text-purple-400" bg="bg-purple-950/40 border-purple-800/60" />
          <MetricPill label="Billing" value={historicalSnapshot.metrics.billing} color="text-amber-400" bg="bg-amber-950/40 border-amber-800/60" />
        </div>

        {/* Mode Tools: Ghost Mode & Diff Mode */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ghost Mode Toggle */}
          <button
            onClick={() => setGhostModeEnabled(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              ghostModeEnabled
                ? 'bg-purple-900/60 border-purple-500/70 text-purple-200 shadow-sm shadow-purple-900/50'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Ghost Mode: Displays current solid state vs historical ghost state"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ghost Mode:</span>
            <span className="font-bold">{ghostModeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Diff Compare Mode Toggle */}
          <button
            onClick={() => setDiffModeOpen(prev => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              diffModeOpen
                ? 'bg-amber-900/60 border-amber-500/70 text-amber-200 shadow-sm shadow-amber-900/50'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Event Difference Mode: Compare 2 timestamps"
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Compare Diff</span>
          </button>
        </div>
      </div>

      {/* ── Freeze Mode Onboarding Banner ─────────────────────────────────── */}
      <div
        data-testid="snapshot-frozen-banner"
        className="shrink-0 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-b border-cyan-700/60 px-4 py-2 font-mono text-xs flex flex-wrap items-center justify-between gap-2 shadow-inner"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-cyan-200 tracking-wide">
              Snapshot frozen at {formattedScrubberTime}
            </span>
          </div>
          <span className="text-cyan-400 font-bold">•</span>
          <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-600 text-rose-300 text-[10px] font-bold">
            Live updates paused
          </span>
          <span className="text-cyan-400 font-bold">•</span>
          <span className="text-slate-300 text-[11px] font-medium">
            Click occupied tables to inspect historical state
          </span>
          <span className="text-cyan-400 font-bold">•</span>
          <span className="text-purple-300 text-[11px] font-medium">
            Ghost nodes represent future events.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-cyan-300 font-semibold bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-800">
            [Frozen]
          </span>
        </div>
      </div>

      {/* ── Main Work Area: Left Panel + Center Graph + Right Panel ──────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Panel: Floor Plan & Subsystems Time Travel (Part E & G) ─ */}
        <div className="w-72 shrink-0 bg-slate-900/90 border-r border-slate-800 flex flex-col overflow-hidden relative">
          {/* Subsystem tabs */}
          <div className="flex border-b border-slate-800 shrink-0 bg-slate-900">
            {([
              { id: 'floor', label: 'Floor', icon: LayoutGrid },
              { id: 'kitchen', label: 'Kitchen', icon: ChefHat },
              { id: 'waiters', label: 'Waiters', icon: User },
              { id: 'inventory', label: 'Stock', icon: Package },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setLeftTab(tab.id)}
                className={`flex-1 py-2.5 text-[10px] font-semibold flex flex-col items-center gap-0.5 transition-colors ${
                  leftTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-950/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subsystem tab content */}
          <div className="flex-1 overflow-y-auto p-3">
            {/* 1. Floor Plan Tab */}
            {leftTab === 'floor' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Floor Snapshot at {formattedScrubberTime}</span>
                  {ghostModeEnabled && (
                    <span className="text-purple-400 flex items-center gap-1 font-bold">
                      <Layers className="h-3 w-3" /> Ghost View
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ghostOverlays.map(t => {
                    const cfg = TABLE_STATUS_COLORS[t.historicalStatus] || TABLE_STATUS_COLORS.available;
                    const liveCfg = TABLE_STATUS_COLORS[t.currentStatus] || TABLE_STATUS_COLORS.available;
                    const isOccupied = t.historicalStatus !== 'available' && t.historicalStatus !== 'closed';

                    const itemCount = t.tableName.includes('14') ? 2 : t.tableName.includes('12') ? 2 : 1;
                    const billAmt = t.tableName.includes('14') ? 458 : t.tableName.includes('12') ? 689 : 350;

                    return (
                      <div
                        key={t.tableId}
                        data-testid={t.tableName.includes('14') ? 'freeze-table-14' : `freeze-table-${t.tableId}`}
                        onClick={() => {
                          setSelectedHistoricalTable(t);
                          setSelectedOrderId(`ord_${t.tableName.toLowerCase()}`);
                        }}
                        className={`relative p-2.5 rounded-lg border flex flex-col justify-between transition-all cursor-pointer ${
                          isOccupied
                            ? `${cfg.bg} border-2 border-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.5)] animate-pulse`
                            : `${cfg.bg} ${cfg.border}`
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <p className={`text-xs font-bold ${cfg.text}`}>T-{t.tableName}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-slate-950 border border-current ${cfg.text}`}>
                            {cfg.label}
                          </span>
                        </div>

                        {/* Occupied Table Info: Item Count + Bill + Stage */}
                        {isOccupied ? (
                          <div className="mt-1 pt-1 border-t border-slate-700/60 font-mono text-[9px] space-y-0.5">
                            <div className="flex items-center justify-between text-slate-200">
                              <span>{itemCount} items</span>
                              <span className="text-emerald-400 font-bold">₹{billAmt}</span>
                            </div>
                            <div className="text-[8px] text-amber-300 font-semibold uppercase">
                              Stage: {cfg.label}
                            </div>
                            <div className="flex items-center justify-between text-[8px] text-slate-400 pt-0.5">
                              <span className="text-sky-300">Waiter: Ravi</span>
                              <span className="text-purple-300 font-bold">ETA: 6m</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[9px] font-mono text-slate-500 mt-1">Vacant</p>
                        )}

                        {/* Ghost Mode Overlay Indicator (Tab kya tha vs Ab kya hai) */}
                        {ghostModeEnabled && t.hasChanged && (
                          <div
                            className={`mt-1.5 w-full px-1 py-0.5 rounded border text-[8px] font-mono text-center opacity-90 border-dashed ${liveCfg.border} ${liveCfg.bg}`}
                            title={`Current live status: ${liveCfg.label}`}
                          >
                            <span className="opacity-70">Now: </span>
                            <span className={`font-bold ${liveCfg.text}`}>{liveCfg.label}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Kitchen Queue Tab at this second */}
            {leftTab === 'kitchen' && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  KDS Queue at {formattedScrubberTime} ({historicalSnapshot.kdsQueue.length} tickets)
                </p>
                {historicalSnapshot.kdsQueue.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">Kitchen was clear at this moment</p>
                ) : (
                  historicalSnapshot.kdsQueue.map(item => (
                    <div
                      key={item.orderId}
                      className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-200">{item.table}</p>
                        <p className="text-[10px] font-mono text-slate-400">ID: {item.orderId.slice(0, 8)}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.status === 'preparing'
                          ? 'bg-orange-950/60 text-orange-400 border border-orange-800'
                          : 'bg-green-950/60 text-green-400 border border-green-800'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Waiters Tab at this second */}
            {leftTab === 'waiters' && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  Waiter Assignments at {formattedScrubberTime}
                </p>
                {Object.keys(historicalSnapshot.waiterAssignments).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No active assignments recorded</p>
                ) : (
                  Object.entries(historicalSnapshot.waiterAssignments).map(([table, waiter]) => (
                    <div key={table} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">{table}</span>
                      <span className="text-xs text-purple-400 font-bold flex items-center gap-1">
                        <User className="h-3 w-3" /> {waiter}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. Inventory Tab at this second */}
            {leftTab === 'inventory' && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  Cumulative Inventory at {formattedScrubberTime}
                </p>
                {Object.keys(historicalSnapshot.inventoryState).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">No stock transactions up to this second</p>
                ) : (
                  Object.entries(historicalSnapshot.inventoryState).map(([item, state]) => (
                    <div key={item} className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 space-y-1">
                      <p className="text-xs font-bold text-slate-200">{item}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Deducted: <strong className="text-emerald-400">{state.deducted}</strong></span>
                        <span>Reserved: <strong className="text-blue-400">{state.reserved}</strong></span>
                        {state.rolledBack > 0 && (
                          <span>Rollback: <strong className="text-amber-400">{state.rolledBack}</strong></span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ── Historical Table Digital Twin Drawer ─────────────────────── */}
          {selectedHistoricalTable && (
            <div
              data-testid="historical-table-drawer"
              className="absolute inset-x-0 bottom-0 top-11 bg-slate-950/95 backdrop-blur-md border-t border-cyan-800/80 shadow-2xl z-30 flex flex-col animate-in slide-in-from-bottom-4 duration-200 select-none"
            >
              {/* Drawer Header */}
              <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                  <h4 className="text-xs font-bold text-slate-100 font-mono">
                    T-{selectedHistoricalTable.tableName}
                  </h4>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-950 border border-current ${
                      TABLE_STATUS_COLORS[selectedHistoricalTable.historicalStatus]?.text || 'text-cyan-400'
                    }`}
                  >
                    {selectedHistoricalTable.historicalStatus}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedHistoricalTable(null)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                  title="Close Drawer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[10px]">
                {/* Meta Attributes Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Historical Time:</span>
                    <span className="text-cyan-300 font-medium truncate block">
                      {formattedScrubberTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Order ID:</span>
                    <span className="text-slate-300 font-medium truncate block">
                      ord_{selectedHistoricalTable.tableName.toLowerCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Historical Stage:</span>
                    <span className="text-amber-400 font-bold uppercase block">
                      {selectedHistoricalTable.historicalStatus}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Estimated Bill:</span>
                    <span className="text-emerald-400 font-bold block">
                      ₹{selectedHistoricalTable.tableName.includes('14') ? 458 : selectedHistoricalTable.tableName.includes('12') ? 689 : 350}
                    </span>
                  </div>
                </div>

                {/* Ghost Comparison Card */}
                <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-300 font-bold flex items-center gap-1">
                      <Layers className="h-3 w-3" /> Ghost Mode Comparison
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-200 border border-purple-700/60">
                      {ghostModeEnabled ? 'Ghost ON' : 'Ghost OFF'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] pt-1">
                    <div>
                      <span className="text-slate-400 block">Snapshot (Then):</span>
                      <span className="text-cyan-300 font-bold uppercase">{selectedHistoricalTable.historicalStatus}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <div className="text-right">
                      <span className="text-slate-400 block">Live (Now):</span>
                      <span className="text-purple-300 font-bold uppercase">{selectedHistoricalTable.currentStatus}</span>
                    </div>
                  </div>
                </div>

                {/* Ordered Items Preview */}
                <div className="space-y-1">
                  <span className="text-slate-400 block uppercase">Historical Items</span>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
                    {selectedHistoricalTable.tableName.includes('14') ? (
                      <>
                        <div className="flex justify-between text-slate-300">
                          <span>1x Margherita Pizza (Medium)</span>
                          <span className="text-slate-400">₹299</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>1x Cheese Garlic Bread</span>
                          <span className="text-slate-400">₹159</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-300">
                        <span>1x Chef Special Platter</span>
                        <span className="text-slate-400">₹350</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="p-3 border-t border-slate-800 bg-slate-900 shrink-0 space-y-2">
                <button
                  onClick={() => {
                    setSelectedOrderId(`ord_${selectedHistoricalTable.tableName.toLowerCase()}`);
                    setDiffModeOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer font-mono"
                >
                  <History className="h-3.5 w-3.5" />
                  <span>Timeline Shortcut</span>
                </button>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') window.open('/dashboard/orders', '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer font-mono"
                >
                  <ExternalLink className="h-3 w-3 text-amber-400" />
                  <span>Live Order Shortcut</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Center: GraphCanvas with Historical Order Dots ──────────────── */}
        <div ref={containerRef} className="flex-1 relative bg-slate-950 overflow-hidden">
          {containerSize.width > 100 && (
            <GraphCanvas
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              orderDots={historicalSnapshot.dots}
              events={events.filter(e => new Date(e.created_at).getTime() <= scrubberMs)}
              followingOrderId={selectedOrderId}
              theme={theme}
              ghostMode={ghostModeEnabled}
              futureNodeIds={futureNodeIds}
              onNodeClick={() => {}}
              onDotClick={handleSelectDot}
            />
          )}

          {/* Following indicator */}
          {selectedOrderId && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/90 border border-cyan-500/60 rounded-full flex items-center gap-2 shadow-lg shadow-cyan-950/50">
              <Focus className="h-3 w-3 text-cyan-400" />
              <span className="text-[11px] font-mono text-cyan-200">
                Inspecting Order {selectedOrderId.slice(0, 10)}
              </span>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="text-slate-400 hover:text-white ml-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Quick Keyboard shortcuts hint */}
          <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded text-[9px] text-slate-400 font-mono">
            [Space] Pause · [← / →] ±1s · [Shift+← / →] ±10s
          </div>
        </div>

        {/* ── Right Panel: Journey Inspector OR Event Diff Compare ────────── */}
        <div className="w-80 shrink-0 bg-slate-900/90 border-l border-slate-800 flex flex-col overflow-hidden">
          {diffModeOpen ? (
            /* Event Difference Mode (Part H) */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <GitCompare className="h-4 w-4" />
                  <span>State Difference Mode</span>
                </div>
                <button
                  onClick={() => setDiffModeOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Diff Controls */}
              <div className="p-3 bg-slate-850 border-b border-slate-800 space-y-2 text-[10px] font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">T1 (Before):</span>
                  <button
                    onClick={() => setDiffT1Ms(scrubberMs)}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700"
                  >
                    Set to Scrubber
                  </button>
                </div>
                <p className="text-slate-300 bg-slate-900 px-2 py-1 rounded">
                  {new Date(diffT1Ms).toLocaleTimeString()}
                </p>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-400">T2 (Scrubber):</span>
                  <span className="text-amber-300 font-bold">{formattedScrubberTime}</span>
                </div>
              </div>

              {/* Diff List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Snapshot Comparison Summary Card */}
                <div className="p-2.5 rounded-lg bg-slate-900 border border-amber-700/60 font-mono space-y-1.5 mb-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-amber-400 font-bold uppercase">Snapshot Comparison</span>
                    <span className="text-slate-500 text-[9px]">T1 vs T2</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="bg-slate-800/80 px-2 py-1 rounded flex items-center justify-between border border-slate-700">
                      <span className="text-slate-400">New orders:</span>
                      <span className="text-emerald-400 font-bold">+3</span>
                    </div>
                    <div className="bg-slate-800/80 px-2 py-1 rounded flex items-center justify-between border border-slate-700">
                      <span className="text-slate-400">Ready:</span>
                      <span className="text-sky-400 font-bold">+1</span>
                    </div>
                    <div className="bg-slate-800/80 px-2 py-1 rounded flex items-center justify-between border border-slate-700">
                      <span className="text-slate-400">Inventory deductions:</span>
                      <span className="text-teal-400 font-bold">+4</span>
                    </div>
                    <div className="bg-slate-800/80 px-2 py-1 rounded flex items-center justify-between border border-slate-700">
                      <span className="text-slate-400">Waiter calls:</span>
                      <span className="text-purple-400 font-bold">+2</span>
                    </div>
                  </div>
                </div>
                {diffItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No state delta between T1 and T2
                  </div>
                ) : (
                  diffItems.map((d, i) => (
                    <div
                      key={`${d.entity}_${i}`}
                      className={`p-2.5 rounded-lg border text-xs ${
                        d.highlight
                          ? 'bg-amber-950/20 border-amber-700/60'
                          : 'bg-slate-800/80 border-slate-700/60'
                      }`}
                    >
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                        {d.category} · {d.entity}
                      </p>
                      <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
                        <span className="text-rose-400 line-through opacity-80">{d.before}</span>
                        <ArrowRight className="h-3 w-3 text-slate-500 shrink-0" />
                        <span className="text-emerald-400 font-bold">{d.after}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Order Journey Inspector (Part F) */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="p-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  {selectedOrderId ? `Journey: ${selectedOrderId.slice(0, 12)}…` : 'Order Journey Inspector'}
                </span>
                {selectedOrderId && (
                  <button
                    onClick={() => setSelectedOrderId(null)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {!selectedOrderId ? (
                  <div className="text-center py-12 text-slate-500 text-xs px-4">
                    Click any order dot in the graph or select from Kitchen queue to view its complete 13-stage lifecycle trace.
                  </div>
                ) : selectedOrderEvents.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No recorded events for this order
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedOrderEvents.map((evt, idx) => {
                      const isPast = new Date(evt.created_at).getTime() <= scrubberMs;
                      return (
                        <div
                          key={evt.id || idx}
                          className={`p-2.5 rounded-lg border transition-all ${
                            isPast
                              ? 'bg-slate-800 border-cyan-800/80 text-slate-200'
                              : 'bg-slate-900/40 border-slate-800/50 text-slate-500 opacity-25'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-mono font-bold text-cyan-300">
                              {evt.event_type.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              {new Date(evt.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                            <span>Actor: {evt.actor_type || 'system'}</span>
                            {evt.duration_ms != null && (
                              <span>· {evt.duration_ms}ms</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Bar: CCTV Timeline Scrubber (Part B) ──────────────────── */}
      <div className="h-16 shrink-0 bg-slate-900 border-t border-slate-800 px-4 flex flex-col justify-center gap-1.5">
        {/* Playhead slider */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 w-16">
            {new Date(minTimeMs).toLocaleTimeString()}
          </span>

          <input
            type="range"
            min={minTimeMs}
            max={maxTimeMs}
            value={scrubberMs}
            onChange={e => handleSeekMs(Number(e.target.value))}
            className="flex-1 h-1.5 bg-slate-800 accent-cyan-400 rounded-lg cursor-pointer transition-all"
          />

          <span className="text-[10px] font-mono text-slate-400 w-16 text-right">
            {new Date(maxTimeMs).toLocaleTimeString()}
          </span>
        </div>

        {/* Playback Controls (-10s, -1s, Play/Pause, +1s, +10s, Speeds) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => stepSeconds(-10)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1"
              title="Step -10 seconds (Shift + Left)"
            >
              <Rewind className="h-3 w-3" /> -10s
            </button>
            <button
              onClick={() => stepSeconds(-1)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1"
              title="Step -1 second (Left)"
            >
              <SkipBack className="h-3 w-3" /> -1s
            </button>
            <button
              onClick={togglePlay}
              className={`px-3 py-1 rounded flex items-center gap-1.5 text-xs font-bold transition-all ${
                isPlaying
                  ? 'bg-amber-600 text-white shadow-sm shadow-amber-900'
                  : 'bg-cyan-600 text-white shadow-sm shadow-cyan-900'
              }`}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={() => stepSeconds(1)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1"
              title="Step +1 second (Right)"
            >
              +1s <SkipForward className="h-3 w-3" />
            </button>
            <button
              onClick={() => stepSeconds(10)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono flex items-center gap-1"
              title="Step +10 seconds (Shift + Right)"
            >
              +10s <FastForward className="h-3 w-3" />
            </button>
          </div>

          {/* Playback speed selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 rounded p-0.5 border border-slate-700/60">
            {[1, 2, 5].map(speed => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${bg}`}>
      <span className="text-[10px] text-slate-400">{label}:</span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
