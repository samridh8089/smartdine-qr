import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR', plan, restaurantId, email, userId, billingInterval = 'monthly' } = await req.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 });
    }

    // Task 4: Payment Safety — Verify no existing duplicate restaurant BEFORE creating Razorpay order
    if (userId || email) {
      const { createClient } = require('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      const cleanEmail = (email || '').trim().toLowerCase();

      // Check profile link
      if (cleanEmail) {
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('restaurant_id')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (prof?.restaurant_id) {
          const { data: activeRest } = await supabaseAdmin
            .from('restaurants')
            .select('id, name')
            .eq('id', prof.restaurant_id)
            .maybeSingle();

          if (activeRest && (!restaurantId || activeRest.id !== restaurantId)) {
            console.warn(`[Payment Blocked 409]: Profile ${cleanEmail} linked to restaurant "${activeRest.name}" (${activeRest.id})`);
            return NextResponse.json({
              success: false,
              code: 'RESTAURANT_ALREADY_EXISTS',
              error: 'This account already owns a restaurant.',
              message: `This account already owns a restaurant (${activeRest.name}).`,
              existingRestaurant: activeRest
            }, { status: 409 });
          }
        }
      }

      let query = supabaseAdmin.from('restaurants').select('id, name, owner_id, settings');
      
      if (userId && cleanEmail) {
        query = query.or(`owner_id.eq.${userId},settings->>owner_email.eq.${cleanEmail}`);
      } else if (userId) {
        query = query.eq('owner_id', userId);
      } else if (cleanEmail) {
        query = query.eq('settings->>owner_email', cleanEmail);
      }

      const { data: existingRest } = await query.maybeSingle();

      if (existingRest && (!restaurantId || existingRest.id !== restaurantId)) {
        console.warn(`[Payment Blocked 409]: Account ${userId || cleanEmail} already owns restaurant "${existingRest.name}" (${existingRest.id})`);
        return NextResponse.json({
          success: false,
          code: 'RESTAURANT_ALREADY_EXISTS',
          error: 'This account already owns a restaurant.',
          message: `This account already owns a restaurant (${existingRest.name}).`,
          existingRestaurant: {
            id: existingRest.id,
            name: existingRest.name
          }
        }, { status: 409 });
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_live_TK1Nbl3mJiENjR';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'q4cHg1f0yDQwwLbaUsgKhIBJ';

    const amountInPaise = Math.round(Number(amount) * 100);

    if (!keyId || !keySecret) {
      return NextResponse.json({
        success: true,
        order_id: `ord_${Date.now()}`,
        orderId: `ord_${Date.now()}`,
        amount: amountInPaise,
        currency: currency || 'INR',
        key: 'rzp_test_demo',
        keyId: 'rzp_test_demo',
        isDemo: true,
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
        amount: amountInPaise,
        currency: currency || 'INR',
        receipt: `rcpt_${restaurantId ? restaurantId.slice(0, 8) + '_' : ''}${Date.now()}`,
        notes: {
          restaurant_id: restaurantId || '',
          plan_name: plan || '',
          billing_interval: billingInterval || 'monthly',
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Razorpay create-order error]:', data);
      return NextResponse.json(
        { error: data.error?.description || 'Razorpay order creation failed' }, 
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order_id: data.id,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      key: keyId,
      keyId,
    });
  } catch (err: any) {
    console.error('[Razorpay create-order exception]:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
