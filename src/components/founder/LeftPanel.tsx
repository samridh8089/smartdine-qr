'use client';

/**
 * Phase-19: Founder Control Center — Left Panel
 * Mini floor plan + table status + waiter view + kitchen view
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LayoutGrid, ChefHat, User, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TableStatus {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'reserved' | 'preparing' | 'waiting_bill' | 'merged';
  currentOrderId?: string;
  waiterName?: string;
}

interface LeftPanelProps {
  restaurantId: string;
  onTableClick?: (tableId: string) => void;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  available:    { bg: 'bg-emerald-900/40 border-emerald-700/50', text: 'text-emerald-400', label: 'Available' },
  occupied:     { bg: 'bg-blue-900/40 border-blue-700/50',       text: 'text-blue-400',    label: 'Occupied' },
  reserved:     { bg: 'bg-purple-900/40 border-purple-700/50',   text: 'text-purple-400',  label: 'Reserved' },
  preparing:    { bg: 'bg-orange-900/40 border-orange-700/50',   text: 'text-orange-400',  label: 'Preparing' },
  waiting_bill: { bg: 'bg-amber-900/40 border-amber-700/50',     text: 'text-amber-400',   label: 'Bill' },
  merged:       { bg: 'bg-slate-700/60 border-slate-600/50',     text: 'text-slate-400',   label: 'Merged' },
};

type LeftTab = 'floor' | 'waiters' | 'kitchen';

export default function LeftPanel({ restaurantId, onTableClick }: LeftPanelProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<LeftTab>('floor');
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiters, setWaiters] = useState<Array<{ id: string; name: string; tables: string[]; calls: number }>>([]);
  const [kitchenQueue, setKitchenQueue] = useState<Array<{ orderId: string; table: string; elapsedMin: number }>>([]);

  const loadFloorData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      // Get all tables
      const { data: tablesData } = await supabase
        .from('tables')
        .select('id, name, status')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true })
        .limit(50);

      // Get active orders to figure out table status
      const { data: orders } = await supabase
        .from('orders')
        .select('id, table_id, status')
        .eq('restaurant_id', restaurantId)
        .in('status', ['new', 'accepted', 'preparing', 'ready', 'served'])
        .is('table_id', null)
        .neq('table_id', null);

      // Get waiter assignments
      const { data: assignments } = await supabase
        .from('table_assignments')
        .select('table_id, waiter:profiles(full_name)')
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      const orderByTable: Record<string, { orderId: string; status: string }> = {};
      for (const o of orders || []) {
        if (o.table_id) orderByTable[o.table_id] = { orderId: o.id, status: o.status };
      }

      const waiterByTable: Record<string, string> = {};
      for (const a of assignments || []) {
        const w = a.waiter as any;
        if (a.table_id && w?.full_name) waiterByTable[a.table_id] = w.full_name;
      }

      const tableStatuses: TableStatus[] = (tablesData || []).map((t: any) => {
        const order = orderByTable[t.id];
        let status: TableStatus['status'] = 'available';
        if (order) {
          if (order.status === 'preparing') status = 'preparing';
          else if (order.status === 'served') status = 'waiting_bill';
          else status = 'occupied';
        } else if (t.status && t.status !== 'available') {
          status = t.status as TableStatus['status'];
        }
        return {
          id: t.id,
          name: t.name,
          status,
          currentOrderId: order?.orderId,
          waiterName: waiterByTable[t.id],
        };
      });

      setTables(tableStatuses);
    } catch (e) {
      console.warn('[LeftPanel] floor load error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const loadKitchenData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data } = await supabase
        .from('order_batches')
        .select('order_id, updated_at, order:orders(table_name, status)')
        .eq('status', 'preparing')
        .order('created_at', { ascending: true })
        .limit(20);

      const now = Date.now();
      const queue = (data || []).map((b: any) => ({
        orderId: b.order_id,
        table: b.order?.table_name || 'Table',
        elapsedMin: (now - new Date(b.updated_at).getTime()) / 60000,
      }));
      setKitchenQueue(queue);
    } catch (e) {
      console.warn('[LeftPanel] kitchen load error:', e);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadFloorData();
    loadKitchenData();
    const interval = setInterval(() => {
      loadFloorData();
      loadKitchenData();
    }, 20000);
    return () => clearInterval(interval);
  }, [loadFloorData, loadKitchenData]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tables) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tables]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800">
      {/* Tab switcher */}
      <div className="flex border-b border-slate-800 shrink-0">
        {([
          { id: 'floor', icon: LayoutGrid, label: 'Floor' },
          { id: 'kitchen', icon: ChefHat, label: 'Kitchen' },
          { id: 'waiters', icon: User, label: 'Waiters' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/10'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Floor Plan tab */}
        {activeTab === 'floor' && (
          <div className="p-3">
            {/* Status summary */}
            <div className="grid grid-cols-2 gap-1 mb-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.available;
                return (
                  <div key={status} className={`rounded px-2 py-1 border ${cfg.bg} flex items-center justify-between`}>
                    <span className={`text-[9px] font-medium ${cfg.text}`}>{cfg.label}</span>
                    <span className={`text-[10px] font-bold ${cfg.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>

            {/* Table grid */}
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {tables.map(table => {
                  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available;
                  return (
                    <button
                      key={table.id}
                      onClick={() => onTableClick?.(table.id)}
                      className={`
                        rounded-lg border p-2 text-center transition-all hover:scale-105
                        ${cfg.bg} ${cfg.text}
                      `}
                    >
                      <p className="text-[10px] font-bold truncate">{table.name}</p>
                      <p className="text-[8px] opacity-70">{cfg.label}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Kitchen tab */}
        {activeTab === 'kitchen' && (
          <div className="p-3 space-y-2">
            <p className="text-[10px] text-slate-500 mb-2">
              {kitchenQueue.length} order{kitchenQueue.length !== 1 ? 's' : ''} preparing
            </p>
            {kitchenQueue.length === 0 ? (
              <p className="text-center text-slate-600 text-xs py-6">No active preparation</p>
            ) : (
              kitchenQueue.map(item => (
                <div
                  key={item.orderId}
                  className={`rounded-lg border p-2.5 ${
                    item.elapsedMin > 20
                      ? 'bg-rose-950/30 border-rose-700/60 text-rose-300'
                      : 'bg-orange-950/20 border-orange-700/50 text-orange-300'
                  }`}
                >
                  <p className="text-[10px] font-semibold">{item.table}</p>
                  <p className="text-[9px] opacity-70">{Math.round(item.elapsedMin)}m {item.elapsedMin > 20 ? '⚠ Delayed' : ''}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Waiters tab */}
        {activeTab === 'waiters' && (
          <div className="p-3 space-y-2">
            {waiters.length === 0 ? (
              <p className="text-center text-slate-600 text-xs py-6">No active assignments</p>
            ) : (
              waiters.map(w => (
                <div key={w.id} className="bg-slate-800 border border-slate-700 rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-slate-200">{w.name}</p>
                  <p className="text-[9px] text-slate-500">{w.tables.join(', ')}</p>
                  {w.calls > 0 && (
                    <p className="text-[9px] text-amber-400 mt-0.5">⚡ {w.calls} pending call{w.calls > 1 ? 's' : ''}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Refresh footer */}
      <div className="px-3 py-2 border-t border-slate-800 shrink-0 flex items-center justify-between">
        <p className="text-[9px] text-slate-600">{tables.length} tables</p>
        <button
          onClick={() => { loadFloorData(); loadKitchenData(); }}
          className="p-1 text-slate-600 hover:text-slate-400 rounded"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
