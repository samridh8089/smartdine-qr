import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { healUnconsumedActiveReservations } from '@/lib/inventoryEngine';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';
import { broadcastOrderRealtimeEvent } from '@/lib/realtime';
import { logSystemEvent, getOrderCorrelationId, type SystemEventType } from '@/lib/systemEventLogger';


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

    const effectiveStatus = (newStatus === 'received' ? 'accepted' : newStatus);
    const t_start = performance.now();
    let updatedOrder: any = null;
    let updatedBatch: any = null;

    if (effectiveStatus === 'completed') {
      let targetOrderId = orderId;
      if (!targetOrderId && batchId) {
        const { data: bRec } = await supabaseAdmin.from('order_batches').select('order_id').eq('id', batchId).single();
        targetOrderId = bRec?.order_id;
      }
      if (!targetOrderId) {
        return NextResponse.json({ error: 'orderId could not be resolved for completed status' }, { status: 400 });
      }
      try {
        updatedOrder = await db.updateOrderStatus(targetOrderId, 'completed', staffName, cancellationReason);
      } catch (dbErr: any) {
        if (dbErr.status === 409 || dbErr.code === 'INVALID_STATUS_TRANSITION' || dbErr.code === 'STALE_STATUS_CONFLICT') {
          return NextResponse.json({ error: dbErr.message, code: dbErr.code }, { status: 409 });
        }
        throw dbErr;
      }
    } else if (batchId) {
      try {
        updatedOrder = await db.updateBatchStatus(batchId, effectiveStatus, staffName, cancellationReason);
      } catch (dbErr: any) {
        if (dbErr.status === 409 || dbErr.code === 'INVALID_STATUS_TRANSITION' || dbErr.code === 'STALE_STATUS_CONFLICT') {
          return NextResponse.json({ error: dbErr.message, code: dbErr.code }, { status: 409 });
        }
        throw dbErr;
      }

      const { data: bRes } = await supabaseAdmin
        .from('order_batches')
        .select('*')
        .eq('id', batchId)
        .single();
      updatedBatch = bRes;
    } else if (orderId) {
      try {
        updatedOrder = await db.updateOrderStatus(orderId, effectiveStatus, staffName, cancellationReason);
      } catch (dbErr: any) {
        if (dbErr.status === 409 || dbErr.code === 'INVALID_STATUS_TRANSITION' || dbErr.code === 'STALE_STATUS_CONFLICT') {
          return NextResponse.json({ error: dbErr.message, code: dbErr.code }, { status: 409 });
        }
        throw dbErr;
      }
    }
    const t_db = performance.now();

    const restId = updatedOrder?.restaurant_id || updatedBatch?.restaurant_id;
    const targetOrderId = orderId || updatedBatch?.order_id || updatedOrder?.id;

    if (restId && restId !== 'demo-rest') {
      // Instant Parallel Broadcast across Live Orders, KDS, Dashboard, & Customer Tracking UI
      await broadcastOrderRealtimeEvent({
        restaurantId: restId,
        orderId: targetOrderId,
        batchId,
        eventType: 'order-status-updated',
        payload: {
          orderId: targetOrderId,
          batchId,
          newStatus: effectiveStatus,
          updatedOrder,
          updatedBatch
        },
        client: supabaseAdmin
      });

      if (effectiveStatus === 'completed' || updatedOrder?.payment_status === 'paid') {
        await broadcastOrderRealtimeEvent({
          restaurantId: restId,
          orderId: targetOrderId,
          batchId,
          eventType: 'payment-updated',
          payload: {
            orderId: targetOrderId,
            paymentStatus: updatedOrder?.payment_status || 'paid',
            status: 'completed',
            updatedOrder
          },
          client: supabaseAdmin
        });
      }

      // Background reservation healing (non-blocking)
      healUnconsumedActiveReservations(restId).catch(() => {});

      // ─── Phase-19: Event Bus & Audit Trail ───────────────────────────
      const statusToEvent: Record<string, SystemEventType> = {
        accepted: 'order_accepted',
        preparing: 'order_preparing',
        ready: 'order_ready',
        served: 'order_served',
        cancelled: 'order_cancelled',
        completed: 'order_completed',
      };
      const evtType = statusToEvent[effectiveStatus];
      const stableCorrId = getOrderCorrelationId(targetOrderId);

      // Write audit log entry + emit audit_logs system event
      void (async () => {
        try {
          const { error: auditErr } = await supabaseAdmin.from('audit_logs').insert({
            restaurant_id: restId,
            user_email: staffName,
            action: `order_status_${effectiveStatus}`,
            details: `Order #${(targetOrderId || '').slice(0, 8)} transitioned to ${effectiveStatus} by ${staffName}`,
          });
          if (auditErr) {
            console.error('[audit_logs] Insert failure:', auditErr.message, auditErr);
          } else {
            // ── Phase-21: emit audit_logs node event ──────────────────────
            logSystemEvent({
              restaurantId: restId,
              correlationId: getOrderCorrelationId(targetOrderId),
              orderId: targetOrderId,
              actorType: 'system',
              eventType: 'audit_written',
              sourceNode: 'order_created',
              targetNode: 'audit_logs',
              metadata: {
                action: `order_status_${effectiveStatus}`,
                staffName,
                auditPhase: 'status_transition',
              },
            }).catch(() => {});
            // ────────────────────────────────────────────────────────────

          }
        } catch (err: unknown) {
          console.error('[audit_logs] Exception writing audit log:', err);
        }
      })();

      if (evtType) {
        logSystemEvent({
          restaurantId: restId,
          correlationId: stableCorrId,
          orderId: targetOrderId,
          actorType: 'staff',
          eventType: evtType,
          metadata: {
            staffName,
            batchId: batchId || null,
            cancellationReason: cancellationReason || null,
          },
        }).catch(() => {});

        // ── Secondary cascade events for full pipeline coverage ──────────────
        // After accepted → order moves to Kitchen Queue
        if (effectiveStatus === 'accepted') {
          logSystemEvent({
            restaurantId: restId,
            correlationId: stableCorrId,
            orderId: targetOrderId,
            actorType: 'kitchen',
            eventType: 'order_preparing',  // Represents entering kitchen queue
            sourceNode: 'live_orders',
            targetNode: 'kitchen_queue',
            metadata: { staffName, phase: 'kitchen_queue_entry' },
          }).catch(() => {});
        }

        // After preparing → inventory consumed by inventoryEngine
        if (effectiveStatus === 'preparing') {
          logSystemEvent({
            restaurantId: restId,
            correlationId: stableCorrId,
            orderId: targetOrderId,
            actorType: 'kitchen',
            eventType: 'inventory_deducted',
            sourceNode: 'kitchen_queue',
            targetNode: 'inventory',
            metadata: { staffName, phase: 'inventory_consumption' },
          }).catch(() => {});
        }


        // After ready → auto waiter_assigned (waiter will serve next)
        if (effectiveStatus === 'ready') {
          logSystemEvent({
            restaurantId: restId,
            correlationId: stableCorrId,
            orderId: targetOrderId,
            actorType: 'waiter',
            eventType: 'waiter_assigned',
            sourceNode: 'ready',
            targetNode: 'waiter_assigned',
            metadata: { staffName, autoAssigned: true },
          }).catch(() => {});
        }

        // After served → billing initiated
        if (effectiveStatus === 'served') {
          logSystemEvent({
            restaurantId: restId,
            correlationId: stableCorrId,
            orderId: targetOrderId,
            actorType: 'system',
            eventType: 'bill_closed',
            sourceNode: 'served',
            targetNode: 'billing',
            metadata: { staffName, billingPhase: 'bill_generated' },
          }).catch(() => {});
        }

        // After completed → payment verified + session closed → report generated
        if (effectiveStatus === 'completed') {
          logSystemEvent({
            restaurantId: restId,
            correlationId: stableCorrId,
            orderId: targetOrderId,
            actorType: 'system',
            eventType: 'payment_success',
            sourceNode: 'billing',
            targetNode: 'payment',
            metadata: {
              staffName,
              paymentStatus: updatedOrder?.payment_status || 'paid',
              paymentMethod: updatedOrder?.payment_method || 'cash',
              total: updatedOrder?.total || 0,
            },
          }).catch(() => {});

          logSystemEvent({
            restaurantId: restId,
            correlationId: stableCorrId,
            orderId: targetOrderId,
            actorType: 'system',
            eventType: 'session_closed',
            sourceNode: 'payment',
            targetNode: 'session_closed',
            metadata: { staffName },
          }).catch(() => {});

          logSystemEvent({
            restaurantId: restId,
            correlationId: stableCorrId,
            orderId: targetOrderId,
            actorType: 'system',
            eventType: 'report_generated',
            sourceNode: 'session_closed',
            targetNode: 'reports',
            metadata: {
              staffName,
              revenue: updatedOrder?.total || 0,
              paymentMethod: updatedOrder?.payment_method || 'cash',
              orderType: updatedOrder?.order_type || 'dine_in',
              reportType: 'order_session_closed',
            },
          }).catch(() => {});
        }


        // ────────────────────────────────────────────────────────────────────
      }
      // ─────────────────────────────────────────────────────────────────────
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


