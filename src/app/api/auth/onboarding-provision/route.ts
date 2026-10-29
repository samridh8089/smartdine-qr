import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getRazorpayCredentials, verifyRazorpaySignature, fetchRazorpayPayment } from '@/lib/paymentSecurity';

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
  let realPaymentId = '';
  let realOrderId = '';
  let paidAmount = 999;
  let cleanEmail = '';

  try {
    const body = await req.json();
    const {
      fullName,
      email,
      phone,
      password,
      restaurantName,
      restaurantType = 'Restaurant',
      city,
      address,
      gstNumber,
      fssaiNumber,
      slug: requestedSlug,
      plan = 'pro',
      billingInterval = 'monthly',
      paymentDetails
    } = body;

    cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanName = (fullName || '').trim();
    const cleanRestName = (restaurantName || '').trim();
    const normalizedPlan = (plan || 'pro').toLowerCase().trim();

    if (!cleanEmail || !cleanRestName) {
      return NextResponse.json({ error: 'Missing mandatory fields (email, restaurant name)' }, { status: 400 });
    }

    realPaymentId = paymentDetails?.razorpay_payment_id || '';
    realOrderId = paymentDetails?.razorpay_order_id || '';

    // ─── LOG 1: ORDER & PAYMENT INCOMING ──────────────────────────────────────
    console.log('[PAYMENT CAPTURED LOG]', {
      email: cleanEmail,
      orderId: realOrderId,
      paymentId: realPaymentId,
      plan: normalizedPlan,
      billingInterval
    });

    // ─── 1. MANDATORY RAZORPAY SIGNATURE VALIDATION FOR PAID PLANS ──────────────
    const isPaidPlan = ['starter', 'pro', 'premium', 'custom'].includes(normalizedPlan);

    if (isPaidPlan) {
      if (!paymentDetails || !paymentDetails.razorpay_payment_id || !paymentDetails.razorpay_order_id) {
        return NextResponse.json({
          error: 'Payment verification failed: Razorpay payment_id and order_id are required.'
        }, { status: 400 });
      }

      let keyId: string;
      let keySecret: string;
      try {
        const creds = getRazorpayCredentials();
        keyId = creds.keyId;
        keySecret = creds.keySecret;
      } catch (credErr: any) {
        return NextResponse.json({ error: 'Razorpay payment gateway credentials not configured' }, { status: 500 });
      }

      let signatureValid = false;

      if (paymentDetails.razorpay_signature && paymentDetails.razorpay_order_id && paymentDetails.razorpay_payment_id) {
        signatureValid = verifyRazorpaySignature(
          paymentDetails.razorpay_order_id,
          paymentDetails.razorpay_payment_id,
          paymentDetails.razorpay_signature,
          keySecret
        );

        if (!signatureValid) {
          console.warn('[Onboarding] HMAC signature mismatch. Attempting direct Razorpay API payment verification fallback...');
        }
      }

      // Direct Razorpay API verification fallback (ensures legitimate captured payments are NEVER rejected)
      if (!signatureValid && paymentDetails.razorpay_payment_id) {
        const payRes = await fetchRazorpayPayment(paymentDetails.razorpay_payment_id, keyId, keySecret);
        if (payRes.success && payRes.payment) {
          const rzpPayment = payRes.payment;
          if ((rzpPayment.status === 'captured' || rzpPayment.status === 'authorized') && rzpPayment.order_id === paymentDetails.razorpay_order_id) {
            console.log('[Onboarding] Payment verified via official Razorpay API check:', rzpPayment.id, rzpPayment.status);
            signatureValid = true;
          }
        }
      }

      if (!signatureValid) {
        return NextResponse.json({
          error: 'Payment verification failed: Razorpay payment signature could not be verified.'
        }, { status: 400 });
      }
    }

    const supabaseAdmin = getSupabaseAdmin();

    // ─── 2. IDEMPOTENCY CHECK (CHECK IF PAYMENT WAS ALREADY PROCESSED) ──────────
    if (realPaymentId) {
      // Check restaurants settings by last_payment_id
      const { data: existingRestByPay } = await supabaseAdmin
        .from('restaurants')
        .select('*')
        .eq('settings->>last_payment_id', realPaymentId)
        .maybeSingle();

      if (existingRestByPay) {
        console.log('[ONBOARDING IDEMPOTENT RETRY] Payment already processed for restaurant:', existingRestByPay.id);
        return NextResponse.json({
          success: true,
          already_processed: true,
          restaurant: existingRestByPay,
          message: 'Payment already processed and plan activated.'
        });
      }
    }

    // ─── 3. RESOLVE AUTH USER ID & SECURE CREDENTIALS (ZERO EXCEPTION GUARANTEE) ──
    let userId = '';

    // Step 3a: Check existing profile
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (prof?.user_id || prof?.id) {
      userId = prof.user_id || prof.id;
    }

    // Step 3b: Search existing auth users via Admin API safely (no unhandled null destructure)
    if (!userId) {
      try {
        const listRes = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingAuth = (listRes?.data?.users || []).find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
        if (existingAuth?.id) {
          userId = existingAuth.id;
        }
      } catch (listErr) {
        console.warn('[Onboarding ListUsers Warning]:', listErr);
      }
    }

    const cleanPassword = (password || '').trim();

    if (userId) {
      console.log('[EXISTING ACCOUNT RESOLVED]', {
        email: cleanEmail,
        existingUserId: userId,
        action: 'Reusing existing auth account & setting password/metadata'
      });

      // Always update password and guarantee email is confirmed
      if (cleanPassword) {
        try {
          const updateRes = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: cleanPassword,
            email_confirm: true,
            user_metadata: {
              fullName: cleanName,
              phone: cleanPhone,
              role: 'owner',
              restaurantName: cleanRestName
            }
          });
          if (updateRes.error) {
            console.error('[Onboarding Password Update Error]:', updateRes.error);
          } else {
            console.log('[Onboarding Password Successfully Updated for User]:', userId);
          }
        } catch (pwErr) {
          console.error('[Onboarding Password Update Exception]:', pwErr);
        }
      }
    } else {
      // Create new user using Admin API (confirmed email & typed password)
      const { data: newAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword || 'SecurePass#2026!',
        email_confirm: true,
        user_metadata: {
          fullName: cleanName,
          phone: cleanPhone,
          role: 'owner',
          restaurantName: cleanRestName
        }
      });

      if (newAuth?.user?.id) {
        userId = newAuth.user.id;
        console.log('[AUTH USER CREATED LOG]', { userId, email: cleanEmail });
      } else {
        console.warn('[Onboarding CreateUser Warning]:', createErr?.message);
        // Fallback: Check if user exists in auth.users despite listUsers omission
        try {
          const listRes = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const retryAuth = (listRes?.data?.users || []).find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
          if (retryAuth?.id) {
            userId = retryAuth.id;
            if (cleanPassword) {
              await supabaseAdmin.auth.admin.updateUserById(userId, {
                password: cleanPassword,
                email_confirm: true,
                user_metadata: { fullName: cleanName, phone: cleanPhone, role: 'owner', restaurantName: cleanRestName }
              });
            }
          }
        } catch (_) {}

        if (!userId) {
          return NextResponse.json({ error: createErr?.message || 'Failed to resolve user account' }, { status: 400 });
        }
      }
    }

    // ─── 4. DETERMINE SUBSCRIPTION END DATE & SETTINGS ──────────────────────────
    const isTrialRegistration = Boolean(body.isTrial || plan === 'trial' || realPaymentId.startsWith('trial_'));
    const durationDays = isTrialRegistration ? 3 : (billingInterval === 'yearly' ? 365 : 30);
    const subscriptionEndsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    const initialStatus = isTrialRegistration ? 'trial' : 'active';

    const planAmounts: Record<string, { monthly: number; yearly: number }> = {
      starter: { monthly: 499, yearly: 4990 },
      pro: { monthly: 999, yearly: 9990 },
      premium: { monthly: 1999, yearly: 19990 }
    };
    paidAmount = isTrialRegistration ? 0 : (paymentDetails?.amount || (billingInterval === 'yearly' ? planAmounts[normalizedPlan]?.yearly : planAmounts[normalizedPlan]?.monthly) || 999);

    const paymentDetailsRecord = {
      payment_id: realPaymentId,
      order_id: realOrderId,
      payment_status: 'paid',
      paid_amount: paidAmount,
      paid_at: new Date().toISOString(),
      next_billing_date: subscriptionEndsAt,
      method: paymentDetails?.method || 'upi'
    };

    const initialSettings = {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      restaurant_type: restaurantType,
      city: city || '',
      fssai_number: fssaiNumber || '',
      gst_enabled: Boolean(gstNumber),
      gst_percentage: 5.0,
      service_charge_enabled: false,
      service_charge_percentage: 0,
      theme_color: 'emerald',
      payment_enabled: true,
      takeaway_enabled: true,
      reservation_enabled: true,
      kitchen_bell_type: 'alarm',
      waiter_bell_type: 'alarm',
      owner_name: cleanName,
      owner_email: cleanEmail,
      owner_phone: cleanPhone,
      payment_details: paymentDetailsRecord,
      last_payment_id: realPaymentId,
      last_order_id: realOrderId,
      last_amount: paidAmount,
      renewal_date: subscriptionEndsAt,
      payment_history: [paymentDetailsRecord],
      dpdp_consent: {
        consented: true,
        consented_at: new Date().toISOString(),
        consented_by: cleanEmail,
        consent_version: '2026.1',
        notice: 'DPDP Act 2023 Restaurant Data Fiduciary & Processing Agreement'
      }
    };

    // ─── 5. GENERATE SLUG ──────────────────────────────────────────────────────
    let cleanSlug = (requestedSlug || cleanRestName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');

    if (!cleanSlug) {
      cleanSlug = `rest${Date.now().toString().slice(-6)}`;
    }

    // ─── 6. EXECUTE ATOMIC RPC: CREATE OR LINK RESTAURANT ─────────────────────
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('create_restaurant_and_link', {
      p_owner_id: userId,
      p_owner_email: cleanEmail,
      p_owner_name: cleanName,
      p_owner_phone: cleanPhone,
      p_restaurant_name: cleanRestName,
      p_slug: cleanSlug,
      p_address: address || `${city || 'India'}`,
      p_subscription_plan: normalizedPlan,
      p_billing_interval: billingInterval,
      p_settings: initialSettings,
      p_trial_ends_at: subscriptionEndsAt
    });

    if (rpcErr || !rpcRes?.restaurant_id) {
      console.error('[Onboarding RPC Error]:', rpcErr);
      return NextResponse.json({ error: rpcErr?.message || 'Failed to provision restaurant workspace' }, { status: 500 });
    }

    const restaurantId = rpcRes.restaurant_id;

    // ─── LOG 2: PLAN ACTIVATED ────────────────────────────────────────────────
    console.log('[PLAN ACTIVATED LOG]', {
      restaurantId,
      ownerId: userId,
      plan: normalizedPlan,
      alreadyExisted: rpcRes.already_existed,
      validUntil: subscriptionEndsAt
    });

    // ─── 7. UPDATE RESTAURANT DETAILS & SUBSCRIPTION ──────────────────────────
    await supabaseAdmin
      .from('restaurants')
      .update({
        name: cleanRestName,
        slug: cleanSlug,
        address: address || (city ? `${city}, India` : 'India'),
        settings: initialSettings,
        subscription_plan: normalizedPlan,
        subscription_status: initialStatus,
        billing_interval: billingInterval,
        trial_ends_at: subscriptionEndsAt,
        owner_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId);

    // ─── 8. UPSERT OWNER PROFILE ──────────────────────────────────────────────
    try {
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        user_id: userId,
        restaurant_id: restaurantId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'owner',
        updated_at: new Date().toISOString()
      });
    } catch (profErr) {
      console.warn('[Onboarding Profile Upsert Warning]:', profErr);
    }


    // ─── 9. RECORD BILLING TRANSACTION & PAYMENT LOG ──────────────────────────
    const invoiceNum = `INV-${Date.now().toString().slice(-8)}`;
    if (realPaymentId) {
      try {
        await supabaseAdmin.from('billing_transactions').insert({
          restaurant_id: restaurantId,
          plan_id: normalizedPlan,
          amount: paidAmount,
          currency: 'INR',
          billing_interval: billingInterval,
          razorpay_order_id: realOrderId,
          razorpay_payment_id: realPaymentId,
          razorpay_signature: paymentDetails?.razorpay_signature || 'verified',
          status: 'success',
          invoice_number: invoiceNum,
          created_at: new Date().toISOString()
        });
      } catch (billErr) {}
    }

    // ─── LOG 3: ONBOARDING SUCCESS ─────────────────────────────────────────────
    console.log('[ONBOARDING SUCCESS LOG]', {
      restaurantId,
      ownerId: userId,
      email: cleanEmail,
      invoiceNumber: invoiceNum
    });

    // Fetch final restaurant record
    const { data: finalRest } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    return NextResponse.json({
      success: true,
      restaurant: finalRest,
      owner: {
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'owner',
        restaurant_id: restaurantId
      },
      invoiceNumber: invoiceNum,
      alreadyExisted: rpcRes.already_existed,
      message: rpcRes.already_existed ? 'Payment captured and plan activated on your restaurant.' : 'Restaurant created and plan activated.'
    });

  } catch (err: any) {
    console.error('[Onboarding API Exception]:', err);

    // ─── 10. AUTOMATIC REFUND SAFETY CHECK IF UNRECOVERABLE FAILURE OCCURS POST-PAYMENT ───
    if (realPaymentId && !realPaymentId.startsWith('demo_')) {
      console.warn(`[AUTOMATIC REFUND TRIGGERED]: Onboarding failed post-payment for ${realPaymentId}. Initiating refund...`);
      try {
        let creds: { keyId: string; keySecret: string };
        try {
          creds = getRazorpayCredentials();
        } catch (_) {
          console.warn('[AUTOMATIC REFUND SKIPPED]: Missing Razorpay API keys.');
          return NextResponse.json({
            error: 'Onboarding failed, and automated refund could not be initiated due to unconfigured API keys. Please contact support.',
            details: 'MISSING_RAZORPAY_KEYS'
          }, { status: 500 });
        }
        const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString('base64');

        const refundRes = await fetch(`https://api.razorpay.com/v1/payments/${realPaymentId}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          body: JSON.stringify({ notes: { reason: 'Automatic refund due to onboarding failure' } })
        });
        const refundData = await refundRes.json();
        console.log('[AUTOMATIC REFUND RESULT]:', refundData);
        
        return NextResponse.json({
          error: 'An unexpected system error occurred during activation. Your payment has been automatically refunded.',
          refundId: refundData?.id || null
        }, { status: 500 });
      } catch (refErr) {
        console.error('[AUTOMATIC REFUND EXCEPTION]:', refErr);
      }
    }

    return NextResponse.json({ error: err.message || 'Server error during restaurant onboarding' }, { status: 500 });
  }
}
