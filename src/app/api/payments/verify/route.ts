import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';
import { logSystemEvent, generateCorrelationId } from '@/lib/systemEventLogger';
import {
  getRazorpayCredentials,
  getServerPlanPrice,
  verifyRazorpaySignature,
  fetchRazorpayPayment,
  fetchRazorpayOrder,
  isPaymentAlreadyRedeemed
} from '@/lib/paymentSecurity';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role environment variables');
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateSchema(body, {
      razorpay_order_id: { rules: [Validators.string({ max: 100 })], required: true },
      razorpay_payment_id: { rules: [Validators.string({ max: 100 })], required: true },
      razorpay_signature: { rules: [Validators.string({ max: 256 })], required: true },
      restaurant_id: { rules: [Validators.string({ max: 100 })], required: false },
      restaurantId: { rules: [Validators.string({ max: 100 })], required: false },
      email: { rules: [Validators.email()], required: false },
      plan: { rules: [Validators.string({ max: 50 })], required: false },
      plan_name: { rules: [Validators.enum(['starter', 'pro', 'premium', 'custom', 'free', 'lite', 'enterprise', 'trial_3_days', 'trial'] as const)], required: false },
      billingInterval: { rules: [Validators.enum(['monthly', 'yearly'] as const)], required: false },
      billing_interval: { rules: [Validators.enum(['monthly', 'yearly'] as const)], required: false },
      amount: { rules: [Validators.number({ min: 0 })], required: false },
      user_id: { rules: [Validators.string({ max: 100 })], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      restaurant_id,
      restaurantId,
      email,
      user_id
    } = body;

    let keyId: string;
    let keySecret: string;
    try {
      const creds = getRazorpayCredentials();
      keyId = creds.keyId;
      keySecret = creds.keySecret;
    } catch (credErr: any) {
      return NextResponse.json({ error: 'Razorpay payment gateway credentials not configured' }, { status: 500 });
    }

    // 1. Mandatory HMAC Signature Verification (No bypasses permitted - C2)
    const isSignatureValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret
    );

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature. Plan was not activated.', verified: false }, 
        { status: 400 }
      );
    }

    // 2. Fetch payment status directly from Razorpay API
    const payRes = await fetchRazorpayPayment(razorpay_payment_id, keyId, keySecret);
    if (!payRes.success || !payRes.payment) {
      return NextResponse.json(
        { error: `Payment verification failed with Razorpay: ${payRes.error || 'Payment not found'}` },
        { status: 400 }
      );
    }

    const payment = payRes.payment;

    // Check payment status is captured or authorized
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return NextResponse.json(
        { error: `Payment cannot be redeemed. Current status: ${payment.status}` },
        { status: 400 }
      );
    }

    // Check order ID match
    if (payment.order_id !== razorpay_order_id) {
      return NextResponse.json(
        { error: 'Payment does not match the specified order ID.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 3. Inspect Razorpay Order Notes for authentic plan & restaurant
    let orderPlanName = body.plan_name || body.plan || 'pro';
    let orderBillingInterval = (body.billing_interval || body.billingInterval || 'monthly') as 'monthly' | 'yearly';
    const bodyRestaurantId = (restaurant_id || restaurantId || '').trim();
    let targetRestaurantId = '';

    const orderRes = await fetchRazorpayOrder(razorpay_order_id, keyId, keySecret);
    if (orderRes.success && orderRes.order?.notes) {
      const notes = orderRes.order.notes;
      if (notes.plan_name) orderPlanName = notes.plan_name;
      else if (notes.plan) orderPlanName = notes.plan;
      if (notes.billing_interval) orderBillingInterval = notes.billing_interval;
      
      const notesRestaurantId = (notes.restaurant_id || notes.restaurantId || '').trim();
      if (notesRestaurantId) {
        if (bodyRestaurantId && bodyRestaurantId !== notesRestaurantId) {
          return NextResponse.json({
            error: 'Specified restaurant_id does not match the Razorpay order notes.'
          }, { status: 400 });
        }
        targetRestaurantId = notesRestaurantId;
      }
    }

    if (!targetRestaurantId && bodyRestaurantId) {
      targetRestaurantId = bodyRestaurantId;
    }

    // Resolve restaurant from profile if still missing
    if (!targetRestaurantId && (user_id || email)) {
      try {
        const cleanEmail = (email || '').trim().toLowerCase();
        let query = supabaseAdmin.from('profiles').select('restaurant_id');
        if (user_id) query = query.eq('id', user_id);
        else if (cleanEmail) query = query.ilike('email', cleanEmail);
        const { data: prof } = await query.maybeSingle();
        if (prof?.restaurant_id) {
          targetRestaurantId = prof.restaurant_id;
        }
      } catch (profErr) {
        console.warn('[Verify Payment] Could not resolve restaurant from profile:', profErr);
      }
    }

    // 4. Server-Side Price Verification (C3)
    const { price: expectedPrice, planName: verifiedPlanTitle, planId: canonicalPlanId } = await getServerPlanPrice(
      orderPlanName,
      orderBillingInterval
    );
    const expectedAmountPaise = Math.round(expectedPrice * 100);

    // Verify paid amount matches expected plan price (allow exact or higher)
    if (payment.amount < expectedAmountPaise) {
      return NextResponse.json({
        error: `Paid amount (₹${payment.amount / 100}) does not match expected plan price (₹${expectedPrice}). Plan not activated.`
      }, { status: 400 });
    }

    // 5. Idempotency Check (Prevent duplicate redemption)
    const alreadyRedeemed = await isPaymentAlreadyRedeemed(supabaseAdmin, razorpay_payment_id, targetRestaurantId);
    if (alreadyRedeemed) {
      return NextResponse.json({
        success: true,
        verified: true,
        restaurant_id: targetRestaurantId,
        plan_name: canonicalPlanId,
        subscription_status: 'active',
        billing_interval: orderBillingInterval,
        message: 'Payment has already been processed.'
      });
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now);
    if (orderBillingInterval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    // 6. Activate restaurant plan in database
    if (targetRestaurantId) {
      const { data: currentRest } = await supabaseAdmin
        .from('restaurants')
        .select('settings, subscription_plan')
        .eq('id', targetRestaurantId)
        .maybeSingle();

      const currentSettings = currentRest?.settings || {};
      const paymentHistory = Array.isArray(currentSettings.payment_history) ? currentSettings.payment_history : [];

      const newPaymentRecord = {
        id: razorpay_payment_id,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount: expectedPrice,
        currency: 'INR',
        plan_name: canonicalPlanId,
        billing_interval: orderBillingInterval,
        status: 'success',
        created_at: now.toISOString(),
        user_id: user_id || null
      };

      const updatedSettings = {
        ...currentSettings,
        payment_history: [newPaymentRecord, ...paymentHistory],
        last_payment: newPaymentRecord,
        last_payment_id: razorpay_payment_id,
        last_order_id: razorpay_order_id
      };

      const { error: updateErr } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_plan: canonicalPlanId,
          subscription_status: 'active',
          billing_interval: orderBillingInterval,
          trial_ends_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
          settings: updatedSettings
        })
        .eq('id', targetRestaurantId);

      if (updateErr) {
        console.error('[Verify Payment] Restaurant update error:', updateErr);
        throw new Error(updateErr.message || 'Failed to update restaurant subscription');
      }

      // Record in payments table
      try {
        await supabaseAdmin.from('payments').insert({
          restaurant_id: targetRestaurantId,
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          amount: expectedPrice,
          plan_name: canonicalPlanId,
          billing_interval: orderBillingInterval,
          status: 'success',
          created_at: now.toISOString()
        });
      } catch (e) {}
    }

    // System event log
    if (targetRestaurantId && targetRestaurantId !== 'demo-rest') {
      logSystemEvent({
        restaurantId: targetRestaurantId,
        correlationId: generateCorrelationId(),
        actorType: 'system',
        eventType: 'payment_success',
        metadata: {
          plan_name: canonicalPlanId,
          billing_interval: orderBillingInterval,
          amount: expectedPrice,
          razorpay_payment_id,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      verified: true,
      restaurant_id: targetRestaurantId || restaurant_id || restaurantId,
      plan_name: canonicalPlanId,
      subscription_status: 'active',
      billing_interval: orderBillingInterval,
      expires_at: expiresAt.toISOString(),
      message: 'Payment verified and plan activated successfully.'
    });
  } catch (err: any) {
    return handleApiError('Payments-Verify', err, 'Payment verification failed. Please contact support.', 500);
  }
}
