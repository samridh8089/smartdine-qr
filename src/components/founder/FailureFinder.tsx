'use client';

/**
 * Phase-19: Founder Control Center — Failure Finder
 * Automatically detects anomalies in system_events.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, Info, RefreshCw } from 'lucide-react';
import type { SystemEvent, FailureAlert } from './types';

interface FailureFinderProps {
  restaurantId: string;
  events: SystemEvent[];
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function detectFailures(events: SystemEvent[]): FailureAlert[] {
  const alerts: FailureAlert[] = [];
  const now = new Date();

  // ── 1. Orders stuck in 'preparing' > 20 minutes ──────────────────────────
  const preparingEvents = events.filter(e => e.event_type === 'order_preparing');
  const readyEvents = new Set(
    events.filter(e => e.event_type === 'order_ready').map(e => e.correlation_id)
  );

  for (const evt of preparingEvents) {
    if (readyEvents.has(evt.correlation_id)) continue;
    const elapsed = (now.getTime() - new Date(evt.created_at).getTime()) / 60000;
    if (elapsed > 20) {
      alerts.push({
        id: generateId(),
        severity: 'high',
        issue: 'Order stuck in Preparing',
        affectedOrderId: evt.correlation_id,
        reason: `Order has been in Preparing state for ${Math.round(elapsed)} minutes with no Ready event.`,
        suggestedFix: 'Check kitchen KDS — order may have been lost. Mark as Ready or contact kitchen staff.',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // ── 2. Payment failures in the last hour ──────────────────────────────────
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const paymentFails = events.filter(
    e => e.event_type === 'payment_failed' && new Date(e.created_at) > oneHourAgo
  );

  if (paymentFails.length >= 2) {
    alerts.push({
      id: generateId(),
      severity: 'high',
      issue: 'Multiple Payment Failures',
      affectedOrderId: paymentFails[0]?.correlation_id,
      reason: `${paymentFails.length} payment failures in the last hour.`,
      suggestedFix: 'Check Razorpay dashboard. Ensure payment gateway credentials are valid.',
      detectedAt: new Date().toISOString(),
    });
  }

  // ── 3. Duplicate events (same correlation_id + event_type within 5s) ──────
  const eventsByKey = new Map<string, SystemEvent[]>();
  for (const evt of events) {
    const key = `${evt.correlation_id}_${evt.event_type}`;
    if (!eventsByKey.has(key)) eventsByKey.set(key, []);
    eventsByKey.get(key)!.push(evt);
  }

  for (const [key, evts] of eventsByKey) {
    if (evts.length < 2) continue;
    const sorted = evts.sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (let i = 1; i < sorted.length; i++) {
      const delta =
        (new Date(sorted[i].created_at).getTime() -
          new Date(sorted[i - 1].created_at).getTime()) / 1000;
      if (delta < 5) {
        alerts.push({
          id: generateId(),
          severity: 'medium',
          issue: 'Duplicate Event Detected',
          affectedOrderId: evts[0].correlation_id,
          reason: `Event "${evts[0].event_type}" fired ${evts.length} times within ${Math.round(delta)}s.`,
          suggestedFix: 'Check idempotency logic in the API route. May cause double inventory deduction.',
          detectedAt: new Date().toISOString(),
        });
        break;
      }
    }
  }

  // ── 4. Push failures ─────────────────────────────────────────────────────
  const pushFails = events.filter(e => e.event_type === 'push_failed');
  if (pushFails.length > 0) {
    alerts.push({
      id: generateId(),
      severity: 'medium',
      issue: 'Push Notification Failures',
      affectedOrderId: pushFails[0]?.correlation_id,
      reason: `${pushFails.length} push notification(s) failed to deliver.`,
      suggestedFix: 'Check FCM credentials and device token registration. Staff may have been offline.',
      detectedAt: new Date().toISOString(),
    });
  }

  // Deduplicate by issue + orderId
  const seen = new Set<string>();
  return alerts.filter(a => {
    const key = `${a.issue}_${a.affectedOrderId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const SEVERITY_CONFIG = {
  high: {
    icon: ShieldAlert,
    border: 'border-rose-700/60',
    bg: 'bg-rose-950/30',
    badge: 'bg-rose-900/60 text-rose-300 border-rose-700/50',
    text: 'text-rose-300',
  },
  medium: {
    icon: AlertTriangle,
    border: 'border-amber-700/60',
    bg: 'bg-amber-950/20',
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    text: 'text-amber-300',
  },
  low: {
    icon: Info,
    border: 'border-blue-700/60',
    bg: 'bg-blue-950/20',
    badge: 'bg-blue-900/60 text-blue-300 border-blue-700/50',
    text: 'text-blue-300',
  },
} as const;

export default function FailureFinder({ restaurantId, events }: FailureFinderProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [lastScan, setLastScan] = useState<Date>(new Date());

  const handleDismiss = useCallback((id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleRescan = useCallback(() => {
    setLastScan(new Date());
    setDismissed(new Set());
  }, []);

  const alerts = useMemo(() => detectFailures(events), [events, lastScan]);
  const visibleAlerts = useMemo(
    () => alerts.filter(a => !dismissed.has(a.id)),
    [alerts, dismissed]
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">Failure Finder</h3>
          {visibleAlerts.length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-900/60 text-rose-300 border border-rose-700/50 rounded-full text-[9px] font-bold">
              {visibleAlerts.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRescan}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Re-scan for failures"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {visibleAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-900/30 border border-emerald-700/50 flex items-center justify-center">
              <span className="text-lg">✅</span>
            </div>
            <p className="text-emerald-400 text-xs font-medium">No issues detected</p>
            <p className="text-slate-500 text-[10px] text-center">
              System is running normally based on {events.length} event{events.length !== 1 ? 's' : ''} analyzed.
            </p>
          </div>
        ) : (
          visibleAlerts.map(alert => {
            const cfg = SEVERITY_CONFIG[alert.severity];
            const Icon = cfg.icon;
            const isExpanded = expanded.has(alert.id);

            return (
              <div key={alert.id} className={`rounded-lg border ${cfg.border} ${cfg.bg}`}>
                <div
                  className="flex items-start gap-3 p-3 cursor-pointer"
                  onClick={() => handleToggle(alert.id)}
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${cfg.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className={`text-xs font-semibold ${cfg.text}`}>{alert.issue}</p>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    {alert.affectedOrderId && (
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">
                        ID: {alert.affectedOrderId.slice(0, 14)}…
                      </p>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 space-y-2 border-t border-slate-800 pt-2">
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Reason</p>
                      <p className="text-[11px] text-slate-300">{alert.reason}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mb-1">Suggested Fix</p>
                      <p className="text-[11px] text-emerald-300">{alert.suggestedFix}</p>
                    </div>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="text-[10px] text-slate-500 hover:text-slate-300 mt-1"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-800 shrink-0">
        <p className="text-[9px] text-slate-600">
          Last scan: {lastScan.toLocaleTimeString()} · {events.length} events analyzed
        </p>
      </div>
    </div>
  );
}
