import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;

export async function POST(req: Request) {
  try {
    if (!RAZORPAY_WEBHOOK_SECRET) {
      console.error('[Razorpay Webhook] Missing RAZORPAY_WEBHOOK_SECRET environment variable');
      return NextResponse.json({ error: 'Server payment configuration error' }, { status: 500 });
    }

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

    const payload = event.payload || {};
    const payment = payload.payment?.entity;
    const order = payload.order?.entity;
    const subscription = payload.subscription?.entity;

    const notes = payment?.notes || order?.notes || subscription?.notes || {};
    let restaurantId = notes.restaurant_id || notes.restaurantId;
    const planName = (notes.plan || notes.plan_name || notes.subscription_plan || 'pro').toLowerCase().trim();
    const billingInterval = notes.interval || notes.billing_interval || 'monthly';
    const customerEmail = (payment?.email || notes.email || '')?.trim()?.toLowerCase();

    // Fallback: If restaurantId not in notes, resolve via customerEmail
    if (!restaurantId && customerEmail) {
      try {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('restaurant_id')
          .ilike('email', customerEmail)
          .maybeSingle();
        if (prof?.restaurant_id) {
          restaurantId = prof.restaurant_id;
        } else {
          const { data: restByEmail } = await supabaseAdmin
            .from('restaurants')
            .select('id')
            .eq('settings->>owner_email', customerEmail)
            .maybeSingle();
          if (restByEmail?.id) {
            restaurantId = restByEmail.id;
          }
        }
      } catch (lookupErr) {
        console.warn('[Razorpay Webhook] Error resolving restaurant by email:', lookupErr);
      }
    }

    const nowIso = new Date().toISOString();
    const durationDays = billingInterval === 'yearly' ? 365 : 30;
    const nextBillingDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 2. Handle Payment Success Events (payment.captured, order.paid)
    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      const paymentId = payment?.id;
      const orderId = order?.id || payment?.order_id;
      const amount = (payment?.amount || order?.amount || 0) / 100;

      let targetRestId = restaurantId;
      const cleanEmail = (payment?.email || notes.email || '').trim().toLowerCase();
      const cleanPhone = (payment?.contact || notes.phone || '').trim();
      const cleanRestName = (notes.restaurant_name || notes.restaurantName || 'Restaurant').trim();

      // Fallback: If restaurantId wasn't passed in order notes (initial new signup), resolve or create
      if (!targetRestId && cleanEmail) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('restaurant_id, id').eq('email', cleanEmail).maybeSingle();
        if (prof?.restaurant_id) {
          targetRestId = prof.restaurant_id;
        } else {
          const { data: restByEmail } = await supabaseAdmin.from('restaurants').select('id').eq('settings->>owner_email', cleanEmail).maybeSingle();
          if (restByEmail?.id) {
            targetRestId = restByEmail.id;
          } else {
            // Provision new restaurant via RPC fallback
            let userId = prof?.id;
            if (!userId) {
              const { data: authUser } = await supabaseAdmin.auth.admin.createUser({
                email: cleanEmail,
                password: 'ChangeMe@123456',
                email_confirm: true,
                user_metadata: { role: 'owner', restaurantName: cleanRestName }
              });
              userId = authUser?.user?.id;
            }
            if (userId) {
              const cleanSlug = cleanRestName.toLowerCase().replace(/[^a-z0-9]/g, '') || `rest${Date.now().toString().slice(-4)}`;
              const { data: rpcRes } = await supabaseAdmin.rpc('create_restaurant_and_link', {
                p_owner_id: userId,
                p_owner_email: cleanEmail,
                p_owner_name: cleanRestName,
                p_owner_phone: cleanPhone,
                p_restaurant_name: cleanRestName,
                p_slug: cleanSlug,
                p_address: 'India',
                p_subscription_plan: planName,
                p_billing_interval: billingInterval,
                p_settings: {
                  currency: 'INR',
                  timezone: 'Asia/Kolkata',
                  last_payment_id: paymentId,
                  last_order_id: orderId,
                  last_amount: amount,
                  owner_email: cleanEmail,
                  owner_phone: cleanPhone
                },
                p_trial_ends_at: nextBillingDate
              });
              if (rpcRes?.restaurant_id) {
                targetRestId = rpcRes.restaurant_id;
              }
            }
          }
        }
      }

      if (targetRestId) {
        // Fetch current settings
        const { data: rest } = await supabaseAdmin
          .from('restaurants')
          .select('settings')
          .eq('id', targetRestId)
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
          paid_at: nowIso,
          method: payment?.method || 'razorpay'
        });

        currentSettings.payment_details = {
          payment_id: paymentId,
          order_id: orderId,
          subscription_id: payment?.subscription_id || subscription?.id || null,
          payment_status: 'paid',
          paid_amount: amount,
          paid_at: nowIso,
          next_billing_date: nextBillingDate,
          method: payment?.method || 'razorpay'
        };
        currentSettings.last_payment_id = paymentId;
        currentSettings.last_order_id = orderId;
        currentSettings.payment_history = paymentHistory;

        await supabaseAdmin
          .from('restaurants')
          .update({
            subscription_plan: planName,
            subscription_status: 'active',
            trial_ends_at: nextBillingDate,
            billing_interval: billingInterval,
            settings: currentSettings,
            updated_at: nowIso
          })
          .eq('id', targetRestId);

        console.log(`[Razorpay Webhook] Successfully activated restaurant ${targetRestId} with ${planName} plan (Paid ₹${amount})`);
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
          failed_at: nowIso
        };
        await supabaseAdmin.from('restaurants').update({
          subscription_status: 'pending_payment',
          settings: currentSettings,
          updated_at: nowIso
        }).eq('id', restaurantId);
      }
    }

    // 4. Handle Subscription Activated & Updated Events (subscription.activated, subscription.updated)
    else if (event.event === 'subscription.activated' || event.event === 'subscription.updated') {
      const subId = subscription?.id;
      const subPlan = (subscription?.notes?.plan || planName || 'pro').toLowerCase().trim();
      const subInterval = subscription?.notes?.interval || billingInterval || 'monthly';
      const subEndIso = subscription?.current_end
        ? new Date(subscription.current_end * 1000).toISOString()
        : nextBillingDate;

      if (restaurantId) {
        const { data: rest } = await supabaseAdmin.from('restaurants').select('settings').eq('id', restaurantId).maybeSingle();
        const currentSettings = (rest as any)?.settings || {};
        currentSettings.subscription_details = {
          subscription_id: subId,
          plan: subPlan,
          interval: subInterval,
          status: 'active',
          current_start: subscription?.current_start ? new Date(subscription.current_start * 1000).toISOString() : nowIso,
          current_end: subEndIso,
          updated_at: nowIso
        };

        await supabaseAdmin
          .from('restaurants')
          .update({
            subscription_plan: subPlan,
            subscription_status: 'active',
            trial_ends_at: subEndIso,
            billing_interval: subInterval,
            settings: currentSettings,
            updated_at: nowIso
          })
          .eq('id', restaurantId);

        console.log(`[Razorpay Webhook] Subscription ${subId} (${event.event}) activated for restaurant ${restaurantId}`);
      }
    }

    // 5. Handle Subscription Cancelled Event (subscription.cancelled)
    else if (event.event === 'subscription.cancelled') {
      const subId = subscription?.id;
      if (restaurantId) {
        const { data: rest } = await supabaseAdmin.from('restaurants').select('settings').eq('id', restaurantId).maybeSingle();
        const currentSettings = (rest as any)?.settings || {};
        currentSettings.subscription_details = {
          ...(currentSettings.subscription_details || {}),
          subscription_id: subId,
          status: 'cancelled',
          cancelled_at: nowIso
        };

        await supabaseAdmin
          .from('restaurants')
          .update({
            subscription_status: 'cancelled',
            settings: currentSettings,
            updated_at: nowIso
          })
          .eq('id', restaurantId);

        console.log(`[Razorpay Webhook] Subscription ${subId} cancelled for restaurant ${restaurantId}`);
      }
    }

    // Fast sub-second response to Razorpay
    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('[Razorpay Webhook Exception]:', err);
    return NextResponse.json({ error: err?.message || 'Webhook handler error' }, { status: 500 });
  }
}
