import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

let _supabaseAdmin: SupabaseClient | null = null;
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
    const { email, userId } = body;

    if (!email && !userId) {
      return NextResponse.json({ error: 'email or userId is required' }, { status: 400 });
    }

    // Require Owner, Manager, or Super Admin authorization
    const authCheck = await verifyStaffRequest(req, ['owner', 'manager', 'super_admin']);
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    let targetEmail = email;
    if (!targetEmail && userId) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
      targetEmail = userData?.user?.email;
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Staff email not found' }, { status: 404 });
    }

    const cleanEmail = targetEmail.trim().toLowerCase();

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cleverops.in').replace(/\/$/, '');

    // 1. Dispatch 8-digit Email OTP via production OTP Engine
    try {
      const { createAndDispatchOtp } = await import('@/lib/otpEngine');
      await createAndDispatchOtp({
        target: cleanEmail,
        type: 'staff_email',
        userId,
        recipientName: cleanEmail,
        restaurantName: 'SmartDine'
      });
    } catch (otpErr) {
      console.warn('[resend-verification] OTP dispatch error:', otpErr);
    }

    // 2. Trigger Supabase Auth signup link resend with production callback redirect URL
    const { error: resendErr } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?type=signup&next=/login?verified=true`
      }
    });

    if (resendErr) {
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: {
          redirectTo: `${siteUrl}/auth/callback?type=signup&next=/login?verified=true`
        }
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `Verification email resent to ${cleanEmail}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to resend verification email' }, { status: 500 });
  }
}
