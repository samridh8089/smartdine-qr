'use client';

/**
 * Phase-19: Founder Control Center — Customer Call Trace
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Phone, Clock, CheckCircle2, User } from 'lucide-react';

interface CallEvent {
  id: string;
  tableId: string;
  tableName: string;
  requestType: string;
  status: string;
  assignedWaiter?: string;
  createdAt: string;
  resolvedAt?: string;
  elapsedSeconds: number;
}

interface CustomerCallTraceProps {
  restaurantId: string;
}

function formatSeconds(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export default function CustomerCallTrace({ restaurantId }: CustomerCallTraceProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [calls, setCalls] = useState<CallEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCalls = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data } = await supabase
        .from('customer_requests')
        .select(`
          id, table_id, request_type, status, created_at, resolved_at,
          assigned_waiter_id,
          table:tables!customer_requests_table_id_fkey(name),
          waiter:profiles!customer_requests_assigned_waiter_id_fkey(full_name)
        `)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(30);

      const now = new Date();
      const events: CallEvent[] = (data || []).map((c: any) => {
        const createdAt = new Date(c.created_at);
        const resolvedAt = c.resolved_at ? new Date(c.resolved_at) : null;
        const elapsed = resolvedAt
          ? (resolvedAt.getTime() - createdAt.getTime()) / 1000
          : (now.getTime() - createdAt.getTime()) / 1000;
        return {
          id: c.id,
          tableId: c.table_id,
          tableName: c.table?.name || 'Table',
          requestType: c.request_type || 'call_waiter',
          status: c.status || 'pending',
          assignedWaiter: c.waiter?.full_name,
          createdAt: c.created_at,
          resolvedAt: c.resolved_at,
          elapsedSeconds: elapsed,
        };
      });

      setCalls(events);
    } catch (e) {
      console.warn('[CustomerCallTrace] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadCalls();
    // Subscribe to realtime customer_requests changes
    const channel = supabase
      .channel(`founder_calls_${restaurantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_requests', filter: `restaurant_id=eq.${restaurantId}` },
        () => { loadCalls(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, loadCalls]);

  const pendingCount = useMemo(() => calls.filter(c => c.status === 'pending').length, [calls]);

  const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'text-amber-400 bg-amber-900/30 border-amber-700/40', label: 'Pending' },
    accepted: { color: 'text-blue-400 bg-blue-900/30 border-blue-700/40', label: 'Accepted' },
    resolved: { color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/40', label: 'Resolved' },
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Phone className="h-4 w-4 text-amber-400" />
          Customer Calls
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-900/50 text-amber-400 border border-amber-700/50 rounded-full text-[9px] font-bold">
              {pendingCount}
            </span>
          )}
        </h3>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : calls.length === 0 ? (
        <p className="text-slate-500 text-xs text-center py-4">No customer calls</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {calls.map(call => {
            const cfg = statusConfig[call.status] || statusConfig.pending;
            return (
              <div
                key={call.id}
                className={`flex items-start gap-3 p-2.5 rounded-lg border ${cfg.color}`}
              >
                <div className="shrink-0 mt-0.5">
                  {call.status === 'resolved' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{call.tableName}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/20">
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {call.assignedWaiter && (
                      <span className="text-[9px] flex items-center gap-1 opacity-70">
                        <User className="h-2.5 w-2.5" />
                        {call.assignedWaiter}
                      </span>
                    )}
                    <span className="text-[9px] flex items-center gap-1 opacity-70">
                      <Clock className="h-2.5 w-2.5" />
                      {formatSeconds(call.elapsedSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
