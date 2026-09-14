import { supabase } from './supabase';

export interface RealtimeOrderPayload {
  orderId?: string;
  batchId?: string;
  newStatus?: string;
  paymentStatus?: string;
  updatedOrder?: any;
  updatedBatch?: any;
  timestamp?: number;
  [key: string]: any;
}

/**
 * Centrally broadcast order, status, and payment events in parallel across all relevant
 * tenant-scoped Supabase Realtime channels (Live Orders, KDS, Owner Dashboard, Customer Tracking).
 */
export async function broadcastOrderRealtimeEvent({
  restaurantId,
  orderId,
  batchId,
  eventType,
  payload,
  client = supabase
}: {
  restaurantId: string;
  orderId?: string;
  batchId?: string;
  eventType: 'new-order' | 'order-status-updated' | 'payment-updated' | 'table-status-updated';
  payload: any;
  client?: any;
}) {
  if (!restaurantId) return;

  const resolvedOrderId = orderId || payload?.orderId || payload?.updatedOrder?.id;

  const targetChannels: string[] = [
    `live_orders_${restaurantId}`,
    `kds_${restaurantId}`,
    `overview_dashboard_${restaurantId}`,
    `reports_${restaurantId}`,
    `tables_${restaurantId}`,
    `floorplan_${restaurantId}`,
    `floorplan_live_${restaurantId}`,
    `founder_events_${restaurantId}`
  ];

  if (resolvedOrderId) {
    targetChannels.push(`customer_order_tracking_${resolvedOrderId}`);
    targetChannels.push(`order_tracking_${resolvedOrderId}`);
  }

  const broadcastPayload = {
    ...payload,
    orderId: resolvedOrderId,
    batchId: batchId || payload?.batchId,
    timestamp: Date.now()
  };

  const promises = targetChannels.map(async (chName) => {
    try {
      const ch = client.channel(chName, {
        config: { broadcast: { self: true } }
      });
      if (typeof window === 'undefined') {
        await new Promise<void>((resolve) => {
          let resolved = false;
          ch.subscribe((status: string) => {
            if (status === 'SUBSCRIBED' || status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              if (!resolved) {
                resolved = true;
                resolve();
              }
            }
          });
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }, 350);
        });
      }
      await ch.send({
        type: 'broadcast',
        event: eventType,
        payload: broadcastPayload
      });
      if (typeof window === 'undefined') {
        setTimeout(() => {
          try { client.removeChannel(ch); } catch (_) {}
        }, 150);
      }
    } catch (e) {
      console.warn(`[Realtime] Failed broadcast of "${eventType}" to "${chName}":`, e);
    }
  });

  await Promise.all(promises).catch(err => {
    console.error('[Realtime] broadcastOrderRealtimeEvent batch error:', err);
  });
}
