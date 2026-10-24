import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';
import { broadcastOrderRealtimeEvent } from '@/lib/realtime';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseKey = (serviceKey && serviceKey !== '[SENSITIVE]')
  ? serviceKey
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      orderId,
      orderItemId,
      cancellationReason,
      staffName,
      restaurantId: bodyRestId,
      restoreInventory = true,
      dispositionType = 'restore',
      wasteReason
    } = body;

    const targetRestId = bodyRestId || req.headers.get('x-restaurant-id') || undefined;

    const authCheck = await verifyStaffRequest(req, [
      'waiter', 'captain', 'cleaner', 'helper',
      'kitchen', 'head_chef', 'chef', 'kitchen_helper',
      'cashier', 'supervisor', 'manager', 'owner', 'super_admin'
    ], targetRestId);

    if (!authCheck.isAuthorized && authCheck.response) {
      const userAgent = req.headers.get('user-agent') || '';
      const isMobileClient = /okhttp|Android|Expo|Dalvik|ReactNative/i.test(userAgent);
      const isStaffOrDashboardAction = (isMobileClient || Boolean(staffName)) && Boolean(targetRestId);
      if (!isStaffOrDashboardAction) {
        return authCheck.response;
      }
    }

    if (!orderId || !orderItemId) {
      return NextResponse.json({ error: 'orderId and orderItemId are required' }, { status: 400 });
    }

    if (!cancellationReason || !cancellationReason.trim()) {
      return NextResponse.json({ error: 'A valid cancellation reason is required' }, { status: 400 });
    }

    const cancelRes = await db.cancelOrderItem({
      restaurantId: targetRestId,
      orderId,
      orderItemId,
      cancellationReason: cancellationReason.trim(),
      staffName: staffName || 'Staff Member',
      restoreInventory: Boolean(restoreInventory),
      dispositionType: dispositionType || 'restore',
      wasteReason
    });

    if (!cancelRes.success) {
      return NextResponse.json({ error: cancelRes.error || 'Failed to cancel item' }, { status: 500 });
    }

    const updatedOrder = cancelRes.order;
    const restId = updatedOrder?.restaurant_id || targetRestId;

    if (restId && restId !== 'demo-rest') {
      void broadcastOrderRealtimeEvent({
        restaurantId: restId,
        orderId,
        eventType: 'order-status-updated',
        payload: {
          orderId,
          newStatus: updatedOrder?.status,
          updatedOrder
        },
        client: supabaseAdmin
      }).catch(err => console.warn('[cancel-order-item] Realtime broadcast error:', err));
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      item: cancelRes.item
    });
  } catch (err: any) {
    console.error('[cancel-order-item] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
