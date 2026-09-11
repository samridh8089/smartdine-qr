/**
 * Phase-19: Founder Control Center — Graph Node & Edge Definitions
 * Layout: horizontal flow, left→right, 2400px wide canvas
 */

import type { GraphNode, GraphEdge } from './types';

// ─── Node Dimensions ─────────────────────────────────────────────────────────
const W = 150; // node width
const H = 54;  // node height
const MY = 300; // main flow Y center
const SY_TOP = 130; // side nodes top row Y
const SY_BOT = 480; // side nodes bottom row Y

// ─── Node Definitions ─────────────────────────────────────────────────────────
export const GRAPH_NODES: GraphNode[] = [
  // ── Main pipeline ────────────────────────────────────────────────────────
  { id: 'qr_scan',        label: 'QR Scan',        x: 30,   y: MY, width: W, height: H, type: 'main', color: '#1d4ed8', description: 'Customer scans QR code at table' },
  { id: 'customer_menu',  label: 'Customer Menu',   x: 220,  y: MY, width: W, height: H, type: 'main', color: '#1d4ed8', description: 'Customer browses the menu' },
  { id: 'cart',           label: 'Cart',            x: 410,  y: MY, width: W, height: H, type: 'main', color: '#1d4ed8', description: 'Items added to cart' },
  { id: 'checkout',       label: 'Checkout',        x: 600,  y: MY, width: W, height: H, type: 'main', color: '#6d28d9', description: 'Order submitted by customer' },
  { id: 'order_created',  label: 'Order Created',   x: 790,  y: MY, width: W, height: H, type: 'main', color: '#059669', description: 'Order recorded in database' },
  { id: 'live_orders',    label: 'Live Orders',     x: 980,  y: MY, width: W, height: H, type: 'main', color: '#0891b2', description: 'Staff sees order in Live Orders' },
  { id: 'kitchen_queue',  label: 'Kitchen Queue',   x: 1170, y: MY, width: W, height: H, type: 'main', color: '#d97706', description: 'Order enters KDS queue' },
  { id: 'preparing',      label: 'Preparing',       x: 1360, y: MY, width: W, height: H, type: 'main', color: '#ea580c', description: 'Kitchen is preparing the order' },
  { id: 'ready',          label: 'Ready',           x: 1550, y: MY, width: W, height: H, type: 'main', color: '#16a34a', description: 'Order is ready for pickup' },
  { id: 'waiter_assigned',label: 'Waiter Assigned', x: 1740, y: MY, width: W, height: H, type: 'main', color: '#7c3aed', description: 'Waiter assigned to deliver' },
  { id: 'served',         label: 'Served',          x: 1930, y: MY, width: W, height: H, type: 'main', color: '#16a34a', description: 'Order served to customer' },
  { id: 'billing',        label: 'Billing',         x: 2120, y: MY, width: W, height: H, type: 'main', color: '#be185d', description: 'Bill generated' },
  { id: 'payment',        label: 'Payment',         x: 2310, y: MY, width: W, height: H, type: 'main', color: '#be185d', description: 'Payment processed' },
  { id: 'session_closed', label: 'Session Closed',  x: 2500, y: MY, width: W, height: H, type: 'main', color: '#475569', description: 'Table session ended' },

  // ── Side nodes ───────────────────────────────────────────────────────────
  { id: 'inventory',         label: 'Inventory',          x: 1265, y: SY_TOP, width: W, height: H, type: 'side', color: '#0f766e', description: 'Inventory reserve & deduct' },
  { id: 'customer_calls',    label: 'Customer Calls',     x: 1835, y: SY_TOP, width: W, height: H, type: 'side', color: '#b45309', description: 'Customer call waiter events' },
  { id: 'push_notifications',label: 'Push Notifications', x: 1455, y: SY_TOP, width: W, height: H, type: 'side', color: '#6d28d9', description: 'FCM push alerts' },
  { id: 'audit_logs',        label: 'Audit Logs',         x: 885,  y: SY_BOT, width: W, height: H, type: 'side', color: '#374151', description: 'System audit trail' },
  { id: 'reports',           label: 'Reports',            x: 2215, y: SY_BOT, width: W, height: H, type: 'side', color: '#1e3a5f', description: 'Analytics & reports' },
];

