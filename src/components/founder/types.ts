/**
 * Phase-19: Founder Control Center — Shared Types
 */

// ─── System Event Types ───────────────────────────────────────────────────────

export type SystemEventType =
  | 'qr_scanned' | 'menu_opened' | 'cart_updated' | 'checkout_started'
  | 'order_created' | 'order_accepted' | 'order_preparing' | 'order_ready'
  | 'order_served' | 'order_cancelled' | 'order_completed'
  | 'reservation_created' | 'reservation_updated' | 'reservation_seated'
  | 'reservation_cancelled' | 'reservation_no_show'
  | 'takeaway_created' | 'takeaway_preparing' | 'takeaway_ready' | 'takeaway_handed_over'
  | 'waiter_assigned' | 'waiter_reassigned' | 'customer_call_accepted' | 'customer_call_resolved'
  | 'payment_success' | 'payment_failed' | 'bill_closed'
  | 'inventory_reserved' | 'inventory_deducted' | 'inventory_rollback' | 'waste_entry'
  | 'session_closed' | 'push_sent' | 'push_failed';

export interface SystemEvent {
  id: string;
  restaurant_id: string;
  correlation_id: string;
  order_id?: string;
  table_uuid?: string;
  actor_type?: string;
  actor_id?: string;
  event_type: string;
  source_node?: string;
  target_node?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ─── Graph Types ──────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'main' | 'side';
  color: string;
  textColor?: string;
  description?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'main' | 'side';
  label?: string;
}

// ─── Order Dot ────────────────────────────────────────────────────────────────

export interface OrderDotState {
  orderId: string;
  correlationId: string;
  shortId: string;
  currentNodeId: string;
  prevNodeId?: string;
  color: string;
  lastEventAt: string;
  metadata?: Record<string, unknown>;
}

// ─── Founder Mode ─────────────────────────────────────────────────────────────

export type FounderMode = 'live' | 'replay' | 'freeze' | 'system' | 'debug';

// ─── Freeze Frame & Time Travel Types (Phase-19A-R1) ──────────────────────────

export interface FreezeMetrics {
  activeOrders: number;
  preparing: number;
  ready: number;
  serving: number;
  billing: number;
}

export interface FreezeFrameSnapshot {
  timestampMs: number;
  timestampIso: string;
  metrics: FreezeMetrics;
  tableStatus: Record<string, 'available' | 'occupied' | 'preparing' | 'ready' | 'waiting_bill' | 'closed'>;
  kdsQueue: Array<{ orderId: string; table: string; status: string; elapsedMin: number }>;
  waiterAssignments: Record<string, string>;
  inventoryState: Record<string, { reserved: number; deducted: number; rolledBack: number }>;
  customerCalls: Array<{ id: string; table: string; status: string }>;
  dots: OrderDotState[];
}

export interface StateDiffItem {
  category: 'table' | 'order' | 'kitchen' | 'inventory' | 'waiter';
  entity: string;
  before: string;
  after: string;
  highlight?: boolean;
}

export interface GhostTableOverlay {
  tableId: string;
  tableName: string;
  historicalStatus: string;
  currentStatus: string;
  hasChanged: boolean;
}

// ─── Flight Recorder ─────────────────────────────────────────────────────────

export interface FlightRecordEntry {
  event: SystemEvent;
  durationMs?: number;
}

// ─── Time Travel State ────────────────────────────────────────────────────────

export interface TimeTravelState {
  tableStatus: Record<string, string>;   // tableId → status
  kdsQueue: string[];                    // array of order IDs
  waiterAssignments: Record<string, string>; // tableId → waiterName
  inventorySnapshots: Record<string, number>; // ingredientName → qty
  billingState: Record<string, unknown>;
  customerCalls: string[];
}

// ─── Node Inspector ───────────────────────────────────────────────────────────

export interface NodeInspectorData {
  nodeId: string;
  label: string;
  currentQueue: number;
  lastEventAt?: string;
  avgDurationMs?: number;
  recentEvents: SystemEvent[];
  connectedNodes: string[];
  errors: SystemEvent[];
}

// ─── System Health ────────────────────────────────────────────────────────────

export interface HealthMetric {
  name: string;
  status: 'green' | 'amber' | 'red';
  latencyMs?: number;
  detail?: string;
}

// ─── Failure Finder ───────────────────────────────────────────────────────────

export interface FailureAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  issue: string;
  affectedOrderId?: string;
  reason: string;
  suggestedFix: string;
  detectedAt: string;
}

// ─── Replay ──────────────────────────────────────────────────────────────────

export type ReplayRange = '5min' | '15min' | '1hour' | 'today' | 'custom';
export type ReplaySpeed = 1 | 2 | 5;

// ─── Error Center & Recovery (Phase-28) ───────────────────────────────────────

export type ErrorSeverity = 'critical' | 'warning' | 'info';
export type ErrorStatus = 'active' | 'retrying' | 'resolved';

export interface SystemErrorItem {
  id: string;              // e.g. 'ERR-0007'
  orderId: string;         // e.g. 'A7K-26D00002'
  tableName: string;       // e.g. 'Table 12'
  time: string;            // e.g. '2 min ago'
  createdAt: string;
  severity: ErrorSeverity;
  status: ErrorStatus;
  title: string;           // e.g. 'Kitchen Update Failed'
  cause: string;           // e.g. 'Network timeout between Kitchen Queue and Preparing.'
  impact: string[];        // ['Order delayed', 'Waiter not notified', 'Inventory already reserved']
  suggestedFix: string;    // 'Retry kitchen synchronization.'
  correlationId: string;   // 'corr_A7K-26D00002_err'
  apiEndpoint: string;     // '/api/staff/update-order-status'
  httpStatus: string;      // '504 Gateway Timeout'
  retryCount: number;
  durationMs: number;
  failedNodeId: string;    // 'kitchen_queue'
  targetNodeId: string;    // 'order_preparing'
}

export interface ErrorAnalytics {
  totalErrorsToday: number;
  resolvedCount: number;
  avgRecoveryTimeSec: number;
  criticalCount: number;
  recoveryRatePercent: number;
}

