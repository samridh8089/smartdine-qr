'use client';

/**
 * Phase-19: Founder Control Center — Debug Mode
 * Per-node debugging panel: API endpoint, response time, error count, last error.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, Clock, Zap, Activity } from 'lucide-react';
import { GRAPH_NODES } from './NodeDefinitions';
import type { SystemEvent } from './types';

const NODE_API: Record<string, string> = {
  qr_scan: '/api/customer/menu',
  customer_menu: '/api/customer/menu',
  cart: '(client state)',
  checkout: '/api/customer/orders',
  order_created: '/api/customer/orders',
  live_orders: '/api/staff/update-order-status',
  kitchen_queue: '/api/staff/update-order-status',
  preparing: '/api/staff/update-order-status',
  ready: '/api/staff/update-order-status',
  waiter_assigned: '/api/staff/assign-waiter',
  served: '/api/staff/update-order-status',
  billing: '/api/payments/create-order',
  payment: '/api/payments/verify',
  session_closed: '/api/staff/update-order-status',
  inventory: '/api/inventory/*',
  customer_calls: '/api/customer/request',
  push_notifications: 'FCM push',
  audit_logs: '/api/audit',
  reports: '/api/reports/*',
};

interface DebugModeProps {
  restaurantId: string;
  events: SystemEvent[];
}

export default function DebugMode({ restaurantId, events }: DebugModeProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  const toggleNode = useCallback((id: string) => {
    setExpandedNodeId(prev => prev === id ? null : id);
  }, []);

  // Per-node stats derived from events
  const nodeStats = useMemo(() => {
    const stats: Record<string, {
      eventCount: number;
      avgDurationMs: number;
      errorCount: number;
      lastEventAt: string | null;
      recentErrors: SystemEvent[];
    }> = {};

    for (const node of GRAPH_NODES) {
      const nodeEvents = events.filter(e => e.target_node === node.id || e.source_node === node.id);
      const withDuration = nodeEvents.filter(e => e.duration_ms != null);
      const avgDuration = withDuration.length > 0
        ? withDuration.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / withDuration.length
        : 0;
      const errors = nodeEvents.filter(e => {
        const meta = e.metadata as Record<string, unknown> | undefined;
        return meta?.error || e.event_type.includes('failed') || e.event_type.includes('error');
      });
      const sorted = [...nodeEvents].sort((a, b) => b.created_at.localeCompare(a.created_at));

      stats[node.id] = {
        eventCount: nodeEvents.length,
        avgDurationMs: Math.round(avgDuration),
        errorCount: errors.length,
        lastEventAt: sorted[0]?.created_at || null,
        recentErrors: errors.slice(0, 3),
      };
    }
    return stats;
  }, [events]);

  function relativeTime(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return `${Math.round(diff)}s ago`;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return `${Math.round(diff / 3600)}h ago`;
  }

  const mainNodes = GRAPH_NODES.filter(n => n.type === 'main');
  const sideNodes = GRAPH_NODES.filter(n => n.type === 'side');

  function NodeCard({ node }: { node: typeof GRAPH_NODES[0] }) {
    const s = nodeStats[node.id] || { eventCount: 0, avgDurationMs: 0, errorCount: 0, lastEventAt: null, recentErrors: [] };
    const isExpanded = expandedNodeId === node.id;
    const hasErrors = s.errorCount > 0;

    return (
      <div className={`rounded-lg border overflow-hidden transition-colors
        ${hasErrors ? 'border-rose-700/50' : 'border-slate-700'}`}
      >
        <button
          onClick={() => toggleNode(node.id)}
          className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-750 text-left"
        >
          <div
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: node.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-100">{node.label}</p>
            <p className="text-[9px] font-mono text-slate-500 truncate">{NODE_API[node.id] || '—'}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {s.avgDurationMs > 0 && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded
                ${s.avgDurationMs < 200 ? 'text-emerald-400 bg-emerald-900/30'
                  : s.avgDurationMs < 500 ? 'text-amber-400 bg-amber-900/30'
                  : 'text-rose-400 bg-rose-900/30'}`}>
                {s.avgDurationMs}ms
              </span>
            )}
            {hasErrors && (
              <span className="flex items-center gap-0.5 text-[9px] text-rose-400">
                <AlertCircle className="h-3 w-3" />
                {s.errorCount}
              </span>
            )}
            <span className="text-[9px] text-slate-600">{s.eventCount}</span>
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 py-3 bg-slate-900 border-t border-slate-700 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-xs font-bold text-blue-400">{s.eventCount}</p>
                <p className="text-[9px] text-slate-500">Events</p>
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold ${s.avgDurationMs > 500 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {s.avgDurationMs > 0 ? `${s.avgDurationMs}ms` : '—'}
                </p>
                <p className="text-[9px] text-slate-500">Avg Time</p>
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold ${s.errorCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {s.errorCount}
                </p>
                <p className="text-[9px] text-slate-500">Errors</p>
              </div>
            </div>

            {s.lastEventAt && (
              <p className="text-[9px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last activity: {relativeTime(s.lastEventAt)}
              </p>
            )}

            {s.recentErrors.length > 0 && (
              <div>
                <p className="text-[9px] text-rose-400 font-semibold uppercase tracking-wide mb-1.5">Recent Errors</p>
                {s.recentErrors.map(err => (
                  <div key={err.id} className="bg-rose-950/30 border border-rose-700/40 rounded px-2.5 py-1.5 mb-1">
                    <p className="text-[10px] font-mono text-rose-300">{err.event_type}</p>
                    <p className="text-[9px] text-slate-500">{relativeTime(err.created_at)}</p>
                  </div>
                ))}
              </div>
            )}

            {s.recentErrors.length === 0 && (
              <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                <Zap className="h-3 w-3" /> No errors detected
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-slate-100">Debug Panel</h2>
          <span className="text-[10px] text-slate-500">Based on {events.length} events in memory</span>
        </div>

        {/* Main pipeline nodes */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">Main Pipeline</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {mainNodes.map(node => <NodeCard key={node.id} node={node} />)}
          </div>
        </div>

        {/* Side nodes */}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-medium mb-2">Side Systems</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sideNodes.map(node => <NodeCard key={node.id} node={node} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
