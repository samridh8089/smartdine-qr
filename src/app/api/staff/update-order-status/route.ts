import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { healUnconsumedActiveReservations } from '@/lib/inventoryEngine';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';
import { broadcastOrderRealtimeEvent } from '@/lib/realtime';
import { logSystemEvent, getOrderCorrelationId, type SystemEventType } from '@/lib/systemEventLogger';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = (serviceKey && serviceKey !== '[SENSITIVE]')
  ? serviceKey
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const authCheck = await verifyStaffRequest(req, ['waiter', 'kitchen', 'cashier', 'supervisor', 'manager', 'owner', 'super_admin']);
    if (!authCheck.isAuthorized && authCheck.response) {
      return authCheck.response;
    }

    const body = await req.json();

    const normalizedBody = {
      ...body,
      newStatus: body.newStatus || body.status,
    };

    const validation = validateSchema(normalizedBody, {
      batchId: { rules: [Validators.string({ max: 100 })], required: false },
      orderId: { rules: [Validators.string({ max: 100 })], required: false },
      newStatus: { rules: [Validators.enum(['accepted', 'received', 'preparing', 'ready', 'served', 'completed', 'cancelled'] as const)], required: true },
      staffName: { rules: [Validators.string({ max: 100 })], required: false },
      cancellationReason: { rules: [Validators.string({ max: 500 })], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { batchId, orderId, newStatus, staffName: inputStaffName, cancellationReason } = normalizedBody;
    const staffName = authCheck.profile?.full_name || inputStaffName || authCheck.user?.email || 'Staff';

    if (!batchId && !orderId) {
      return NextResponse.json({ error: 'batchId or orderId is required' }, { status: 400 });
    }

    const effectiveStatus = (newStatus === 'received' ? 'accepted' : newStatus);

    // Enforce role-based status transition restrictions
    const callerRole = authCheck.isSuperAdmin ? 'super_admin' : (authCheck.profile?.role || 'owner');
    const statusRoleMap: Record<string, string[]> = {
      preparing: ['kitchen', 'supervisor', 'manager', 'owner', 'super_admin'],
      ready: ['kitchen', 'supervisor', 'manager', 'owner', 'super_admin'],
      served: ['kitchen', 'waiter', 'cashier', 'supervisor', 'manager', 'owner', 'super_admin'],
      completed: ['cashier', 'waiter', 'supervisor', 'manager', 'owner', 'super_admin'],
      accepted: ['waiter', 'kitchen', 'cashier', 'supervisor', 'manager', 'owner', 'super_admin'],
      cancelled: ['kitchen', 'waiter', 'cashier', 'supervisor', 'manager', 'owner', 'super_admin'],
    };

    const allowedRolesForStatus = statusRoleMap[effectiveStatus];
    if (allowedRolesForStatus && !authCheck.isSuperAdmin && !allowedRolesForStatus.includes(callerRole)) {
      return NextResponse.json({
        error: 'FORBIDDEN',
        message: `Role "${callerRole}" is not authorized to update order status to "${effectiveStatus}".`
      }, { status: 403 });
    }

    // Resolve target restaurant_id to enforce multi-tenant isolation
    let orderRestId: string | null = null;
    if (orderId) {
      const { data: ord } = await supabaseAdmin.from('orders').select('restaurant_id').eq('id', orderId).maybeSingle();
      orderRestId = ord?.restaurant_id;
    } else if (batchId) {
      const { data: bRec } = await supabaseAdmin.from('order_batches').select('order_id').eq('id', batchId).maybeSingle();
      if (bRec?.order_id) {
        const { data: ord } = await supabaseAdmin.from('orders').select('restaurant_id').eq('id', bRec.order_id).maybeSingle();
        orderRestId = ord?.restaurant_id;
      }
    }

    if (orderRestId && !authCheck.isSuperAdmin) {
      if (authCheck.profile?.restaurant_id && authCheck.profile.restaurant_id !== orderRestId) {
        return NextResponse.json({
          error: 'TENANT_MISMATCH',
          message: 'Forbidden: You cannot update orders for another restaurant.'
        }, { status: 403 });
      }
    }
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
      // Instant Non-blocking Parallel Broadcast across Live Orders, KDS, Dashboard, & Customer Tracking UI
      void broadcastOrderRealtimeEvent({
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
      }).catch(err => console.warn('[update-order-status] Realtime broadcast error:', err));

      if (effectiveStatus === 'completed' || updatedOrder?.payment_status === 'paid') {
        void broadcastOrderRealtimeEvent({
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
        }).catch(err => console.warn('[update-order-status] Realtime payment broadcast error:', err));
      }

      // P1-07: Table status lifecycle sync — release table upon completed or cancelled
      const tableId = updatedOrder?.table_id;
      if (tableId) {
        const isReleaseStatus = effectiveStatus === 'completed' || effectiveStatus === 'cancelled';
        let targetTableStatus = 'occupied';

        if (isReleaseStatus) {
          try {
            // Check if any other active dine-in orders remain on this table
            const { data: remainingOrders } = await supabaseAdmin
              .from('orders')
              .select('id')
              .eq('restaurant_id', restId)
              .eq('table_id', tableId)
              .not('status', 'in', '(completed,cancelled)')
              .neq('id', targetOrderId);

            if (!remainingOrders || remainingOrders.length === 0) {
              targetTableStatus = 'available';

              // 1. Release table state in restaurant settings
              const { data: restData } = await supabaseAdmin
                .from('restaurants')
                .select('settings')
                .eq('id', restId)
                .single();

              if (restData?.settings) {
                const tableStates = { ...(restData.settings.table_states || {}) };
                if (tableStates[tableId]) {
                  tableStates[tableId] = {
                    ...tableStates[tableId],
                    occupancy_status: tableStates[tableId].qr_enabled === false ? 'inactive' : 'available',
                    manual_occupied: false,
                    occupied_at: null,
                    current_session_id: null
                  };
                  await supabaseAdmin
                    .from('restaurants')
                    .update({
                      settings: {
                        ...restData.settings,
                        table_states: tableStates
                      }
                    })
                    .eq('id', restId);
                }
              }

              // 2. Release tables row status
              await supabaseAdmin
                .from('tables')
                .update({ status: 'available' })
                .eq('id', tableId);
            }
          } catch (relErr) {
            console.warn('[update-order-status] Table release sync warning:', relErr);
          }
        }

        void broadcastOrderRealtimeEvent({
          restaurantId: restId,
          orderId: targetOrderId,
          eventType: 'table-status-updated',
          payload: {
            tableId,
            tableName: updatedOrder?.table_name,
            status: targetTableStatus,
            orderId: targetOrderId,
            newStatus: effectiveStatus
          },
          client: supabaseAdmin
        }).catch(err => console.warn('[update-order-status] Realtime table broadcast error:', err));
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
    console.error('[Staff-Update-Order-Status] Actual error:', err);
    return NextResponse.json({ 
      error: err.message || 'Failed to update order status.',
      stack: err.stack,
      details: err
    }, { status: 500 });
  }
}


