'use client';

/**
 * Phase-19: Founder Control Center — System Mode
 * Permanent architecture map. Click any node to see its API, table, and last event.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { X, Globe, Database, Clock, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { GRAPH_NODES, NODE_MAP } from './NodeDefinitions';
import type { SystemEvent } from './types';

const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-950">
      <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

// Node metadata (API route + DB table)
const NODE_META: Record<string, { api: string; table: string; description: string }> = {
  qr_scan:          { api: '/api/customer/menu', table: 'tables', description: 'Customer scans QR code and lands on the menu page.' },
  customer_menu:    { api: '/api/customer/menu', table: 'menu_items, categories', description: 'Customer browses categories and items.' },
  cart:             { api: '(client-side state)', table: '—', description: 'Cart state managed in customer session storage.' },
  checkout:         { api: '/api/customer/orders', table: 'orders, order_items', description: 'Order is validated, created, and inventory reserved.' },
  order_created:    { api: '/api/customer/orders', table: 'orders, order_batches', description: 'Order record created. Realtime broadcast fires.' },
  live_orders:      { api: '/api/staff/update-order-status', table: 'orders', description: 'Staff accepts the order. Status → accepted.' },
  kitchen_queue:    { api: '/api/staff/update-order-status', table: 'order_batches', description: 'Order accepted, appears on KDS. Push sent to kitchen.' },
  preparing:        { api: '/api/staff/update-order-status', table: 'order_batches', description: 'Kitchen marks order as preparing. Inventory deducted.' },
  ready:            { api: '/api/staff/update-order-status', table: 'orders', description: 'Order is ready. Push notification sent to waiter.' },
  waiter_assigned:  { api: '/api/staff/assign-waiter', table: 'table_assignments', description: 'Waiter assigned to deliver the order to the table.' },
  served:           { api: '/api/staff/update-order-status', table: 'orders', description: 'Order delivered. Status → served.' },
  billing:          { api: '/api/payments/create-order', table: 'orders', description: 'Bill generated. Payment link created.' },
  payment:          { api: '/api/payments/verify', table: 'restaurants', description: 'Payment verified via Razorpay signature. Plan activated.' },
  session_closed:   { api: '/api/staff/update-order-status', table: 'orders', description: 'Order marked completed. Table session ends.' },
  inventory:        { api: '/api/inventory/*', table: 'inventory_items, inventory_reservations', description: 'Ingredient reservation and deduction lifecycle.' },
  customer_calls:   { api: '/api/customer/request', table: 'customer_requests', description: 'Customer presses "Call Waiter". Assigned and resolved.' },
  push_notifications:{ api: 'FCM (firebase-admin)', table: '—', description: 'Firebase push notifications to kitchen and waiter devices.' },
  audit_logs:       { api: '/api/audit', table: 'audit_logs', description: 'All staff actions recorded for compliance.' },
  reports:          { api: '/api/reports/*', table: 'orders, order_items', description: 'Revenue, item popularity, and session analytics.' },
};

interface NodeDetailPanelProps {
  nodeId: string;
  restaurantId: string;
  onClose: () => void;
}

function NodeDetailPanel({ nodeId, restaurantId, onClose }: NodeDetailPanelProps) {
  const [lastEvent, setLastEvent] = useState<SystemEvent | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const [last, count] = await Promise.all([
          supabase.from('system_events').select('*').eq('restaurant_id', restaurantId)
            .eq('target_node', nodeId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('system_events').select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurantId).eq('target_node', nodeId).gte('created_at', today.toISOString()),
        ]);
        setLastEvent(last.data as SystemEvent | null);
        setEventCount(count.count || 0);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [nodeId, restaurantId]);

  const node = NODE_MAP[nodeId];
  const meta = NODE_META[nodeId];
  if (!node || !meta) return null;

  return (
    <div className="w-72 bg-slate-900 border-l border-slate-700 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-bold text-slate-100">{node.label}</h3>
        <button onClick={onClose} className="p-1 text-slate-500 hover:text-white rounded hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        <p className="text-xs text-slate-400">{meta.description}</p>
        <div className="space-y-2">
          <DetailRow icon={<Globe className="h-3.5 w-3.5 text-blue-400" />} label="API" value={meta.api} mono />
          <DetailRow icon={<Database className="h-3.5 w-3.5 text-emerald-400" />} label="DB Table" value={meta.table} mono />
          <DetailRow
            icon={<Activity className="h-3.5 w-3.5 text-amber-400" />}
            label="Events today"
            value={loading ? '…' : String(eventCount)}
          />
          {lastEvent && (
            <DetailRow
              icon={<Clock className="h-3.5 w-3.5 text-purple-400" />}
              label="Last event"
              value={new Date(lastEvent.created_at).toLocaleTimeString()}
            />
          )}
        </div>
        {lastEvent && (
          <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
            <p className="text-[9px] text-slate-500 mb-1 uppercase tracking-wide">Most Recent</p>
            <p className="text-xs font-mono text-slate-200">{lastEvent.event_type}</p>
            {lastEvent.correlation_id && (
              <p className="text-[9px] text-slate-500 mt-1 font-mono">{lastEvent.correlation_id}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-xs text-slate-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

interface SystemModeProps {
  restaurantId: string;
}

export default function SystemMode({ restaurantId }: SystemModeProps) {
  // ─── All hooks FIRST ─────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) setContainerSize({ width: e.contentRect.width, height: e.contentRect.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleClose = useCallback(() => setSelectedNodeId(null), []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {containerSize.width > 100 && (
          <GraphCanvas
            containerWidth={containerSize.width}
            containerHeight={containerSize.height}
            orderDots={[]}
            events={[]}
            followingOrderId={null}
            onNodeClick={setSelectedNodeId}
            onDotClick={() => {}}
          />
        )}
        <div className="absolute top-3 left-3 px-3 py-1.5 bg-slate-900/90 border border-slate-700 rounded-full">
          <p className="text-[10px] text-slate-400">Click any node to inspect its API, table, and last event</p>
        </div>
      </div>

      {selectedNodeId && (
        <NodeDetailPanel
          nodeId={selectedNodeId}
          restaurantId={restaurantId}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
