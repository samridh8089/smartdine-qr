import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      isDemo,
      restaurantId,
      plan,
      billingInterval,
      amount
    } = await req.json();

    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'q4cHg1f0yDQwwLbaUsgKhIBJ';


    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    if (restaurantId) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);

        const { data: rest } = await supabaseAdmin
          .from('restaurants')
          .select('settings, subscription_plan')
          .eq('id', restaurantId)
          .maybeSingle();

        if (rest) {
          const currentSettings = rest.settings || {};
          const paymentHistory = Array.isArray(currentSettings.payment_history) ? [...currentSettings.payment_history] : [];
          const nowIso = new Date().toISOString();
          const planName = plan || rest.subscription_plan || 'pro';
          const interval = billingInterval || 'monthly';
          const durationDays = interval === 'yearly' ? 365 : 30;
          const nextBilling = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
          const finalAmount = amount || (planName.toLowerCase() === 'premium' ? (interval === 'yearly' ? 9990 : 999) : planName.toLowerCase() === 'pro' ? (interval === 'yearly' ? 5990 : 599) : 299);

          paymentHistory.unshift({
            id: razorpay_payment_id,
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            amount: finalAmount,
            paid_amount: finalAmount,
            currency: 'INR',
            plan: planName,
            plan_name: planName,
            status: 'paid',
            payment_status: 'paid',
            paid_at: nowIso,
            created_at: nowIso,
            method: 'razorpay'
          });

          currentSettings.payment_history = paymentHistory;
          currentSettings.last_payment_id = razorpay_payment_id;
          currentSettings.last_order_id = razorpay_order_id;
          currentSettings.last_amount = finalAmount;

          await supabaseAdmin
            .from('restaurants')
            .update({
              subscription_plan: planName,
              subscription_status: 'active',
              billing_interval: interval,
              trial_ends_at: nextBilling,
              settings: currentSettings,
              updated_at: nowIso
            })
            .eq('id', restaurantId);
        }
      } catch (saveErr) {
        console.error('[VerifyPayment] Error updating restaurant payment history:', saveErr);
      }
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
