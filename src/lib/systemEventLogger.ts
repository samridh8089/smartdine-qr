/**
 * systemEventLogger.ts
 * Phase-19: Founder Control Center — Server-Side Event Bus Writer
 *
 * RULES:
 * - Fire-and-forget: NEVER awaited in calling code (use .catch(() => {}))
 * - NEVER imported from inventoryEngine.ts or inventoryUnits.ts
 * - NEVER blocks the main API response flow
 * - Additive only: only INSERTs, never modifies existing data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

// Lazy-initialized admin client (server-side only)
let _adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(supabaseUrl, supabaseKey);
  }
  return _adminClient;
}

// ─── Event Type Registry ────────────────────────────────────────────────────

export type SystemEventType =
  // Customer journey
  | 'qr_scanned'
  | 'menu_opened'
  | 'cart_updated'
  | 'checkout_started'
  // Orders
  | 'order_created'
  | 'order_accepted'
  | 'order_preparing'
  | 'order_ready'
  | 'order_served'
  | 'order_cancelled'
  | 'order_completed'
  // Reservations
  | 'reservation_created'
  | 'reservation_updated'
  | 'reservation_seated'
  | 'reservation_cancelled'
  | 'reservation_no_show'
  // Takeaway
  | 'takeaway_created'
  | 'takeaway_preparing'
  | 'takeaway_ready'
  | 'takeaway_handed_over'
  // Waiter
  | 'waiter_assigned'
  | 'waiter_reassigned'
  | 'customer_call_accepted'
  | 'customer_call_resolved'
  // Billing
  | 'payment_success'
  | 'payment_failed'
  | 'bill_closed'
  // Inventory
  | 'inventory_reserved'
  | 'inventory_deducted'
  | 'inventory_rollback'
  | 'waste_entry'
  // System
  | 'session_closed'
  | 'push_sent'
  | 'push_failed';

// ─── Node Name Mapping ───────────────────────────────────────────────────────

const EVENT_SOURCE_NODE: Partial<Record<SystemEventType, string>> = {
  qr_scanned: 'qr_scan',
  menu_opened: 'qr_scan',
  cart_updated: 'customer_menu',
  checkout_started: 'cart',
  order_created: 'checkout',
  order_accepted: 'order_created',
  order_preparing: 'kitchen_queue',
  order_ready: 'preparing',
  waiter_assigned: 'ready',
  order_served: 'waiter_assigned',
  payment_success: 'billing',
  payment_failed: 'billing',
  bill_closed: 'payment',
  session_closed: 'payment',
  inventory_reserved: 'order_created',
  inventory_deducted: 'preparing',
  inventory_rollback: 'preparing',
  order_cancelled: 'order_created',
  takeaway_created: 'checkout',
  reservation_created: 'customer_menu',
  reservation_seated: 'order_created',
  push_sent: 'push_notifications',
  push_failed: 'push_notifications',
};

const EVENT_TARGET_NODE: Partial<Record<SystemEventType, string>> = {
  qr_scanned: 'customer_menu',
  menu_opened: 'customer_menu',
  cart_updated: 'cart',
  checkout_started: 'checkout',
  order_created: 'order_created',
  order_accepted: 'kitchen_queue',
  order_preparing: 'preparing',
  order_ready: 'ready',
  waiter_assigned: 'waiter_assigned',
  order_served: 'served',
  order_cancelled: 'session_closed',
  takeaway_created: 'order_created',
  reservation_created: 'order_created',
  reservation_seated: 'live_orders',
  payment_success: 'session_closed',
  payment_failed: 'billing',
  bill_closed: 'session_closed',
  session_closed: 'session_closed',
  inventory_reserved: 'inventory',
  inventory_deducted: 'inventory',
  inventory_rollback: 'inventory',
  customer_call_accepted: 'waiter_assigned',
  push_sent: 'kitchen_queue',
  push_failed: 'push_notifications',
};

// ─── Correlation ID Generator ─────────────────────────────────────────────────

export function generateCorrelationId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'corr_';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Returns a stable correlation ID for an order so its entire lifecycle
 * (created -> accepted -> preparing -> ready -> served) shares the same ID.
 */
export function getOrderCorrelationId(orderId?: string | null): string {
  if (!orderId) return generateCorrelationId();
  return `corr_${orderId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
}

// ─── Main Logger ──────────────────────────────────────────────────────────────

export interface LogSystemEventParams {
  restaurantId: string;
  correlationId?: string;
  orderId?: string;
  tableUuid?: string;
  actorType?: 'customer' | 'staff' | 'system' | 'kitchen' | 'waiter' | 'cashier';
  actorId?: string;
  eventType: SystemEventType;
  sourceNode?: string;
  targetNode?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export const ESSENTIAL_SYSTEM_EVENTS = new Set<SystemEventType>([
  'order_created', 'order_accepted', 'order_preparing', 'order_ready',
  'order_served', 'order_cancelled', 'order_completed',
  'reservation_created', 'reservation_seated', 'reservation_cancelled',
  'takeaway_created', 'takeaway_ready', 'takeaway_handed_over',
  'waiter_assigned', 'payment_success', 'payment_failed', 'bill_closed',
  'session_closed', 'inventory_reserved', 'inventory_deducted', 'inventory_rollback',
  'customer_call_accepted', 'customer_call_resolved',
]);

/**
 * Fire-and-forget system event logger.
 * Call with .catch(() => {}) — never await in hot paths.
 * Logs failures clearly to console instead of silently swallowing them.
 *
 * @example
 * logSystemEvent({ restaurantId, correlationId, eventType: 'order_created', orderId }).catch(() => {});
 */
export async function logSystemEvent(params: LogSystemEventParams): Promise<void> {
  try {
    if (!params.restaurantId || params.restaurantId === 'demo-rest') return;

    // Event Recorder config checks
    if (process.env.EVENT_RECORDER_ENABLED === 'false') return;
    const isProductionMode = (process.env.EVENT_RECORDER_MODE || 'production') === 'production';
    if (isProductionMode && !ESSENTIAL_SYSTEM_EVENTS.has(params.eventType)) {
      return;
    }

    const client = getAdminClient();
    const resolvedSource = params.sourceNode ?? EVENT_SOURCE_NODE[params.eventType];
    const resolvedTarget = params.targetNode ?? EVENT_TARGET_NODE[params.eventType];
    const correlationId = params.correlationId || getOrderCorrelationId(params.orderId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (client.from('system_events') as any).insert({
      restaurant_id: params.restaurantId,
      correlation_id: correlationId,
      order_id: params.orderId ?? null,
      table_uuid: params.tableUuid ?? null,
      actor_type: params.actorType ?? 'system',
      actor_id: params.actorId ?? null,
      event_type: params.eventType,
      source_node: resolvedSource ?? null,
      target_node: resolvedTarget ?? null,
      duration_ms: params.durationMs ?? null,
      metadata: params.metadata ?? {},
    });

    if (insertErr) {
      console.error('[logSystemEvent] Insert failure:', insertErr.message, insertErr);
    }
  } catch (err: unknown) {
    console.error('[logSystemEvent] Unexpected error during event logging:', err);
  }
}
