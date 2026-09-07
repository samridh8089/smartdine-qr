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
      newStatus: { rules: [Validators.enum(['accepted', 'received', 'preparing', 'ready', 'served', 'completed', 'cancelled'] as const)], required: true },
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
      const nowIso = new Date().toISOString();
      const batchUpdate: any = { 
        status: newStatus === 'completed' ? 'served' : newStatus, 
        updated_at: nowIso 
      };

      if (newStatus === 'accepted') {
        batchUpdate.accepted_at = nowIso;
        batchUpdate.accepted_by = staffName;
      } else if (newStatus === 'preparing') {
        batchUpdate.preparing_at = nowIso;
        batchUpdate.preparing_by = staffName;
      } else if (newStatus === 'ready') {
        batchUpdate.ready_at = nowIso;
        batchUpdate.ready_by = staffName;
      } else if (newStatus === 'served' || newStatus === 'completed') {
        batchUpdate.served_at = nowIso;
        batchUpdate.served_by = staffName;
      } else if (newStatus === 'cancelled') {
        batchUpdate.special_instructions = `[CANCELLED] ${cancellationReason || 'Cancelled'}`;
      }

      const { data: bRes } = await supabaseAdmin
        .from('order_batches')
        .update(batchUpdate)
        .eq('id', batchId)
        .select()
        .single();
      updatedBatch = bRes;

      // Invoke db side-effects (inventory reservations, logs)
      try {
        updatedOrder = await db.updateBatchStatus(batchId, newStatus, staffName, cancellationReason);
      } catch (dbErr) {
        console.warn('db.updateBatchStatus side-effect notice:', dbErr);
      }

      // Authoritatively update parent order status based on all batches
      const parentOrderId = orderId || updatedBatch?.order_id || updatedOrder?.id;
      if (parentOrderId) {
        const { data: allBatches } = await supabaseAdmin
          .from('order_batches')
          .select('id, status, special_instructions')
          .eq('order_id', parentOrderId);

        const activeBatches = (allBatches || []).filter(b => 
          ['new', 'accepted', 'preparing', 'ready'].includes(b.status) && 
          !b.special_instructions?.includes('[CANCELLED]')
        );

        let parentStatus = newStatus;
        if (activeBatches.length > 0) {
          if (activeBatches.some(b => b.status === 'ready')) {
            parentStatus = 'ready';
          } else if (activeBatches.some(b => b.status === 'preparing')) {
            parentStatus = 'preparing';
          } else if (activeBatches.some(b => b.status === 'accepted')) {
            parentStatus = 'accepted';
          } else {
            parentStatus = 'new';
          }
        } else if ((allBatches || []).some(b => b.status === 'served' || b.status === 'completed')) {
          parentStatus = 'served';
        }

        const orderUpdate: any = { status: parentStatus, updated_at: nowIso };
        if (parentStatus === 'served') {
          orderUpdate.completed_at = nowIso;
          orderUpdate.completed_by = staffName;
        }

        const { data: ordData } = await supabaseAdmin
          .from('orders')
          .update(orderUpdate)
          .eq('id', parentOrderId)
          .select()
          .single();

        if (ordData) updatedOrder = ordData;
      }
    } else if (orderId) {
      const nowIso = new Date().toISOString();
      const orderUpdate: any = { status: newStatus, updated_at: nowIso };
      if (newStatus === 'served' || newStatus === 'completed') {
        orderUpdate.completed_at = nowIso;
        orderUpdate.completed_by = staffName;
      }
      const { data: ordData } = await supabaseAdmin
        .from('orders')
        .update(orderUpdate)
        .eq('id', orderId)
        .select()
        .single();

      if (newStatus === 'cancelled') {
        await supabaseAdmin
          .from('order_batches')
          .update({
            status: 'cancelled',
            special_instructions: cancellationReason ? `[CANCELLED] ${cancellationReason}` : '[CANCELLED]',
            updated_at: nowIso
          })
          .eq('order_id', orderId)
          .neq('status', 'cancelled');
      }

      try {
        updatedOrder = await db.updateOrderStatus(orderId, newStatus, staffName, cancellationReason);
      } catch (dbErr) {
        console.warn('db.updateOrderStatus side-effect notice:', dbErr);
      }
      if (ordData) updatedOrder = ordData;
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


