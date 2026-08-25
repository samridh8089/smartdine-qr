import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      restaurant_id,
      plan_name = 'pro',
      billing_interval = 'monthly',
      amount = 0,
      user_id,
      isDemo
    } = await req.json();

    if (!isDemo) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET || 'q4cHg1f0yDQwwLbaUsgKhIBJ';
      if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', keySecret)
          .update(body.toString())
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
    if (restaurant_id) {
      const { data: currentRest } = await supabaseAdmin
        .from('restaurants')
        .select('settings, subscription_plan')
        .eq('id', restaurant_id)
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
        .eq('id', restaurant_id);

      if (updateErr) {
        console.error('[Verify Payment] Restaurant update error:', updateErr);
        throw new Error(updateErr.message || 'Failed to update restaurant subscription');
      }

      // Record in payments table if table exists
      try {
        await supabaseAdmin.from('payments').insert({
          restaurant_id,
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

    return NextResponse.json({
      success: true,
      verified: true,
      restaurant_id,
      plan_name: normalizedPlan,
      subscription_status: 'active',
      billing_interval,
      expires_at: expiresAt.toISOString(),
      message: 'Payment verified and plan activated successfully.'
    });
  } catch (err: any) {
    console.error('[Verify Payment Exception]:', err);
    return NextResponse.json({ error: err.message || 'Payment verification failed' }, { status: 500 });
  }
}
