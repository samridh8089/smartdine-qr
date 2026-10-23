import { NextResponse } from 'next/server';
import { cleanupOldAttendanceSelfies } from '@/lib/attendoEngine';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const restaurantId = searchParams.get('restaurantId') || body?.restaurantId;
    const daysThreshold = parseInt(searchParams.get('days') || body?.days || '30', 10);

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const authCheck = await verifyStaffRequest(
      req,
      ['supervisor', 'manager', 'owner', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized && authCheck.response) {
      return authCheck.response;
    }

    const result = await cleanupOldAttendanceSelfies(restaurantId, isNaN(daysThreshold) ? 30 : daysThreshold);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[cleanup-selfies] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
