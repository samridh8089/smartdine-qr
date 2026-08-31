import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, userId, restaurantId } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid push subscription payload' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const subString = JSON.stringify(subscription);

    // Save Web Push subscription string in profiles.push_token
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: subString, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('[Push API] Error saving subscription:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Push API] Web push subscription registered successfully for user ${userId}`);
    return NextResponse.json({ success: true, message: 'Web Push subscription registered successfully' });
  } catch (err: any) {
    console.error('[Push API] Server error:', err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
