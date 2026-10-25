import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role configuration');
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

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

    // Authenticate caller (cookie or Bearer token)
    const authCheck = await verifyStaffRequest(req);
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    // Caller can only set push token for themselves unless super_admin
    if (authCheck.profile?.id !== userId && !authCheck.isSuperAdmin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Cannot subscribe push notifications for another user' }, { status: 403 });
    }

    const subString = JSON.stringify(subscription);
    const supabaseAdmin = getSupabaseAdmin();

    // Save Web Push subscription string in profiles.push_token
    const { error } = await supabaseAdmin
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
