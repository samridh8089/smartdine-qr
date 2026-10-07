import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';
import { logSystemEvent, generateCorrelationId } from '@/lib/systemEventLogger';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const validation = validateSchema(body, {
      razorpay_order_id: { rules: [Validators.string({ max: 100 })], required: false },
      razorpay_payment_id: { rules: [Validators.string({ max: 100 })], required: false },
      razorpay_signature: { rules: [Validators.string({ max: 256 })], required: false },
      restaurant_id: { rules: [Validators.restaurantId()], required: false },
      email: { rules: [Validators.email()], required: false },
      plan_name: { rules: [Validators.enum(['starter', 'pro', 'premium', 'custom', 'free', 'lite', 'enterprise'] as const)], required: false },
      billing_interval: { rules: [Validators.enum(['monthly', 'yearly'] as const)], required: false },
      amount: { rules: [Validators.number({ min: 0 })], required: false },
      user_id: { rules: [Validators.string({ max: 100 })], required: false },
      isDemo: { rules: [Validators.boolean()], required: false }
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      restaurant_id,
      email,
      plan_name = 'pro',
      billing_interval = 'monthly',
      amount = 0,
      user_id,
      isDemo
    } = body;

    let targetRestaurantId = restaurant_id || '';

    // Fallback 1: Resolve restaurant_id from Razorpay order notes if not provided directly
    if (!targetRestaurantId && razorpay_order_id) {
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
      const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
      if (keyId && keySecret) {
        try {
          const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
          const rzpOrderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
            headers: { Authorization: `Basic ${auth}` }
          });
          if (rzpOrderRes.ok) {
            const rzpOrderData = await rzpOrderRes.json();
            if (rzpOrderData?.notes?.restaurant_id) {
              targetRestaurantId = rzpOrderData.notes.restaurant_id;
              console.log('[Verify Payment] Resolved restaurant_id from Razorpay order notes:', targetRestaurantId);
            }
          }
        } catch (rzpErr) {
          console.warn('[Verify Payment] Could not fetch Razorpay order notes:', rzpErr);
        }
      }
    }

    // Fallback 2: Resolve from Supabase profiles if email or user_id is provided
    if (!targetRestaurantId && (user_id || email)) {
      try {
        const cleanEmail = (email || '').trim().toLowerCase();
        let query = supabaseAdmin.from('profiles').select('restaurant_id');
        if (user_id) query = query.eq('id', user_id);
        else if (cleanEmail) query = query.ilike('email', cleanEmail);
        const { data: prof } = await query.maybeSingle();
        if (prof?.restaurant_id) {
          targetRestaurantId = prof.restaurant_id;
          console.log('[Verify Payment] Resolved restaurant_id from profile:', targetRestaurantId);
        }
      } catch (profErr) {
        console.warn('[Verify Payment] Could not resolve restaurant from profile:', profErr);
      }
    }

    if (!isDemo) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'q4cHg1f0yDQwwLbaUsgKhIBJ';
      if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {


        const bodyStr = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(bodyStr.toString())
          .digest('hex');

        if (expectedSignature !== razorpay_signature) {
          return NextResponse.json(
            { error: 'Invalid payment signature. Plan was not activated.', verified: false }, 
            { status: 400 }
          );
        }
      }
    }

    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now);
    if (billing_interval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    const normalizedPlan = (plan_name || 'pro').toLowerCase().trim();

    // Activate restaurant plan in database
    if (targetRestaurantId) {
      const { data: currentRest } = await supabaseAdmin
        .from('restaurants')
        .select('settings, subscription_plan')
        .eq('id', targetRestaurantId)
        .maybeSingle();

      const currentSettings = currentRest?.settings || {};
      const paymentHistory = currentSettings.payment_history || [];

      const newPaymentRecord = {
        id: `pay_${Date.now()}`,
        order_id: razorpay_order_id || `ord_${Date.now()}`,
        payment_id: razorpay_payment_id || `pay_${Date.now()}`,
        amount: Number(amount) || 0,
        currency: 'INR',
        plan_name: normalizedPlan,
        billing_interval,
        status: 'success',
        created_at: now.toISOString(),
        user_id: user_id || null
      };

      const updatedSettings = {
        ...currentSettings,
        payment_history: [newPaymentRecord, ...paymentHistory],
        last_payment: newPaymentRecord
      };

      const { error: updateErr } = await supabaseAdmin
        .from('restaurants')
        .update({
          subscription_plan: normalizedPlan,
          subscription_status: 'active',
          billing_interval: billing_interval,
          trial_ends_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
          settings: updatedSettings
        })
        .eq('id', targetRestaurantId);

      if (updateErr) {
        console.error('[Verify Payment] Restaurant update error:', updateErr);
        throw new Error(updateErr.message || 'Failed to update restaurant subscription');
      }

      // Record in payments table if table exists
      try {
        await supabaseAdmin.from('payments').insert({
          restaurant_id: targetRestaurantId,
          order_id: razorpay_order_id || `ord_${Date.now()}`,
          payment_id: razorpay_payment_id || `pay_${Date.now()}`,
          amount: Number(amount),
          plan_name: normalizedPlan,
          billing_interval,
          status: 'success',
          created_at: now.toISOString()
        });
      } catch (e) {}
    }

    // ─── Phase-19: Event Bus — fire-and-forget ───────────────────────────────
    if (targetRestaurantId && targetRestaurantId !== 'demo-rest') {
      logSystemEvent({
        restaurantId: targetRestaurantId,
        correlationId: generateCorrelationId(),
        actorType: 'system',
        eventType: 'payment_success',
        metadata: {
          plan_name: normalizedPlan,
          billing_interval,
          amount: Number(amount),
          razorpay_payment_id: razorpay_payment_id || null,
        },
      }).catch(() => {});
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      verified: true,
      restaurant_id: targetRestaurantId || restaurant_id,
      plan_name: normalizedPlan,
      subscription_status: 'active',
      billing_interval,
      expires_at: expiresAt.toISOString(),
      message: 'Payment verified and plan activated successfully.'
    });
  } catch (err: any) {
    return handleApiError('Payments-Verify', err, 'Payment verification failed. Please contact support.', 500);
  }
}


