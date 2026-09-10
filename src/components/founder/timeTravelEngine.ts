/**
 * timeTravelEngine.ts
 * Phase-19A-R1: CCTV Freeze Frame & Time Travel Debugger Reconstruction Engine
 *
 * PURE READ-ONLY RECONSTRUCTION:
 * Rebuilds exact restaurant state at any millisecond timestamp from system_events
 * without any database writes or modifying live operations.
 */

import type {
  SystemEvent,
  FreezeFrameSnapshot,
  FreezeMetrics,
  OrderDotState,
  StateDiffItem,
  GhostTableOverlay,
} from './types';
import { EVENT_TO_NODE, DOT_COLORS } from './NodeDefinitions';

export function reconstructStateAtTimestamp(
  events: SystemEvent[],
  targetMs: number,
  knownTables: Array<{ id: string; name: string }> = []
): FreezeFrameSnapshot {
  // 1. Sift events up to the target millisecond
  const historicalEvents = events
    .filter(e => new Date(e.created_at).getTime() <= targetMs)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  // 2. Group by correlation_id to find latest state of each journey
  const latestByCorr = new Map<string, SystemEvent>();
  const eventsByCorr = new Map<string, SystemEvent[]>();
  for (const evt of historicalEvents) {
    latestByCorr.set(evt.correlation_id, evt);
    if (!eventsByCorr.has(evt.correlation_id)) {
      eventsByCorr.set(evt.correlation_id, []);
    }
    eventsByCorr.get(evt.correlation_id)!.push(evt);
  }

  // 3. Compute Metrics & Active Order Dots at this second
  let preparingCount = 0;
  let readyCount = 0;
  let servingCount = 0;
  let billingCount = 0;
  const activeDots: OrderDotState[] = [];
  const kdsQueue: Array<{ orderId: string; table: string; status: string; elapsedMin: number }> = [];

  let colorIdx = 0;
  const colorMap = new Map<string, string>();

  const MAIN_PIPELINE_NODES = new Set([
    'qr_scan', 'customer_menu', 'cart', 'checkout', 'order_created',
    'live_orders', 'kitchen_queue', 'preparing', 'ready', 'waiter_assigned',
    'served', 'billing', 'payment', 'session_closed'
  ]);

  for (const [corrId, eventsForCorr] of eventsByCorr.entries()) {
    const latestEvt = eventsForCorr[eventsForCorr.length - 1];
    const isClosed = eventsForCorr.some(
      e => e.event_type === 'order_completed' ||
           e.event_type === 'order_cancelled' ||
           e.event_type === 'session_closed'
    );

    // Find the latest event that belongs to the main pipeline
    const pipelineEvents = eventsForCorr.filter(e => {
      const node = e.target_node || EVENT_TO_NODE[e.event_type];
      return node && MAIN_PIPELINE_NODES.has(node);
    });
    const effectivePipelineEvt = pipelineEvents[pipelineEvents.length - 1] || latestEvt;
    const targetNode = effectivePipelineEvt.target_node || EVENT_TO_NODE[effectivePipelineEvt.event_type] || 'order_created';

    if (!isClosed && targetNode !== 'session_closed') {
      if (!colorMap.has(corrId)) {
        colorMap.set(corrId, DOT_COLORS[colorIdx++ % DOT_COLORS.length]);
      }
      const shortId = corrId.replace('corr_', '').slice(0, 6);
      activeDots.push({
        orderId: effectivePipelineEvt.order_id || corrId,
        correlationId: corrId,
        shortId,
        currentNodeId: targetNode,
        prevNodeId: effectivePipelineEvt.source_node,
        color: colorMap.get(corrId)!,
        lastEventAt: effectivePipelineEvt.created_at,
        metadata: effectivePipelineEvt.metadata,
      });

      // Metric classifications
      if (targetNode === 'preparing') {
        preparingCount++;
        const elapsed = Math.max(0, (targetMs - new Date(latestEvt.created_at).getTime()) / 60000);
        kdsQueue.push({
          orderId: latestEvt.order_id || shortId,
          table: ((latestEvt.metadata as any)?.table_name as string) || 'Table',
          status: 'preparing',
          elapsedMin: Math.round(elapsed),
        });
      } else if (targetNode === 'ready') {
        readyCount++;
        kdsQueue.push({
          orderId: latestEvt.order_id || shortId,
          table: ((latestEvt.metadata as any)?.table_name as string) || 'Table',
          status: 'ready',
          elapsedMin: 0,
        });
      } else if (targetNode === 'waiter_assigned' || targetNode === 'served') {
        servingCount++;
      } else if (targetNode === 'billing' || targetNode === 'payment') {
        billingCount++;
      }
    }
  }

  const metrics: FreezeMetrics = {
    activeOrders: activeDots.length,
    preparing: preparingCount,
    ready: readyCount,
    serving: servingCount,
    billing: billingCount,
  };

  // 4. Reconstruct Table Statuses at this second
  const tableStatus: Record<string, 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_bill' | 'closed'> = {};
  for (const t of knownTables) {
    tableStatus[t.id] = 'available';
  }

  // Trace table events
  for (const evt of historicalEvents) {
    const tableId = evt.table_uuid || ((evt.metadata as any)?.table_id as string);
    if (!tableId) continue;

    if (evt.event_type === 'order_created' || evt.event_type === 'order_accepted') {
      tableStatus[tableId] = 'occupied';
    } else if (evt.event_type === 'order_preparing') {
      tableStatus[tableId] = 'preparing';
    } else if (evt.event_type === 'order_ready') {
      tableStatus[tableId] = 'ready';
    } else if (evt.event_type === 'order_served') {
      tableStatus[tableId] = 'waiting_bill';
    } else if (evt.event_type === 'order_completed' || evt.event_type === 'order_cancelled' || evt.event_type === 'session_closed') {
      tableStatus[tableId] = 'available';
    }
  }

  // 5. Reconstruct Waiter Assignments
  const waiterAssignments: Record<string, string> = {};
  for (const evt of historicalEvents) {
    const meta = evt.metadata as Record<string, unknown> | undefined;
    const waiterName = (meta?.waiterName as string) || (meta?.staffName as string);
    const tableId = evt.table_uuid || (meta?.table_name as string);
    if (tableId && waiterName && evt.event_type.includes('waiter')) {
      waiterAssignments[tableId] = waiterName;
    }
  }

  // 6. Reconstruct Inventory Ledger Deltas
  const inventoryState: Record<string, { reserved: number; deducted: number; rolledBack: number }> = {};
  for (const evt of historicalEvents) {
    const meta = evt.metadata as Record<string, unknown> | undefined;
    const item = (meta?.ingredient_name as string) || (meta?.item as string);
    const qty = Number(meta?.qty || meta?.quantity || 1);

    if (item) {
      if (!inventoryState[item]) {
        inventoryState[item] = { reserved: 0, deducted: 0, rolledBack: 0 };
      }
      if (evt.event_type === 'inventory_reserved') {
        inventoryState[item].reserved += qty;
      } else if (evt.event_type === 'inventory_deducted') {
        inventoryState[item].deducted += qty;
      } else if (evt.event_type === 'inventory_rollback') {
        inventoryState[item].rolledBack += qty;
      }
    }
  }

  // 7. Customer Calls
  const customerCallsMap = new Map<string, { id: string; table: string; status: string }>();
  for (const evt of historicalEvents) {
    if (evt.event_type === 'customer_call_accepted' || evt.event_type === 'customer_call_resolved') {
      const id = evt.order_id || evt.id;
      const table = ((evt.metadata as any)?.table_name as string) || 'Table';
      const status = evt.event_type === 'customer_call_resolved' ? 'resolved' : 'accepted';
      customerCallsMap.set(id, { id, table, status });
    }
  }

  return {
    timestampMs: targetMs,
    timestampIso: new Date(targetMs).toISOString(),
    metrics,
    tableStatus,
    kdsQueue,
    waiterAssignments,
    inventoryState,
    customerCalls: Array.from(customerCallsMap.values()).filter(c => c.status !== 'resolved'),
    dots: activeDots,
  };
}

