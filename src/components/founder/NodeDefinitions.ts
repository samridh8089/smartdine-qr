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

// ─── Canvas dimensions ────────────────────────────────────────────────────────
export const CANVAS_WIDTH = 2720;
export const CANVAS_HEIGHT = 640;

// ─── Dot colors (per event category) ─────────────────────────────────────────
export const DOT_COLORS = [
  '#10b981', '#6366f1', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#84cc16',
];
