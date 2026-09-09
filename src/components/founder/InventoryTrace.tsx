'use client';

/**
 * Phase-19: Founder Control Center — Inventory Trace Panel
 * Shows ingredient reservation/deduction chain for an order.
 * READ-ONLY: never imports from inventoryEngine or inventoryUnits.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

interface InventoryEvent {
  id: string;
  action: string; // 'reserve' | 'deduct' | 'rollback' | 'waste'
  ingredient_name: string;
  quantity_change: number;
  unit: string;
  created_at: string;
  reason?: string;
}

interface InventoryTraceProps {
  restaurantId: string;
  orderId?: string | null;
}

export default function InventoryTrace({ restaurantId, orderId }: InventoryTraceProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [reservations, setReservations] = useState<InventoryEvent[]>([]);
  const [transactions, setTransactions] = useState<InventoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const loadTrace = useCallback(async () => {
    if (!restaurantId || !orderId) return;
    setLoading(true);
    try {
      // Read reservations (read-only, never modify)
      const { data: resData } = await supabase
        .from('inventory_reservations')
        .select('id, ingredient_name, reserved_qty, unit, status, created_at, notes')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
        .limit(50);

      // Read transactions (read-only)
      const { data: txData } = await supabase
        .from('inventory_transactions')
        .select('id, ingredient_name, quantity_change, unit, action, created_at, notes')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })
        .limit(50);

      setReservations((resData || []).map((r: any) => ({
        id: r.id,
        action: r.status === 'cancelled' ? 'rollback' : 'reserve',
        ingredient_name: r.ingredient_name,
        quantity_change: r.reserved_qty,
        unit: r.unit || '',
        created_at: r.created_at,
        reason: r.notes,
      })));

      setTransactions((txData || []).map((t: any) => ({
        id: t.id,
        action: t.action || 'deduct',
        ingredient_name: t.ingredient_name,
        quantity_change: Math.abs(t.quantity_change),
        unit: t.unit || '',
        created_at: t.created_at,
        reason: t.notes,
      })));
    } catch (e) {
      console.warn('[InventoryTrace] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, orderId]);

  useEffect(() => {
    loadTrace();
  }, [loadTrace]);

  const allEvents = useMemo(() => {
    const all = [...reservations, ...transactions];
    return all.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [reservations, transactions]);

  const actionConfig: Record<string, { label: string; color: string; icon: string }> = {
    reserve: { label: 'Reserved', color: 'text-blue-400 bg-blue-900/30 border-blue-700/50', icon: '📦' },
    deduct: { label: 'Deducted', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50', icon: '✅' },
    rollback: { label: 'Rollback', color: 'text-amber-400 bg-amber-900/30 border-amber-700/50', icon: '↩️' },
    waste: { label: 'Waste', color: 'text-rose-400 bg-rose-900/30 border-rose-700/50', icon: '🗑️' },
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
        <Package className="h-4 w-4 text-teal-400" />
        Inventory Trace
        {orderId && (
          <span className="text-[9px] text-slate-500 font-mono ml-1">
            {orderId.slice(0, 8)}...
          </span>
        )}
      </h3>

      {!orderId ? (
        <p className="text-slate-500 text-xs text-center py-4">
          Select an order to view inventory trace
        </p>
      ) : loading ? (
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : allEvents.length === 0 ? (
        <p className="text-slate-500 text-xs text-center py-4">
          No inventory events for this order
        </p>
      ) : (
        <div className="space-y-2">
          {allEvents.map((evt, i) => {
            const cfg = actionConfig[evt.action] || actionConfig.reserve;
            const isExpanded = expanded[evt.id];
            return (
              <div key={evt.id} className="relative">
                {/* Connector line */}
                {i < allEvents.length - 1 && (
                  <div className="absolute left-3 top-8 h-full w-px bg-slate-700 -mb-2" />
                )}
                <div
                  className={`relative flex items-start gap-3 p-2 rounded-lg border cursor-pointer ${cfg.color}`}
                  onClick={() => toggleExpand(evt.id)}
                >
                  <span className="text-base mt-0.5 shrink-0">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold truncate">{evt.ingredient_name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] font-mono">{evt.quantity_change} {evt.unit}</span>
                        {evt.reason ? (
                          isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                        ) : null}
                      </div>
                    </div>
                    <p className="text-[9px] opacity-60 mt-0.5">
                      {cfg.label} · {new Date(evt.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                {isExpanded && evt.reason && (
                  <div className="mx-2 mb-1 bg-slate-800 rounded px-3 py-2 text-[10px] text-slate-400">
                    <RotateCcw className="h-3 w-3 inline mr-1 text-amber-400" />
                    Reason: {evt.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
