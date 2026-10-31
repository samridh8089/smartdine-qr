import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_PRICING_PLANS } from '@/lib/db';

/**
 * Returns Razorpay API credentials from environment variables.
 * Throws an explicit error if credentials are missing instead of falling back to insecure hardcoded secrets.
 */
export function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not properly configured on server environment.');
  }

  return { keyId, keySecret };
}

/**
 * Computes authentic SaaS plan price server-side from Supabase pricing_plans table
 * with fallback to canonical DEFAULT_PRICING_PLANS.
 * Prevents client-side price tampering (Finding C3).
 */
export async function getServerPlanPrice(
  planId: string,
  billingInterval: 'monthly' | 'yearly' = 'monthly'
): Promise<{ price: number; planName: string; planId: string; foundInDb: boolean }> {
  const normalizedId = (planId || 'pro').toLowerCase().trim();

  // 0. Dedicated 3-Day Trial (₹3) Check
  if (normalizedId === 'trial' || normalizedId === 'trial_3_days') {
    return {
      price: 3,
      planName: '3-Day Full Access Trial (₹3)',
      planId: 'trial_3_days',
      foundInDb: false
    };
  }

  // 1. Query pricing_plans table
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && anonKey) {
      const supabase = createClient(supabaseUrl, anonKey);
      const { data: planRow } = await supabase
        .from('pricing_plans')
        .select('*')
        .ilike('id', normalizedId)
        .maybeSingle();

      if (planRow) {
        const price = billingInterval === 'yearly'
          ? Number(planRow.price_yearly || 0)
          : Number(planRow.price_monthly || 0);

        return {
          price,
          planName: planRow.name || normalizedId,
          planId: planRow.id || normalizedId,
          foundInDb: true
        };
      }
    }
  } catch (err) {
    console.warn('[getServerPlanPrice] DB query failed, falling back to defaults:', err);
  }

  // 2. Fallback to DEFAULT_PRICING_PLANS
  const defaultMatch = DEFAULT_PRICING_PLANS.find(
    (p) => p.id.toLowerCase() === normalizedId
  );

  if (defaultMatch) {
    const price = billingInterval === 'yearly' ? defaultMatch.price_yearly : defaultMatch.price_monthly;
    return {
      price,
      planName: defaultMatch.name,
      planId: defaultMatch.id,
      foundInDb: false
    };
  }

  // 3. Safe fallback if unconfigured
  return {
    price: billingInterval === 'yearly' ? 6000 : 799,
    planName: 'Pro',
    planId: 'pro',
    foundInDb: false
  };
}

/**
 * Timing-safe HMAC-SHA256 signature verification for Razorpay payment webhooks / client callbacks.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) return false;
  try {
    const payload = `${(orderId || '').trim()}|${(paymentId || '').trim()}`;
    const expectedSig = crypto
      .createHmac('sha256', (keySecret || '').trim())
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSig);
    const sigBuf = Buffer.from((signature || '').trim());

    if (expectedBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, sigBuf);
  } catch (err) {
    console.error('[verifyRazorpaySignature] Verification error:', err);
    return false;
  }
}

/**
 * Fetches verified payment record directly from Razorpay API.
 */
export async function fetchRazorpayPayment(
  paymentId: string,
  keyId: string,
  keySecret: string
): Promise<{ success: boolean; payment?: any; error?: string }> {
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${auth}` }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error?.description || `Razorpay API returned status ${res.status}`
      };
    }

    const payment = await res.json();
    return { success: true, payment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error communicating with Razorpay API' };
  }
}

/**
 * Fetches order record from Razorpay API to inspect notes and order parameters.
 */
export async function fetchRazorpayOrder(
  orderId: string,
  keyId: string,
  keySecret: string
): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: { Authorization: `Basic ${auth}` }
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error?.description || `Razorpay API returned status ${res.status}`
      };
    }

    const order = await res.json();
    return { success: true, order };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error communicating with Razorpay API' };
  }
}

/**
 * Idempotency protection: Ensures a Razorpay payment_id is never applied more than once.
 */
export async function isPaymentAlreadyRedeemed(
  supabaseAdmin: any,
  paymentId: string,
  restaurantId?: string
): Promise<boolean> {
  if (!paymentId) return false;

  // 1. Check payments table
  try {
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('payment_id', paymentId)
      .eq('status', 'success')
      .maybeSingle();

    if (existingPayment) {
      return true;
    }
  } catch (_) {}

  // 2. Check restaurant settings payment history
  if (restaurantId) {
    try {
      const { data: rest } = await supabaseAdmin
        .from('restaurants')
        .select('settings')
        .eq('id', restaurantId)
        .maybeSingle();

      const history = rest?.settings?.payment_history;
      if (Array.isArray(history)) {
        const found = history.some((p: any) => p.payment_id === paymentId || p.id === paymentId);
        if (found) return true;
      }
    } catch (_) {}
  }

  return false;
}
