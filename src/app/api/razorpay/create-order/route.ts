import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', plan, restaurantId, billingInterval } = await req.json();

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TK1Nbl3mJiENjR';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'q4cHg1f0yDQwwLbaUsgKhIBJ';

    // Fallback demo mode if keys are not set yet in environment
    if (!keyId || !keySecret) {
      return NextResponse.json({
        success: true,
        isDemo: true,
        orderId: `demo_order_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
        keyId: keyId || 'rzp_test_demo',
      });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // amount in paise
        currency: currency || 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: {
          restaurant_id: restaurantId,
          plan,
          billing_interval: billingInterval,
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
      amount: data.amount,
      currency: data.currency,
      keyId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