// ─── Edge Definitions ─────────────────────────────────────────────────────────
export const GRAPH_EDGES: GraphEdge[] = [
  // Main pipeline
  { from: 'qr_scan',        to: 'customer_menu',   type: 'main' },
  { from: 'customer_menu',  to: 'cart',            type: 'main' },
  { from: 'cart',           to: 'checkout',        type: 'main' },
  { from: 'checkout',       to: 'order_created',   type: 'main' },
  { from: 'order_created',  to: 'live_orders',     type: 'main' },
  { from: 'live_orders',    to: 'kitchen_queue',   type: 'main' },
  { from: 'kitchen_queue',  to: 'preparing',       type: 'main' },
  { from: 'preparing',      to: 'ready',           type: 'main' },
  { from: 'ready',          to: 'waiter_assigned', type: 'main' },
  { from: 'waiter_assigned',to: 'served',          type: 'main' },
  { from: 'served',         to: 'billing',         type: 'main' },
  { from: 'billing',        to: 'payment',         type: 'main' },
  { from: 'payment',        to: 'session_closed',  type: 'main' },
  // Side connections
  { from: 'inventory',         to: 'kitchen_queue',  type: 'side' },
  { from: 'inventory',         to: 'preparing',      type: 'side' },
  { from: 'push_notifications',to: 'kitchen_queue',  type: 'side' },
  { from: 'push_notifications',to: 'waiter_assigned',type: 'side' },
  { from: 'customer_calls',    to: 'waiter_assigned',type: 'side' },
  { from: 'audit_logs',        to: 'order_created',  type: 'side' },
  { from: 'reports',           to: 'payment',        type: 'side' },
];

// ─── Event Type → Node ID Mapping ────────────────────────────────────────────
export const EVENT_TO_NODE: Record<string, string> = {
  qr_scanned:              'qr_scan',
  menu_opened:             'customer_menu',
  cart_updated:            'cart',
  checkout_started:        'checkout',
  order_created:           'order_created',
  order_accepted:          'live_orders',
  order_preparing:         'preparing',
  order_ready:             'ready',
  waiter_assigned:         'waiter_assigned',
  waiter_reassigned:       'waiter_assigned',
  order_served:            'served',
  order_cancelled:         'session_closed',
  order_completed:         'session_closed',
  payment_success:         'payment',
  payment_failed:          'billing',
  bill_closed:             'billing',
  session_closed:          'session_closed',
  inventory_reserved:      'inventory',
  inventory_deducted:      'inventory',
  inventory_rollback:      'inventory',
  waste_entry:             'inventory',
  customer_call_accepted:  'customer_calls',
  customer_call_resolved:  'customer_calls',
  push_sent:               'push_notifications',
  push_failed:             'push_notifications',
  audit_written:           'audit_logs',
  report_generated:        'reports',
  reservation_created:     'order_created',
  reservation_seated:      'live_orders',
  takeaway_created:        'order_created',
};



// ─── Node lookup by ID ────────────────────────────────────────────────────────
export const NODE_MAP: Record<string, GraphNode> = Object.fromEntries(
  GRAPH_NODES.map(n => [n.id, n])
);

export const NODE_LABEL_MAP: Record<string, string> = Object.fromEntries(
  GRAPH_NODES.map(n => [n.id, n.label])
);

export interface NodeMetaSpec {
  apiEndpoint: string;
  dbTable: string;
  lastEventDefault: string;
  defaultDurationMs: number;
}

