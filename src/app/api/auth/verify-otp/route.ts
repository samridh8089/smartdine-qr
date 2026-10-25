import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otpEngine';
import { createClient } from '@supabase/supabase-js';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';


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

    const validation = validateSchema(body, {
      email: { rules: [Validators.email()], required: true },
      emailOtp: { rules: [Validators.string({ min: 4, max: 10 })], required: true },
      userId: { rules: [Validators.string({ max: 100 })], required: false },
      sessionId: { rules: [Validators.string({ max: 100 })], required: false },
      verificationId: { rules: [Validators.string({ max: 100 })], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { email, emailOtp, userId, sessionId, verificationId } = body;

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = emailOtp.trim();
    const activeSessionId = sessionId || verificationId;

    // 1. Verify Email OTP via Engine
    const emailVerifyResult = await verifyOtp({
      target: cleanEmail,
      type: 'owner_email',
      otp: cleanOtp,
      sessionId: activeSessionId,
      userId
    });

    if (!emailVerifyResult.success) {
      return NextResponse.json({
        error: emailVerifyResult.message || 'Invalid or expired OTP',
        autoResent: emailVerifyResult.autoResent || false,
        newSessionId: emailVerifyResult.newSessionId || null
      }, { status: 400 });
    }

    // 2. Mark profile as verified in Database if userId is provided
    if (userId) {
      try {
        const admin = getSupabaseAdmin();
        const { data: userProf } = await admin.from('profiles').select('id, email').eq('id', userId).maybeSingle();
        if (userProf && userProf.email?.toLowerCase() === cleanEmail) {
          await admin.from('profiles').update({
            is_verified: true,
            verification_status: 'active',
            updated_at: new Date().toISOString()
          }).eq('id', userId);
        }
      } catch (e) {
        console.warn('[Verify-OTP] Profile status update notice:', e);
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Email OTP verified successfully.'
    });
  } catch (err: any) {
    return handleApiError('Verify-OTP', err, 'An error occurred while verifying OTP. Please try again.', 500);
  }
}


