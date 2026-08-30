import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { healUnconsumedActiveReservations } from '@/lib/inventoryEngine';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateSchema(body, {
      batchId: { rules: [Validators.string({ max: 100 })], required: false },
      orderId: { rules: [Validators.string({ max: 100 })], required: false },
      newStatus: { rules: [Validators.enum(['received', 'preparing', 'ready', 'served', 'completed', 'cancelled'] as const)], required: true },
      staffName: { rules: [Validators.string({ max: 100 })], required: false },
      cancellationReason: { rules: [Validators.string({ max: 500 })], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { batchId, orderId, newStatus, staffName = 'Staff', cancellationReason } = body;

    if (!batchId && !orderId) {
      return NextResponse.json({ error: 'batchId or orderId is required' }, { status: 400 });
    }

    const t_start = performance.now();
    let updatedOrder: any = null;
    let updatedBatch: any = null;

    if (batchId) {
      updatedOrder = await db.updateBatchStatus(batchId, newStatus, staffName, cancellationReason);
      const { data: bRes } = await supabaseAdmin.from('order_batches').select('*').eq('id', batchId).single();
      updatedBatch = bRes;
    } else if (orderId) {
      updatedOrder = await db.updateOrderStatus(orderId, newStatus, staffName, cancellationReason);
    }
    const t_db = performance.now();

    const restId = updatedOrder?.restaurant_id || updatedBatch?.restaurant_id;
    const targetOrderId = orderId || updatedBatch?.order_id || updatedOrder?.id;

    if (restId) {
      const kdsChannel = `kds_${restId}`;
      const dashboardChannel = `overview_dashboard_${restId}`;
      const trackingChannel = targetOrderId ? `order_tracking_${targetOrderId}` : null;
      const custTrackingChannel = targetOrderId ? `customer_order_tracking_${targetOrderId}` : null;

      // Instant Parallel Broadcast across KDS, Dashboard, & Customer Tracking UI
      const broadcastPromises: Promise<any>[] = [
        supabaseAdmin.channel(kdsChannel).send({
          type: 'broadcast',
          event: 'order-status-updated',
          payload: { orderId: targetOrderId, batchId, newStatus, updatedOrder, updatedBatch }
        }),
        supabaseAdmin.channel(dashboardChannel).send({
          type: 'broadcast',
          event: 'order-status-updated',
          payload: { orderId: targetOrderId, batchId, newStatus, updatedOrder }
        })
      ];

      if (trackingChannel) {
        broadcastPromises.push(
          supabaseAdmin.channel(trackingChannel).send({
            type: 'broadcast',
            event: 'status-update',
            payload: { orderId: targetOrderId, newStatus, updatedOrder }
          })
        );
      }
      if (custTrackingChannel) {
        broadcastPromises.push(
          supabaseAdmin.channel(custTrackingChannel).send({
            type: 'broadcast',
            event: 'order-status-updated',
            payload: { orderId: targetOrderId, newStatus, updatedOrder }
          })
        );
      }

      await Promise.all(broadcastPromises).catch(e => console.error('WebSocket broadcast status update failed:', e));

      // Background reservation healing (non-blocking)
      healUnconsumedActiveReservations(restId).catch(() => {});
    }

    const t_end = performance.now();
    const dbDur = Math.round((t_db - t_start) * 10) / 10;
    const totalDur = Math.round((t_end - t_start) * 10) / 10;

    const res = NextResponse.json({
      success: true,
      batch: updatedBatch,
      order: updatedOrder
    });

    res.headers.set('Server-Timing', `db;dur=${dbDur}, total;dur=${totalDur}`);
    return res;
  } catch (err: any) {
    return handleApiError('Staff-Update-Order-Status', err, 'Failed to update order status. Please try again.', 500);
  }
}


