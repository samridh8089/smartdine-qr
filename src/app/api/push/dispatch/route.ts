import { NextResponse } from 'next/server';
import { sendWebPushToRestaurant } from '@/lib/webPush';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, roles, title, body: msgBody, url, eventId, extraData, tableId } = body;

    if (!restaurantId || !roles || !title) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const count = await sendWebPushToRestaurant(restaurantId, roles, {
      title,
      body: msgBody,
      url: url || (roles.includes('kitchen') ? '/dashboard/kds' : '/dashboard/orders'),
      eventId: eventId || `evt-${Date.now()}`,
      restaurantId,
      tableId,
      timestamp: Date.now(),
      ...(extraData || {})
    });

    return NextResponse.json({ success: true, count });
  } catch (err: any) {
    console.error('[Push Dispatch API] Error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
