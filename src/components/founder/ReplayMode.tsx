'use client';

/**
 * Phase-21: Founder Control Center — Replay Mode
 * CCTV-style event replay with time range selector, interactive scrubber, and playback speeds.
 * Auto-loads events on mount. Replay animation traverses order stages.
 * Strict React Hook Safety Guardrail compliant.
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Play, Pause, SkipBack, Calendar, Clock, Film } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EVENT_TO_NODE } from './NodeDefinitions';
import type { SystemEvent, OrderDotState, ReplayRange, ReplaySpeed } from './types';

const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

interface ReplayModeProps {
  restaurantId: string;
  initialEvents?: SystemEvent[];
}

function getRangeStart(range: ReplayRange, customStart?: string): Date {
  const now = new Date();
  switch (range) {
    case '5min':  return new Date(now.getTime() - 5 * 60 * 1000);
    case '15min': return new Date(now.getTime() - 15 * 60 * 1000);
    case '1hour': return new Date(now.getTime() - 60 * 60 * 1000);
    case 'today': { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    case 'custom': return customStart ? new Date(customStart) : new Date(now.getTime() - 60 * 60 * 1000);
    default: return new Date(now.getTime() - 15 * 60 * 1000);
  }
}

export default function ReplayMode({ restaurantId, initialEvents }: ReplayModeProps) {
  // ─── 1. useState (Rule 1: Strict Hook Declaration Order) ──────────────────
  const [containerSize, setContainerSize] = useState({ width: 800, height: 500 });
  const [selectedRange, setSelectedRange] = useState<ReplayRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [events, setEvents] = useState<SystemEvent[]>(() =>
    initialEvents && initialEvents.length > 0 ? initialEvents : []
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  // ─── 2. useRef ───────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── 3. useMemo ──────────────────────────────────────────────────────────
  // Build replay dots from events up to currentIdx
  const replayDots = useMemo<OrderDotState[]>(() => {
    if (!events.length) return [];
    const eventsUpTo = events.slice(0, currentIdx + 1);
    const DOT_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    const colorMap = new Map<string, string>();
    let colorIdx = 0;
    const latestPerCorr = new Map<string, SystemEvent>();
    for (const e of eventsUpTo) {
      latestPerCorr.set(e.correlation_id, e);
      if (!colorMap.has(e.correlation_id)) {
        colorMap.set(e.correlation_id, DOT_COLORS[colorIdx++ % DOT_COLORS.length]);
      }
    }
    return Array.from(latestPerCorr.values())
      .filter((e) => {
        const n = e.target_node || EVENT_TO_NODE[e.event_type];
        return n && n !== 'session_closed';
      })
      .map((e) => ({
        orderId: e.order_id || e.correlation_id,
        correlationId: e.correlation_id,
        shortId: e.correlation_id.replace('corr_', '').slice(0, 6),
        currentNodeId: e.target_node || EVENT_TO_NODE[e.event_type] || 'order_created',
        color: colorMap.get(e.correlation_id) || '#10b981',
        lastEventAt: e.created_at,
      }));
  }, [events, currentIdx]);

  const currentEvent = useMemo(() => events[currentIdx] ?? null, [events, currentIdx]);
  const progressPercent = useMemo(
    () => (events.length > 1 ? (currentIdx / (events.length - 1)) * 100 : 0),
    [events.length, currentIdx]
  );

  // ─── 4. useCallback ──────────────────────────────────────────────────────
  const loadEvents = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setIsPlaying(false);
    setCurrentIdx(0);
    try {
      const from = getRangeStart(selectedRange, customStart);
      const to = selectedRange === 'custom' && customEnd ? new Date(customEnd) : new Date();

      const { data } = await supabase
        .from('system_events')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', from.toISOString())
        .lte('created_at', to.toISOString())
        .order('created_at', { ascending: true })
        .limit(500);

      setEvents((data || []) as SystemEvent[]);
    } catch (e) {
      console.warn('[ReplayMode] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, selectedRange, customStart, customEnd]);

  const handleScrubberChange = useCallback((newIdx: number) => {
    setCurrentIdx(newIdx);
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentIdx(0);
    setIsPlaying(false);
  }, []);

  // ─── 5. useEffect ────────────────────────────────────────────────────────
  // Resize container observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const e = entries[0];
      if (e) setContainerSize({ width: e.contentRect.width, height: e.contentRect.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // AUTO-LOAD on mount so Replay Mode is never empty
  useEffect(() => {
    if (initialEvents && initialEvents.length > 0) {
      setEvents(initialEvents);
    } else {
      loadEvents();
    }
  }, [loadEvents, initialEvents]);

  // Replay playback ticker
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || events.length === 0) return;

    const delay = Math.round(400 / speed);
    intervalRef.current = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= events.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, delay);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speed, events.length]);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const RANGE_LABELS: Record<ReplayRange, string> = {
    '5min': 'Last 5 min',
    '15min': 'Last 15 min',
    '1hour': 'Last hour',
    today: 'Today',
    custom: 'Custom',
  };
  const SPEED_OPTIONS: ReplaySpeed[] = [1, 2, 5];

  // ─── Render (Unconditional hook execution guaranteed) ─────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-950 select-none">
      {/* Controls Bar */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Range Selector */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-purple-950/40 border border-purple-800/60 px-2.5 py-1 rounded-lg text-purple-300 mr-2">
            <Film className="h-3.5 w-3.5 animate-pulse text-purple-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wide">CCTV Replay</span>
          </div>

          {(['5min', '15min', '1hour', 'today', 'custom'] as ReplayRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRange(r)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors cursor-pointer
                ${
                  selectedRange === r
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}

          {selectedRange === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <input
                type="datetime-local"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300"
              />
              <span className="text-slate-600 text-xs">→</span>
              <input
                type="datetime-local"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300"
              />
            </div>
          )}

          <button
            onClick={loadEvents}
            disabled={loading}
            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white text-[10px] font-medium rounded disabled:opacity-50 ml-1 cursor-pointer"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {/* Right: Playback Speed + Transport Controls */}
        <div className="flex items-center gap-2">
          {/* Speed Buttons */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded border border-slate-700">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors
                  ${
                    speed === s
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
            title="Rewind to start"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          {/* Play/Pause Button */}
          <button
            data-testid="btn-replay-play-pause"
            onClick={handleTogglePlay}
            disabled={events.length === 0}
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-600 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold disabled:opacity-40 shadow-md shadow-purple-900/40 cursor-pointer transition-all"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Progress & Scrubber Bar */}
      <div className="shrink-0 bg-slate-900/95 px-4 py-2 border-b border-slate-800 flex items-center gap-3 font-mono">
        <div className="flex items-center gap-1 text-[10px] text-purple-300 w-28 shrink-0">
          <Clock className="h-3 w-3 text-purple-400" />
          <span>
            {currentEvent
              ? new Date(currentEvent.created_at).toLocaleTimeString()
              : '--:--:--'}
          </span>
        </div>

        {/* Interactive Scrubbing Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(0, events.length - 1)}
          value={currentIdx}
          onChange={(e) => handleScrubberChange(Number(e.target.value))}
          disabled={events.length === 0}
          className="flex-1 h-1.5 bg-slate-800 accent-purple-500 rounded-lg cursor-pointer transition-all disabled:opacity-30"
        />

        <span className="text-[10px] text-slate-400 w-32 text-right shrink-0">
          {events.length > 0 ? `${currentIdx + 1} / ${events.length} events` : '0 events'}
        </span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-950">
        {events.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
            <Play className="h-10 w-10 opacity-30" />
            <p className="text-sm font-mono">No historical events recorded for this range</p>
          </div>
        ) : (
          containerSize.width > 100 && (
            <GraphCanvas
              containerWidth={containerSize.width}
              containerHeight={containerSize.height}
              orderDots={replayDots}
              events={events.slice(0, currentIdx + 1)}
              followingOrderId={null}
              onNodeClick={() => {}}
              onDotClick={() => {}}
            />
          )
        )}

        {/* Current Traversed Stage Overlay */}
        {currentEvent && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-purple-950/90 border border-purple-500/60 rounded-full text-xs text-purple-200 font-mono shadow-lg shadow-purple-950/80 flex items-center gap-2 animate-in fade-in">
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
            <span className="font-bold uppercase tracking-wider">
              {currentEvent.event_type.replace(/_/g, ' ')}
            </span>
            <span className="text-purple-400/80 text-[10px]">
              · {replayDots.length} active order{replayDots.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
