import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'q4cHg1f0yDQwwLbaUsgKhIBJ';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Razorpay signature header' }, { status: 400 });
    }

    // 1. Verify Webhook Signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Razorpay Webhook] Invalid signature rejected');
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log(`[Razorpay Webhook] Verified event: ${event.event}`);

    const payload = event.payload;
    const payment = payload.payment?.entity;
    const order = payload.order?.entity;

    const notes = payment?.notes || order?.notes || {};
    const restaurantId = notes.restaurant_id || notes.restaurantId;
    const planName = notes.plan || notes.plan_name || notes.subscription_plan || 'pro';
    const billingInterval = notes.interval || notes.billing_interval || 'monthly';

    // 2. Handle Payment / Order Success Events
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentId = payment?.id;
      const orderId = order?.id || payment?.order_id;
      const amount = (payment?.amount || order?.amount || 0) / 100;
      const paidAt = new Date().toISOString();
      const durationDays = billingInterval === 'yearly' ? 365 : 30;
      const nextBillingDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      if (restaurantId) {
        // Fetch current settings
        const { data: rest } = await supabaseAdmin
          .from('restaurants')
          .select('settings')
          .eq('id', restaurantId)
          .maybeSingle();

        const currentSettings = (rest as any)?.settings || {};
        const paymentHistory = currentSettings.payment_history || [];

        paymentHistory.unshift({
          payment_id: paymentId,
          order_id: orderId,
          amount,
          currency: 'INR',
          plan: planName,
          status: 'paid',
          paid_at: paidAt,
          method: payment?.method || 'razorpay'
        });

        currentSettings.payment_details = {
          payment_id: paymentId,
          order_id: orderId,
          subscription_id: payment?.subscription_id || null,
          payment_status: 'paid',
          paid_amount: amount,
          paid_at: paidAt,
          next_billing_date: nextBillingDate,
          method: payment?.method || 'razorpay'
        };
        currentSettings.payment_history = paymentHistory;

        // Activate restaurant
        await supabaseAdmin
          .from('restaurants')
          .update({
            subscription_plan: planName,
            subscription_status: 'active',
            trial_ends_at: nextBillingDate,
            billing_interval: billingInterval,
            settings: currentSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', restaurantId);

        console.log(`[Razorpay Webhook] Successfully activated restaurant ${restaurantId} with ${planName} plan (Paid ₹${amount})`);
      }
    }

    // 3. Handle Payment Failed Events
    if (event.event === 'payment.failed') {
      console.warn(`[Razorpay Webhook] Payment failed for restaurant ${restaurantId || 'unknown'}`);
      if (restaurantId) {
        const { data: rest } = await supabaseAdmin.from('restaurants').select('settings').eq('id', restaurantId).maybeSingle();
        const currentSettings = (rest as any)?.settings || {};
        currentSettings.last_payment_error = {
          payment_id: payment?.id,
          error_code: payment?.error_code,
          error_description: payment?.error_description,
          failed_at: new Date().toISOString()
        };
        await supabaseAdmin.from('restaurants').update({
          subscription_status: 'pending_payment',
          settings: currentSettings
        }).eq('id', restaurantId);
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('[Razorpay Webhook Exception]:', err);
    return NextResponse.json({ error: err?.message || 'Webhook handler error' }, { status: 500 });
  }
}
