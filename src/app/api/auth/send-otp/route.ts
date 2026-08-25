import { NextResponse } from 'next/server';
import { createAndDispatchOtp } from '@/lib/otpEngine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, type = 'owner_email', recipientName } = body;

    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    // Normalize type to valid otpEngine type
    const otpType: 'owner_email' | 'staff_email' | 'password_reset' =
      type === 'password_reset' ? 'password_reset' :
      type === 'staff_email' ? 'staff_email' :
      'owner_email';

    console.log(`[API Send-OTP] Dispatching 8-digit OTP to: ${cleanEmail} (type=${otpType})`);

    // Use otpEngine — generates 8-digit OTP, stores in memory, sends via Resend
    const result = await createAndDispatchOtp({
      target: cleanEmail,
      type: otpType,
      recipientName: recipientName || '',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message || 'Failed to send OTP' }, { status: 429 });
    }

    console.log(`[API Send-OTP] OTP dispatched successfully to: ${cleanEmail}`);

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}.`,
      email: cleanEmail,
      sessionId: result.sessionId,
      expiresIn: '10 minutes'
    });

  } catch (err: any) {
    console.error('[API Send-OTP Exception]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to dispatch verification OTP' }, { status: 500 });
  }
}
