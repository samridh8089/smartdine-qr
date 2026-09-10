'use client';

/**
 * Phase-19: Founder Control Center — Waiter Live View
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Clock, Phone, AlertCircle, RefreshCw } from 'lucide-react';

interface WaiterStat {
  waiterId: string;
  waiterName: string;
  zone: string;
  currentTables: string[];
  pendingCalls: number;
  avgResponseMs: number;
  status: 'active' | 'idle';
}

interface WaiterViewProps {
  restaurantId: string;
}

export default function WaiterView({ restaurantId }: WaiterViewProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [waiters, setWaiters] = useState<WaiterStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadWaiters = useCallback(async () => {
    if (!restaurantId) return;
    try {
      // Get active table assignments with waiter profiles
      const { data: assignments } = await supabase
        .from('table_assignments')
        .select(`
          id, waiter_id, table_id, active,
          waiter:profiles!table_assignments_waiter_id_fkey(id, full_name, department),
          table:tables!table_assignments_table_id_fkey(id, name)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      // Get active orders per table
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id, table_id, status')
        .eq('restaurant_id', restaurantId)
        .in('status', ['new', 'accepted', 'preparing', 'ready', 'served'])
        .is('table_id', null);

      // Get pending customer calls
      const { data: calls } = await supabase
        .from('customer_requests')
        .select('id, table_id, status, assigned_waiter_id')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending')
        .limit(50);

      // Build waiter stats
      const waiterMap = new Map<string, WaiterStat>();

      for (const a of assignments || []) {
        const waiter = a.waiter as any;
        const table = a.table as any;
        if (!waiter) continue;

        const existing: WaiterStat = waiterMap.get(waiter.id) || {
          waiterId: waiter.id as string,
          waiterName: (waiter.full_name || 'Unknown') as string,
          zone: (waiter.department || 'General') as string,
          currentTables: [] as string[],
          pendingCalls: 0,
          avgResponseMs: 0,
          status: 'active' as const,
        };
        existing.currentTables.push((table?.name as string) || String(a.table_id));
        waiterMap.set(waiter.id as string, existing);
      }

      // Count pending calls per waiter
      for (const call of calls || []) {
        if (call.assigned_waiter_id && waiterMap.has(call.assigned_waiter_id)) {
          const w = waiterMap.get(call.assigned_waiter_id)!;
          w.pendingCalls += 1;
        }
      }

      setWaiters(Array.from(waiterMap.values()));
    } catch (e) {
      console.warn('[WaiterView] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const handleRefresh = useCallback(() => {
    setLastRefresh(new Date());
    loadWaiters();
  }, [loadWaiters]);

  useEffect(() => {
    loadWaiters();
    // Refresh every 30 seconds
    const interval = setInterval(loadWaiters, 30000);
    return () => clearInterval(interval);
  }, [loadWaiters]);

  const sortedWaiters = useMemo(
    () => [...waiters].sort((a, b) => b.pendingCalls - a.pendingCalls),
    [waiters]
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <User className="h-4 w-4 text-emerald-400" />
          Waiter Live View
        </h3>
        <button
          onClick={handleRefresh}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sortedWaiters.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No active waiter assignments
          </div>
        ) : (
          sortedWaiters.map(waiter => (
            <div
              key={waiter.waiterId}
              className="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-emerald-900/50 border border-emerald-700 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {waiter.waiterName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-100">{waiter.waiterName}</p>
                    <p className="text-[10px] text-slate-400">{waiter.zone}</p>
                  </div>
                </div>
                {waiter.pendingCalls > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-900/40 border border-amber-700/50 rounded-full text-amber-400 text-[10px] font-medium">
                    <AlertCircle className="h-3 w-3" />
                    {waiter.pendingCalls} call{waiter.pendingCalls > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {waiter.currentTables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {waiter.currentTables.map(t => (
                    <span key={t} className="px-1.5 py-0.5 bg-slate-700 rounded text-[9px] text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-slate-700">
        <p className="text-[9px] text-slate-500">
          Updated {lastRefresh.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
