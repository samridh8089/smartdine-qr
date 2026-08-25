import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otpEngine';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, emailOtp, userId, sessionId, verificationId } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (emailOtp || '').trim();
    const activeSessionId = sessionId || verificationId;

    if (!cleanEmail || !cleanOtp) {
      return NextResponse.json({ error: 'Email and Email OTP are required.' }, { status: 400 });
    }

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
        await supabaseAdmin.from('profiles').update({
          is_verified: true,
          verification_status: 'active',
          updated_at: new Date().toISOString()
        }).eq('id', userId);
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
    console.error('[API Verify-OTP] Error:', err);
    return NextResponse.json({ error: err?.message || 'Server error verifying OTP' }, { status: 500 });
  }
}
