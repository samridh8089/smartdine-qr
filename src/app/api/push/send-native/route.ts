import { NextResponse } from 'next/server';
import { dispatchFCMNotification } from '@/lib/pushDispatcher';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const { restaurantId, title, body, roles, extraData, tableId } = payload;

    if (!restaurantId || !title) {
      return NextResponse.json({ error: 'restaurantId and title are required' }, { status: 400 });
    }

    // Mandatory Authorization: Only authenticated staff or internal services can dispatch notifications (Finding C6)
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'supervisor', 'head_chef', 'chef', 'kitchen', 'waiter', 'captain', 'cashier', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    // Await dispatch so Vercel Serverless does not freeze before HTTP request completes
    await dispatchFCMNotification(
      restaurantId,
      title,
      body || '',
      roles,
      extraData,
      tableId
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[send-native route] Error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
