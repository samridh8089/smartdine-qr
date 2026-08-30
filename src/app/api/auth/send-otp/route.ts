import { NextResponse } from 'next/server';
import { createAndDispatchOtp } from '@/lib/otpEngine';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateSchema(body, {
      email: { rules: [Validators.email()], required: true },
      type: { rules: [Validators.enum(['owner_email', 'staff_email', 'password_reset'] as const)], required: false },
      recipientName: { rules: [Validators.string({ max: 100 })], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { email, type = 'owner_email', recipientName } = body;
    const cleanEmail = email.trim().toLowerCase();

    const otpType: 'owner_email' | 'staff_email' | 'password_reset' =
      type === 'password_reset' ? 'password_reset' :
      type === 'staff_email' ? 'staff_email' :
      'owner_email';

    console.log(`[API Send-OTP] Dispatching 8-digit OTP to: ${cleanEmail} (type=${otpType})`);

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
    return handleApiError('Send-OTP', err, 'Failed to dispatch verification OTP. Please try again.', 500);
  }
}


