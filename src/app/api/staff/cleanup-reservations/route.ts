import { NextResponse } from 'next/server';
import { cleanupOrphanReservations } from '@/lib/inventoryEngine';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const restaurantId = searchParams.get('restaurantId') || body?.restaurantId;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const authCheck = await verifyStaffRequest(
      req,
      ['waiter', 'cashier', 'kitchen', 'supervisor', 'manager', 'owner', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized && authCheck.response) {
      return authCheck.response;
    }

    const result = await cleanupOrphanReservations(restaurantId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[cleanup-reservations] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
