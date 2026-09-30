import { NextResponse } from 'next/server';
import { dispatchFCMNotification } from '@/lib/pushDispatcher';

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const { restaurantId, title, body, roles, extraData, tableId } = payload;

    if (!restaurantId || !title) {
      return NextResponse.json({ error: 'restaurantId and title are required' }, { status: 400 });
    }

    // Server-side async dispatch to Expo and FCM
    void dispatchFCMNotification(
      restaurantId,
      title,
      body || '',
      roles,
      extraData,
      tableId
    ).catch(err => console.error('[send-native route] Dispatch error:', err));

    return NextResponse.json({ success: true, queued: true });
  } catch (err: any) {
    console.error('[send-native route] Error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
