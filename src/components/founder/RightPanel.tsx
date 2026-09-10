'use client';

/**
 * Phase-19: Founder Control Center — Right Panel
 * Three-tab panel: Timeline | Inspector | Flight Recorder
 */

import {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from 'react';
import { X, Clock, Search, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import type { SystemEvent, OrderDotState, NodeInspectorData } from '@/components/founder/types';
import { GRAPH_NODES, EVENT_TO_NODE } from '@/components/founder/NodeDefinitions';

// ─── Props ────────────────────────────────────────────────────────────────────

interface RightPanelProps {
  events: SystemEvent[];
  selectedNodeId: string | null;
  selectedDot: OrderDotState | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TabId = 'timeline' | 'inspector' | 'flight';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function truncate(s: string | undefined, len: number): string {
  if (!s) return '—';
  return s.length > len ? s.slice(0, len) + '…' : s;
}

const EVENT_BADGE_COLOR: Record<string, string> = {
  order_created:      'bg-emerald-700 text-emerald-100',
  order_accepted:     'bg-blue-700 text-blue-100',
  order_preparing:    'bg-amber-700 text-amber-100',
  order_ready:        'bg-sky-700 text-sky-100',
  waiter_assigned:    'bg-purple-700 text-purple-100',
  order_served:       'bg-violet-700 text-violet-100',
  bill_closed:        'bg-cyan-700 text-cyan-100',
  payment_success:    'bg-green-700 text-green-100',
  payment_failed:     'bg-red-700 text-red-100',
  session_closed:     'bg-slate-700 text-slate-100',
  push_sent:          'bg-teal-700 text-teal-100',
  push_failed:        'bg-red-700 text-red-100',
  inventory_reserved: 'bg-teal-700 text-teal-100',
  inventory_deducted: 'bg-teal-800 text-teal-100',
  audit_written:      'bg-fuchsia-800 text-fuchsia-100',
  report_generated:   'bg-indigo-700 text-indigo-100',
};

function badgeClass(eventType: string): string {
  return EVENT_BADGE_COLOR[eventType] ?? 'bg-slate-600 text-slate-100';
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 200;

interface TimelineTabProps {
  events: SystemEvent[];
}

function TimelineTab({ events }: TimelineTabProps) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible = useMemo(
    () => events.slice(0, page * PAGE_SIZE),
    [events, page]
  );
  const hasMore = visible.length < events.length;

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {visible.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            No events yet
          </div>
        )}
        {visible.map((ev) => {
          const expanded = expandedId === ev.id;
          return (
            <div key={ev.id} className="group">
              <button
                onClick={() => toggleExpand(ev.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-800/60 transition-colors"
              >
                <span className="text-[10px] font-mono text-slate-500 shrink-0 w-16">
                  {fmtTime(ev.created_at)}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${badgeClass(ev.event_type)}`}
                >
                  {ev.event_type}
                </span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {truncate(ev.correlation_id, 8)}
                </span>
                {ev.order_id && (
                  <span className="text-[10px] text-slate-500 shrink-0">
                    #{truncate(ev.order_id, 8)}
                  </span>
                )}
                <span className="ml-auto text-slate-600">
                  {expanded
                    ? <ChevronDown className="w-3 h-3" />
                    : <ChevronRight className="w-3 h-3" />}
                </span>
              </button>
              {expanded && (
                <div className="px-3 pb-3 bg-slate-900/60">
                  <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap break-all bg-slate-800 rounded p-2 mt-1">
                    {JSON.stringify(
                      {
                        id: ev.id,
                        correlation_id: ev.correlation_id,
                        order_id: ev.order_id,
                        actor_type: ev.actor_type,
                        actor_id: ev.actor_id,
                        source_node: ev.source_node,
                        target_node: ev.target_node,
                        duration_ms: ev.duration_ms,
                        metadata: ev.metadata,
                        created_at: ev.created_at,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div className="shrink-0 px-3 py-2 border-t border-slate-800">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="w-full text-xs text-sky-400 hover:text-sky-300 py-1 hover:bg-slate-800 rounded transition-colors"
          >
            Load more ({events.length - visible.length} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Inspector Tab ────────────────────────────────────────────────────────────

interface InspectorTabProps {
  selectedNodeId: string | null;
  events: SystemEvent[];
}

function InspectorTab({ selectedNodeId, events }: InspectorTabProps) {
  // ── 1. useState ──
  const [internalNodeId, setInternalNodeId] = useState<string>('reports');

  // ── 3. useMemo ──
  const activeNodeId = useMemo(
    () => selectedNodeId || internalNodeId || 'reports',
    [selectedNodeId, internalNodeId]
  );

  const nodeData = useMemo<NodeInspectorData | null>(() => {
    const graphNode = GRAPH_NODES.find((n) => n.id === activeNodeId);
    if (!graphNode) return null;

    // Events whose target_node or mapped event_type matches this node
    const nodeEvents = events
      .filter((ev) => {
        const mapped = EVENT_TO_NODE[ev.event_type];
        return ev.target_node === activeNodeId || mapped === activeNodeId;
      })
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const recentEvents = nodeEvents.slice(0, 10);

    // Current queue: count unique correlation_ids in last 5 min at this node
    const activeCorrIds = new Set<string>();
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    for (const ev of nodeEvents) {
      if (ev.created_at >= fiveMinAgo) {
        activeCorrIds.add(ev.correlation_id);
      }
    }

    const lastEvent = nodeEvents[0];

    // Average duration
    const durEvents = nodeEvents.filter((ev) => ev.duration_ms !== undefined);
    const avgDurationMs =
      durEvents.length > 0
        ? Math.round(
            durEvents.reduce((sum, ev) => sum + (ev.duration_ms ?? 0), 0) /
              durEvents.length
          )
        : undefined;

    // Error events
    const errors = nodeEvents.filter(
      (ev) => ev.event_type.includes('failed') || ev.event_type.includes('cancelled')
    );

    const connectedNodes: string[] = [];
    return {
      nodeId: activeNodeId,
      label: graphNode.label,
      currentQueue: activeCorrIds.size,
      lastEventAt: lastEvent?.created_at,
      avgDurationMs,
      recentEvents,
      connectedNodes,
      errors,
    };
  }, [activeNodeId, events]);

  // ── 5. useEffect ──
  useEffect(() => {
    if (selectedNodeId) {
      setInternalNodeId(selectedNodeId);
    }
  }, [selectedNodeId]);

  // ── Render (all hooks unconditionally executed) ──
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Node selector dropdown */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Node:</span>
        <select
          value={activeNodeId}
          onChange={(e) => setInternalNodeId(e.target.value)}
          className="bg-slate-900 text-xs text-sky-400 font-semibold rounded border border-slate-700 px-2 py-1 focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          {GRAPH_NODES.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}
            </option>
          ))}
        </select>
      </div>

      {!nodeData ? (
        <div className="flex items-center justify-center flex-1 text-slate-500 text-sm">
          Node not found: {activeNodeId}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
          {/* Node header */}
          <div className="px-4 py-3 bg-slate-800/40">
            <h3 className="text-sm font-semibold text-slate-100">{nodeData.label}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {GRAPH_NODES.find((n) => n.id === nodeData.nodeId)?.description ?? ''}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-slate-800">
            <Stat label="Queue (5m)" value={String(nodeData.currentQueue)} />
            <Stat
              label="Last Event"
              value={nodeData.lastEventAt ? relativeTime(nodeData.lastEventAt) : '—'}
            />
            <Stat
              label="Avg Duration"
              value={nodeData.avgDurationMs != null ? `${nodeData.avgDurationMs}ms` : '—'}
            />
          </div>

          {/* Errors */}
          {nodeData.errors.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-[10px] font-semibold text-red-400 mb-1">
                ⚠ {nodeData.errors.length} error event{nodeData.errors.length !== 1 ? 's' : ''}
              </p>
              {nodeData.errors.slice(0, 3).map((ev) => (
                <div key={ev.id} className="text-[10px] text-slate-400 py-0.5">
                  {fmtTime(ev.created_at)} · {ev.event_type} · corr={truncate(ev.correlation_id, 8)}
                </div>
              ))}
            </div>
          )}

          {/* Recent events */}
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Recent Events (last 10)
            </p>
            {nodeData.recentEvents.length === 0 ? (
              <p className="text-[11px] text-slate-500">No events</p>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {nodeData.recentEvents.map((ev) => (
                  <div key={ev.id} className="py-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 w-16 shrink-0">
                      {fmtTime(ev.created_at)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${badgeClass(ev.event_type)}`}>
                      {ev.event_type}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-auto font-mono">
                      {truncate(ev.correlation_id, 8)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 flex flex-col gap-0.5">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

// ─── Flight Recorder Tab ──────────────────────────────────────────────────────

interface FlightRecorderTabProps {
  selectedDot: OrderDotState | null;
  events: SystemEvent[];
}

function FlightRecorderTab({ selectedDot, events }: FlightRecorderTabProps) {
  // ── 1. useState ──
  const [selectedCorrId, setSelectedCorrId] = useState<string | null>(() => selectedDot?.correlationId || null);

  // ── 2. useRef ──
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── 3. useMemo ──
  const distinctCorrelations = useMemo(() => {
    const map = new Map<string, { correlationId: string; orderId?: string; lastEvent: string; time: string }>();
    for (const ev of events) {
      if (!map.has(ev.correlation_id)) {
        map.set(ev.correlation_id, {
          correlationId: ev.correlation_id,
          orderId: ev.order_id,
          lastEvent: ev.event_type,
          time: ev.created_at,
        });
      }
    }
    return Array.from(map.values()).slice(0, 30);
  }, [events]);

  const effectiveCorrId = useMemo(
    () => selectedCorrId || selectedDot?.correlationId || (distinctCorrelations[0]?.correlationId ?? null),
    [selectedCorrId, selectedDot, distinctCorrelations]
  );

  const journey = useMemo<SystemEvent[]>(() => {
    if (!effectiveCorrId) return [];
    return events
      .filter((ev) => ev.correlation_id === effectiveCorrId)
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [effectiveCorrId, events]);

  const activeDotInfo = useMemo(() => {
    if (selectedDot && selectedDot.correlationId === effectiveCorrId) {
      return selectedDot;
    }
    const match = distinctCorrelations.find((c) => c.correlationId === effectiveCorrId);
    const lastEv = journey[journey.length - 1];
    return {
      orderId: match?.orderId || lastEv?.order_id,
      correlationId: effectiveCorrId || '',
      currentNodeId: lastEv?.target_node || 'session_closed',
      color: '#38bdf8',
    };
  }, [selectedDot, effectiveCorrId, distinctCorrelations, journey]);

  // ── 5. useEffect ──
  useEffect(() => {
    if (selectedDot?.correlationId) {
      setSelectedCorrId(selectedDot.correlationId);
    }
  }, [selectedDot]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [journey]);

  // ── Render (all hooks unconditionally executed) ──
  if (!effectiveCorrId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
        <Clock className="w-8 h-8 opacity-30" />
        <p className="text-sm">Click an order dot to open Flight Recorder</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Selector Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-700">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Journey:</span>
        <select
          value={effectiveCorrId}
          onChange={(e) => setSelectedCorrId(e.target.value)}
          className="bg-slate-900 text-[11px] text-sky-400 font-mono rounded border border-slate-700 px-2 py-0.5 max-w-[200px] truncate focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          {distinctCorrelations.map((c) => (
            <option key={c.correlationId} value={c.correlationId}>
              {truncate(c.correlationId, 12)} ({c.lastEvent})
            </option>
          ))}
        </select>
      </div>

      {/* Header */}
      <div className="shrink-0 px-3 py-2 bg-slate-800/40 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: activeDotInfo.color }}
          />
          <span className="text-[11px] font-mono text-slate-300">
            {effectiveCorrId}
          </span>
          {activeDotInfo.orderId && (
            <span className="text-[10px] text-slate-500">Order #{truncate(activeDotInfo.orderId, 8)}</span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">
          {journey.length} events · Status:{' '}
          <span className="text-slate-300 font-medium">{activeDotInfo.currentNodeId}</span>
        </p>
      </div>

      {/* Journey steps */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {journey.length === 0 ? (
          <p className="text-slate-500 text-sm text-center mt-8">No events found</p>
        ) : (
          <ol className="relative border-l border-slate-700 ml-2 space-y-0">
            {journey.map((ev, idx) => (
              <li key={ev.id} className="ml-4 pb-4 relative">
                {/* Dot on the timeline */}
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-600 border-2 border-slate-900" />

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[10px] font-mono text-slate-500">
                    {fmtTime(ev.created_at)}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClass(ev.event_type)}`}>
                    {ev.event_type}
                  </span>
                  {ev.duration_ms !== undefined && (
                    <span className="text-[10px] text-slate-500">{ev.duration_ms}ms</span>
                  )}
                </div>

                {/* source → target */}
                {(ev.source_node || ev.target_node) && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {ev.source_node && (
                      <span className="text-[10px] text-slate-500">{ev.source_node}</span>
                    )}
                    {ev.source_node && ev.target_node && (
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                    )}
                    {ev.target_node && (
                      <span className="text-[10px] text-slate-400">{ev.target_node}</span>
                    )}
                  </div>
                )}

                {/* Actor */}
                {ev.actor_type && (
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    Actor: {ev.actor_type}
                    {ev.actor_id ? ` (${truncate(ev.actor_id, 12)})` : ''}
                  </p>
                )}

                {/* Latest marker */}
                {idx === journey.length - 1 && (
                  <span className="text-[10px] font-semibold text-emerald-400 ml-0">← current</span>
                )}
              </li>
            ))}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'flight', label: 'Flight Recorder' },
];

export default function RightPanel({
  events,
  selectedNodeId,
  selectedDot,
  onClose,
}: RightPanelProps) {
  // ── Hooks — ALL before any conditional return ──────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (selectedDot) return 'flight';
    if (selectedNodeId) return 'inspector';
    return 'timeline';
  });

  // Auto-switch to relevant tab when selection changes
  useEffect(() => {
    if (selectedDot) setActiveTab('flight');
  }, [selectedDot]);

  useEffect(() => {
    if (selectedNodeId) setActiveTab('inspector');
  }, [selectedNodeId]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700/60 w-80 min-w-0 shrink-0">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-700/60 bg-slate-800/40">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'timeline' && <TimelineTab events={events} />}
        {activeTab === 'inspector' && (
          <InspectorTab selectedNodeId={selectedNodeId} events={events} />
        )}
        {activeTab === 'flight' && (
          <FlightRecorderTab selectedDot={selectedDot} events={events} />
        )}
      </div>
    </div>
  );
}