export const NODE_METADATA_SPECS: Record<string, NodeMetaSpec> = {
  qr_scan: { apiEndpoint: 'GET /api/customer/table-session', dbTable: 'table_sessions', lastEventDefault: 'qr_scanned', defaultDurationMs: 45 },
  customer_menu: { apiEndpoint: 'GET /api/menu', dbTable: 'menu_items', lastEventDefault: 'menu_opened', defaultDurationMs: 80 },
  cart: { apiEndpoint: 'POST /api/customer/cart', dbTable: 'cart_sessions', lastEventDefault: 'cart_updated', defaultDurationMs: 65 },
  checkout: { apiEndpoint: 'POST /api/customer/orders/checkout', dbTable: 'orders (draft)', lastEventDefault: 'checkout_started', defaultDurationMs: 140 },
  order_created: { apiEndpoint: 'POST /api/customer/orders', dbTable: 'orders', lastEventDefault: 'order_created', defaultDurationMs: 110 },
  live_orders: { apiEndpoint: 'POST /api/staff/update-order-status', dbTable: 'orders', lastEventDefault: 'order_accepted', defaultDurationMs: 95 },
  kitchen_queue: { apiEndpoint: 'POST /api/kds/queue', dbTable: 'kitchen_tickets', lastEventDefault: 'kds_queued', defaultDurationMs: 130 },
  preparing: { apiEndpoint: 'PATCH /api/staff/update-order-status', dbTable: 'orders (preparing)', lastEventDefault: 'order_preparing', defaultDurationMs: 450 },
  ready: { apiEndpoint: 'POST /api/ready', dbTable: 'orders (ready)', lastEventDefault: 'order_ready', defaultDurationMs: 120 },
  waiter_assigned: { apiEndpoint: 'POST /api/staff/table-assignments', dbTable: 'staff_assignments', lastEventDefault: 'waiter_assigned', defaultDurationMs: 160 },
  served: { apiEndpoint: 'PATCH /api/staff/update-order-status', dbTable: 'orders (served)', lastEventDefault: 'order_served', defaultDurationMs: 85 },
  billing: { apiEndpoint: 'POST /api/payments/create-order', dbTable: 'bills', lastEventDefault: 'bill_closed', defaultDurationMs: 210 },
  payment: { apiEndpoint: 'POST /api/payments/verify', dbTable: 'payments', lastEventDefault: 'payment_success', defaultDurationMs: 340 },
  session_closed: { apiEndpoint: 'POST /api/tables/release', dbTable: 'table_sessions', lastEventDefault: 'session_closed', defaultDurationMs: 90 },
  inventory: { apiEndpoint: 'RPC deduct_inventory_on_preparing', dbTable: 'inventory_transactions', lastEventDefault: 'inventory_deducted', defaultDurationMs: 55 },
  customer_calls: { apiEndpoint: 'POST /api/customer/call-waiter', dbTable: 'customer_calls', lastEventDefault: 'customer_call_accepted', defaultDurationMs: 70 },
  push_notifications: { apiEndpoint: 'POST /api/push/dispatch', dbTable: 'push_subscriptions', lastEventDefault: 'push_sent', defaultDurationMs: 180 },
  audit_logs: { apiEndpoint: 'POST /api/system-events', dbTable: 'system_events', lastEventDefault: 'audit_written', defaultDurationMs: 40 },
  reports: { apiEndpoint: 'GET /api/reports/daily-metrics', dbTable: 'orders, payments, inventory', lastEventDefault: 'report_generated', defaultDurationMs: 120 },
};

/**
 * Maps any event type, alias, or raw string to a guaranteed canonical Graph Node ID.
 * Eliminates 'Node not found' completely.
 */
export function toCanonicalNodeId(idOrEvent: string | null | undefined): string {
  if (!idOrEvent) return 'reports';
  if (NODE_MAP[idOrEvent]) return idOrEvent;
  if (EVENT_TO_NODE[idOrEvent]) return EVENT_TO_NODE[idOrEvent];

  const lower = idOrEvent.toLowerCase().trim();
  if (NODE_MAP[lower]) return lower;
  if (EVENT_TO_NODE[lower]) return EVENT_TO_NODE[lower];

  if (lower.includes('prep')) return 'preparing';
  if (lower.includes('kitchen')) return 'kitchen_queue';
  if (lower.includes('qr')) return 'qr_scan';
  if (lower.includes('menu')) return 'customer_menu';
  if (lower.includes('cart')) return 'cart';
  if (lower.includes('checkout')) return 'checkout';
  if (lower.includes('create')) return 'order_created';
  if (lower.includes('live') || lower.includes('accept')) return 'live_orders';
  if (lower.includes('ready')) return 'ready';
  if (lower.includes('waiter')) return 'waiter_assigned';
  if (lower.includes('serve')) return 'served';
  if (lower.includes('bill')) return 'billing';
  if (lower.includes('pay')) return 'payment';
  if (lower.includes('session')) return 'session_closed';
  if (lower.includes('inventory') || lower.includes('stock')) return 'inventory';
  if (lower.includes('call')) return 'customer_calls';
  if (lower.includes('push')) return 'push_notifications';
  if (lower.includes('audit')) return 'audit_logs';
  if (lower.includes('report')) return 'reports';

  return 'reports';
}

// ─── Canvas dimensions ────────────────────────────────────────────────────────
export const CANVAS_WIDTH = 2720;
export const CANVAS_HEIGHT = 640;

// ─── Dot colors (per event category) ─────────────────────────────────────────
export const DOT_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
];

