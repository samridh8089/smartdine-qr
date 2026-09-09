'use client';

/**
 * Phase-19: Founder Control Center — Kitchen Live View
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ChefHat, Clock, AlertTriangle, RefreshCw, Timer } from 'lucide-react';

interface KitchenOrder {
  orderId: string;
  tableName: string;
  status: string;
  acceptedAt: string;
  preparingAt: string | null;
  itemCount: number;
  elapsedMinutes: number;
  isDelayed: boolean;
}

interface KitchenViewProps {
  restaurantId: string;
}

function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  return `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`;
}

export default function KitchenView({ restaurantId }: KitchenViewProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadKitchenQueue = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const { data: batches } = await supabase
        .from('order_batches')
        .select(`
          id, order_id, status, created_at, updated_at,
          order:orders!order_batches_order_id_fkey(id, table_name, created_at, status)
        `)
        .eq('status', 'preparing')
        .order('created_at', { ascending: true })
        .limit(50);

      const now = new Date();
      const kitchenOrders: KitchenOrder[] = (batches || []).map((b: any) => {
        const preparingAt = b.updated_at || b.created_at;
        const elapsed = (now.getTime() - new Date(preparingAt).getTime()) / 60000;
        return {
          orderId: b.order_id,
          tableName: b.order?.table_name || 'Table',
          status: b.status,
          acceptedAt: b.created_at,
          preparingAt: preparingAt,
          itemCount: 0,
          elapsedMinutes: elapsed,
          isDelayed: elapsed > 20,
        };
      });

      setOrders(kitchenOrders);
    } catch (e) {
      console.warn('[KitchenView] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadKitchenQueue();
    const interval = setInterval(loadKitchenQueue, 15000);
    return () => clearInterval(interval);
  }, [loadKitchenQueue]);

  const stats = useMemo(() => {
    const total = orders.length;
    const delayed = orders.filter(o => o.isDelayed).length;
    const avgMinutes =
      total > 0
        ? orders.reduce((sum, o) => sum + o.elapsedMinutes, 0) / total
        : 0;
    return { total, delayed, avgMinutes };
  }, [orders]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-orange-400" />
          Kitchen Queue
        </h3>
        <button
          onClick={loadKitchenQueue}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 p-3 border-b border-slate-800">
        <div className="text-center">
          <p className="text-lg font-bold text-slate-100">{stats.total}</p>
          <p className="text-[9px] text-slate-500">Queue</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-amber-400">{Math.round(stats.avgMinutes)}m</p>
          <p className="text-[9px] text-slate-500">Avg Time</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${stats.delayed > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {stats.delayed}
          </p>
          <p className="text-[9px] text-slate-500">Delayed</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No orders in preparation
          </div>
        ) : (
          orders.map(order => (
            <div key={order.orderId}>
              <div
                onClick={() => setExpandedOrderId(
                  expandedOrderId === order.orderId ? null : order.orderId
                )}
                className={`
                  bg-slate-800 border rounded-lg p-3 cursor-pointer transition-colors
                  ${order.isDelayed
                    ? 'border-rose-700/60 bg-rose-950/20'
                    : 'border-slate-700 hover:border-slate-600'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-100">{order.tableName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {order.orderId.slice(0, 8)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {order.isDelayed && (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                    )}
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full
                      ${order.isDelayed
                        ? 'bg-rose-900/50 text-rose-300'
                        : 'bg-orange-900/50 text-orange-300'}`}
                    >
                      <Timer className="h-2.5 w-2.5" />
                      {formatElapsed(order.elapsedMinutes)}
                    </span>
                  </div>
                </div>
              </div>
              {expandedOrderId === order.orderId && (
                <div className="mx-2 mb-2 bg-slate-900 border border-slate-700 rounded-b-lg p-3 border-t-0">
                  <p className="text-[10px] text-slate-400 space-y-1">
                    <span className="block">Started: {new Date(order.preparingAt || order.acceptedAt).toLocaleTimeString()}</span>
                    <span className="block text-rose-400">
                      {order.isDelayed
                        ? `⚠ Delayed by ${Math.round(order.elapsedMinutes - 20)}min — check with kitchen`
                        : 'Within normal time'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
