import { NextResponse } from 'next/server';
import { dispatchFCMNotification } from '@/lib/pushDispatcher';

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const { restaurantId, title, body, roles, extraData, tableId } = payload;

    if (!restaurantId || !title) {
      return NextResponse.json({ error: 'restaurantId and title are required' }, { status: 400 });
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
