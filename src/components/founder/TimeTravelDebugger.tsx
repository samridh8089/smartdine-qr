'use client';

/**
 * Phase-19: Founder Control Center — Time Travel Debugger
 * Reconstructs restaurant state at any past moment using correlation_id.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SystemEvent } from './types';
import { EVENT_TO_NODE } from './NodeDefinitions';

interface StateSnapshot {
  timestamp: string;
  currentNode: string;
  eventType: string;
  actorType?: string;
  waiterName?: string;
  tableName?: string;
  inventoryInfo?: string;
  metadata?: Record<string, unknown>;
}

interface TimeTravelDebuggerProps {
  restaurantId: string;
  correlationId: string | null;
  onClose: () => void;
}

function nodeLabel(nodeId: string): string {
  const labels: Record<string, string> = {
    qr_scan: 'QR Scan', customer_menu: 'Customer Menu', cart: 'Cart',
    checkout: 'Checkout', order_created: 'Order Created', live_orders: 'Live Orders',
    kitchen_queue: 'Kitchen Queue', preparing: 'Preparing', ready: 'Ready',
    waiter_assigned: 'Waiter Assigned', served: 'Served', billing: 'Billing',
    payment: 'Payment', session_closed: 'Session Closed',
    inventory: 'Inventory', customer_calls: 'Customer Calls',
    push_notifications: 'Push Notifications',
  };
  return labels[nodeId] || nodeId;
}

export default function TimeTravelDebugger({
  restaurantId,
  correlationId,
  onClose,
}: TimeTravelDebuggerProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [sliderIdx, setSliderIdx] = useState(0);
  const sliderRef = useRef<HTMLInputElement>(null);

  const loadEvents = useCallback(async () => {
    if (!correlationId || !restaurantId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('system_events')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('correlation_id', correlationId)
        .order('created_at', { ascending: true })
        .limit(200);
      setEvents((data || []) as SystemEvent[]);
      setSliderIdx(((data || []).length) - 1);
    } catch (e) {
      console.warn('[TimeTravelDebugger] error:', e);
    } finally {
      setLoading(false);
    }
  }, [correlationId, restaurantId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Build state snapshot up to sliderIdx
  const stateAtIdx = useMemo<StateSnapshot | null>(() => {
    if (!events.length) return null;
    const idx = Math.max(0, Math.min(sliderIdx, events.length - 1));
    const eventsUpTo = events.slice(0, idx + 1);
    const latest = eventsUpTo[eventsUpTo.length - 1];

    // Find current node from target_node or event type mapping
    const currentNode = latest.target_node || EVENT_TO_NODE[latest.event_type] || 'order_created';

    // Reconstruct state from metadata of all events
    let waiterName: string | undefined;
    let tableName: string | undefined;
    let inventoryInfo: string | undefined;

    for (const e of eventsUpTo) {
      const meta = e.metadata as Record<string, unknown> | undefined;
      if (meta?.waiterName && typeof meta.waiterName === 'string') waiterName = meta.waiterName;
      if (meta?.staffName && typeof meta.staffName === 'string') waiterName = meta.staffName;
      if (meta?.table_name && typeof meta.table_name === 'string') tableName = meta.table_name;
      if (e.event_type === 'inventory_reserved') {
        inventoryInfo = `Reserved (qty: ${(meta as any)?.quantity || 'n/a'})`;
      }
      if (e.event_type === 'inventory_deducted') {
        inventoryInfo = `Deducted (qty: ${(meta as any)?.quantity || 'n/a'})`;
      }
      if (e.event_type === 'inventory_rollback') {
        inventoryInfo = `Rolled back — reason: ${(meta as any)?.reason || 'order cancelled'}`;
      }
    }

    return {
      timestamp: latest.created_at,
      currentNode,
      eventType: latest.event_type,
      actorType: latest.actor_type,
      waiterName,
      tableName,
      inventoryInfo,
      metadata: latest.metadata as Record<string, unknown> | undefined,
    };
  }, [events, sliderIdx]);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSliderIdx(Number(e.target.value));
  }, []);

  if (!correlationId) {
    return (
      <div className="bg-slate-900 rounded-lg border border-slate-700 p-6 text-center">
        <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-500 text-xs">Select an order to time-travel</p>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-900 rounded-lg border border-purple-700/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-slate-100">Time Travel</h3>
          <span className="text-[9px] font-mono text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded">
            {correlationId.slice(0, 16)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-500 hover:text-slate-200 rounded hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-xs">
          No events found for this correlation ID
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Timeline scrubber */}
          <div>
            <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
              <span>{new Date(events[0].created_at).toLocaleTimeString()}</span>
              <span className="text-purple-400 font-medium">
                Step {sliderIdx + 1} of {events.length}
              </span>
              <span>{new Date(events[events.length - 1].created_at).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSliderIdx(i => Math.max(0, i - 1))}
                className="p-1 text-slate-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                ref={sliderRef}
                type="range"
                min={0}
                max={events.length - 1}
                value={sliderIdx}
                onChange={handleSlider}
                className="flex-1 h-1 accent-purple-500 cursor-pointer"
              />
              <button
                onClick={() => setSliderIdx(i => Math.min(events.length - 1, i + 1))}
                className="p-1 text-slate-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* State snapshot cards */}
          {stateAtIdx && (
            <div className="grid grid-cols-2 gap-2">
              <StateCard label="Current Node" value={nodeLabel(stateAtIdx.currentNode)} color="text-blue-400" />
              <StateCard label="Event" value={stateAtIdx.eventType.replace(/_/g, ' ')} color="text-emerald-400" />
              <StateCard label="Timestamp" value={new Date(stateAtIdx.timestamp).toLocaleTimeString()} color="text-slate-300" />
              <StateCard label="Actor" value={stateAtIdx.actorType || 'system'} color="text-slate-300" />
              {stateAtIdx.waiterName && (
                <StateCard label="Waiter" value={stateAtIdx.waiterName} color="text-purple-400" />
              )}
              {stateAtIdx.tableName && (
                <StateCard label="Table" value={stateAtIdx.tableName} color="text-amber-400" />
              )}
              {stateAtIdx.inventoryInfo && (
                <div className="col-span-2">
                  <StateCard label="Inventory" value={stateAtIdx.inventoryInfo} color="text-teal-400" />
                </div>
              )}
            </div>
          )}

          {/* Event at current step */}
          {events[sliderIdx] && (
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <p className="text-[9px] text-slate-500 font-semibold uppercase mb-1">Event at this step</p>
              <p className="text-xs text-slate-200 font-mono">{events[sliderIdx].event_type}</p>
              {events[sliderIdx].source_node && events[sliderIdx].target_node && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {nodeLabel(events[sliderIdx].source_node!)} → {nodeLabel(events[sliderIdx].target_node!)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StateCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-2.5 border border-slate-700">
      <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-xs font-semibold ${color} truncate`}>{value}</p>
    </div>
  );
}
