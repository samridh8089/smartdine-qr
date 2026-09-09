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

export type FounderMode = 'live' | 'replay' | 'system' | 'debug';

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