/**
 * Ghost Mode Engine:
 * Compares a historical snapshot at `T` with the current live snapshot `Now`.
 * Returns overlays showing solid current state vs semi-transparent historical ghost.
 */
export function computeGhostOverlays(
  historicalSnapshot: FreezeFrameSnapshot,
  currentSnapshot: FreezeFrameSnapshot,
  tables: Array<{ id: string; name: string }>
): GhostTableOverlay[] {
  return tables.map(table => {
    const historicalStatus = historicalSnapshot.tableStatus[table.id] || 'available';
    const currentStatus = currentSnapshot.tableStatus[table.id] || 'available';
    return {
      tableId: table.id,
      tableName: table.name,
      historicalStatus,
      currentStatus,
      hasChanged: historicalStatus !== currentStatus,
    };
  });
}

/**
 * Event Difference Mode:
 * Compares restaurant state at timestamp T1 vs T2 and returns granular diff lines.
 */
export function compareTimestamps(
  events: SystemEvent[],
  t1Ms: number,
  t2Ms: number,
  tables: Array<{ id: string; name: string }> = []
): StateDiffItem[] {
  const earlyMs = Math.min(t1Ms, t2Ms);
  const lateMs = Math.max(t1Ms, t2Ms);

  const snap1 = reconstructStateAtTimestamp(events, earlyMs, tables);
  const snap2 = reconstructStateAtTimestamp(events, lateMs, tables);

  const diffs: StateDiffItem[] = [];

  // Table differences
  for (const t of tables) {
    const s1 = snap1.tableStatus[t.id] || 'available';
    const s2 = snap2.tableStatus[t.id] || 'available';
    if (s1 !== s2) {
      diffs.push({
        category: 'table',
        entity: `Table ${t.name}`,
        before: s1.toUpperCase(),
        after: s2.toUpperCase(),
        highlight: true,
      });
    }
  }

  // Active orders difference
  if (snap1.metrics.activeOrders !== snap2.metrics.activeOrders) {
    diffs.push({
      category: 'order',
      entity: 'Active Orders Count',
      before: `${snap1.metrics.activeOrders} orders`,
      after: `${snap2.metrics.activeOrders} orders`,
    });
  }

  // Kitchen queue difference
  if (snap1.metrics.preparing !== snap2.metrics.preparing) {
    diffs.push({
      category: 'kitchen',
      entity: 'Orders Preparing',
      before: `${snap1.metrics.preparing} preparing`,
      after: `${snap2.metrics.preparing} preparing`,
      highlight: true,
    });
  }

  // Inventory differences
  const allItems = new Set([
    ...Object.keys(snap1.inventoryState),
    ...Object.keys(snap2.inventoryState),
  ]);
  for (const item of allItems) {
    const i1 = snap1.inventoryState[item] || { reserved: 0, deducted: 0, rolledBack: 0 };
    const i2 = snap2.inventoryState[item] || { reserved: 0, deducted: 0, rolledBack: 0 };
    if (i1.deducted !== i2.deducted) {
      diffs.push({
        category: 'inventory',
        entity: `${item} Deducted`,
        before: `${i1.deducted} units`,
        after: `${i2.deducted} units`,
        highlight: true,
      });
    }
    if (i1.reserved !== i2.reserved) {
      diffs.push({
        category: 'inventory',
        entity: `${item} Reserved`,
        before: `${i1.reserved} units`,
        after: `${i2.reserved} units`,
      });
    }
  }

  return diffs;
}
