import { NextResponse } from 'next/server';
import { getRazorpayCredentials, getServerPlanPrice } from '@/lib/paymentSecurity';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', plan, restaurantId, billingInterval = 'monthly' } = await req.json();

    let keyId: string;
    let keySecret: string;
    try {
      const creds = getRazorpayCredentials();
      keyId = creds.keyId;
      keySecret = creds.keySecret;
    } catch (credErr: any) {
      return NextResponse.json({ error: 'Razorpay payment gateway credentials not configured' }, { status: 500 });
    }

    // Authoritative server-side price calculation (C3)
    const { price: verifiedPlanPrice, planId: normalizedPlanId } = await getServerPlanPrice(
      plan || 'pro',
      billingInterval as 'monthly' | 'yearly'
    );
    const amountInPaise = Math.round(verifiedPlanPrice * 100);

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: {
          restaurant_id: restaurantId || '',
          plan: normalizedPlanId,
          plan_name: normalizedPlanId,
          billing_interval: billingInterval,
          verified_amount: verifiedPlanPrice.toString()
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.description || 'Razorpay order creation failed' }, 
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: data.id,
      order_id: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId,
      key: keyId
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
