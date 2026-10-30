import { NextResponse } from 'next/server';
import { validateSchema, Validators } from '@/lib/validation';
import { handleApiError } from '@/lib/errors';
import { ServerTimer } from '@/lib/serverTiming';
import { getRazorpayCredentials, getServerPlanPrice } from '@/lib/paymentSecurity';

export async function POST(req: Request) {
  const totalStart = performance.now();
  const timer = new ServerTimer();

  try {
    timer.start('auth');
    const body = await req.json();

    const validation = validateSchema(body, {
      amount: { rules: [Validators.number({ min: 1 })], required: false },
      currency: { rules: [Validators.enum(['INR', 'USD'] as const)], required: false },
      plan: { rules: [Validators.string({ max: 50 })], required: false },
      restaurantId: { rules: [Validators.string({ max: 100 })], required: false },
      restaurantName: { rules: [Validators.string({ max: 200 })], required: false },
      fullName: { rules: [Validators.string({ max: 200 })], required: false },
      phone: { rules: [Validators.string({ max: 50 })], required: false },
      password: { rules: [Validators.string({ max: 200 })], required: false },
      restaurantType: { rules: [Validators.string({ max: 100 })], required: false },
      city: { rules: [Validators.string({ max: 100 })], required: false },
      address: { rules: [Validators.string({ max: 300 })], required: false },
      slug: { rules: [Validators.string({ max: 100 })], required: false },
      email: { rules: [Validators.email()], required: false },
      userId: { rules: [Validators.string({ max: 100 })], required: false },
      billingInterval: { rules: [Validators.enum(['monthly', 'yearly'] as const)], required: false },
      isUpgrade: { rules: [Validators.boolean()], required: false }
    });
    timer.end('auth');

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const { 
      amount, 
      currency = 'INR', 
      plan, 
      restaurantId, 
      email, 
      userId, 
      billingInterval = 'monthly',
      isUpgrade = false 
    } = body;

    let targetRestaurantId = restaurantId || '';
    let existingRestaurantMatched: any = null;

    // Task 4: Payment Safety — Verify duplicate restaurant or resolve existing for upgrade
    if (userId || email) {
      const { createClient } = require('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
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
            .select('id, name, owner_id, slug, subscription_plan, billing_interval')
            .eq('id', prof.restaurant_id)
            .maybeSingle();

          if (activeRest) {
            existingRestaurantMatched = activeRest;
          }
        }
      }

      if (!existingRestaurantMatched) {
        let query = supabaseAdmin.from('restaurants').select('id, name, owner_id, slug, subscription_plan, billing_interval, settings');
        
        if (userId && cleanEmail) {
          query = query.or(`owner_id.eq.${userId},settings->>owner_email.eq.${cleanEmail}`);
        } else if (userId) {
          query = query.eq('owner_id', userId);
        } else if (cleanEmail) {
          query = query.eq('settings->>owner_email', cleanEmail);
        }

        const { data: existingRest } = await query.maybeSingle();
        if (existingRest) {
          existingRestaurantMatched = existingRest;
        }
      }

      // If account already owns a restaurant:
      if (existingRestaurantMatched) {
        // Verify if an active auth user actually exists for this account in auth.users
        let hasActiveAuthUser = false;
        if (existingRestaurantMatched.owner_id) {
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingRestaurantMatched.owner_id);
            if (authUser?.user?.id) {
              hasActiveAuthUser = true;
            }
          } catch (_) {}
        }
        if (!hasActiveAuthUser && cleanEmail) {
          try {
            const listRes = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const foundUser = (listRes?.data?.users || []).find((u: any) => u.email?.toLowerCase().trim() === cleanEmail);
            if (foundUser?.id) {
              hasActiveAuthUser = true;
            }
          } catch (_) {}
        }

        // Only block if a real, live user actually exists in Supabase Auth!
        if (hasActiveAuthUser) {
          if (isUpgrade || (restaurantId && restaurantId === existingRestaurantMatched.id)) {
            // UPGRADE FLOW: Reuse existing restaurant! Never create duplicate record
            targetRestaurantId = existingRestaurantMatched.id;
            console.log(`[Payment Upgrade Permitted]: Reusing existing restaurant "${existingRestaurantMatched.name}" (${targetRestaurantId}) for ${userId || cleanEmail}`);
          } else if (!restaurantId && !isUpgrade) {
            // New signup attempt with an existing owner account
            console.warn(`[Payment Blocked 409]: Account ${userId || cleanEmail} already owns restaurant "${existingRestaurantMatched.name}" (${existingRestaurantMatched.id})`);
            return NextResponse.json({
              success: false,
              code: 'RESTAURANT_ALREADY_EXISTS',
              error: 'This account already owns a restaurant.',
              message: `This account already owns a restaurant (${existingRestaurantMatched.name}).`,
              existingRestaurant: {
                id: existingRestaurantMatched.id,
                name: existingRestaurantMatched.name
              }
            }, { status: 409 });
          } else if (restaurantId && restaurantId !== existingRestaurantMatched.id && !isUpgrade) {
            console.warn(`[Payment Blocked 409]: Account ${userId || cleanEmail} owns "${existingRestaurantMatched.name}", cannot create new restaurant.`);
            return NextResponse.json({
              success: false,
              code: 'RESTAURANT_ALREADY_EXISTS',
              error: 'This account already owns a restaurant.',
              message: `This account already owns a restaurant (${existingRestaurantMatched.name}).`,
              existingRestaurant: {
                id: existingRestaurantMatched.id,
                name: existingRestaurantMatched.name
              }
            }, { status: 409 });
          }
        } else {
          console.log(`[Payment Notice]: Orphaned restaurant record "${existingRestaurantMatched.name}" detected for ${cleanEmail} with no active Supabase auth user. Bypassing 409 block to allow fresh signup.`);
          existingRestaurantMatched = null;
        }
      }
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

    // Server-side authoritative pricing (C3: prevents client-side price tampering)
    const { price: verifiedPlanPrice, planId: normalizedPlanId } = await getServerPlanPrice(
      plan || 'pro',
      billingInterval as 'monthly' | 'yearly'
    );
    const amountInPaise = Math.round(verifiedPlanPrice * 100);


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
        receipt: `rcpt_${targetRestaurantId ? targetRestaurantId.slice(0, 8) + '_' : ''}${Date.now()}`,
        notes: {
          restaurant_id: targetRestaurantId || '',
          plan_name: normalizedPlanId,
          billing_interval: billingInterval || 'monthly',
          is_upgrade: isUpgrade ? 'true' : 'false',
          verified_amount: verifiedPlanPrice.toString(),
          restaurant_name: (body.restaurantName || '').trim(),
          restaurantName: (body.restaurantName || '').trim(),
          owner_name: (body.fullName || '').trim(),
          owner_email: (body.email || '').trim().toLowerCase(),
          owner_phone: (body.phone || '').trim(),
          signup_password: (body.password || '').trim(),
          restaurant_type: (body.restaurantType || 'Restaurant').trim(),
          city: (body.city || '').trim(),
          address: (body.address || '').trim(),
          slug: (body.slug || '').trim()
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
      restaurantId: targetRestaurantId || null,
      existingRestaurant: existingRestaurantMatched ? {
        id: existingRestaurantMatched.id,
        name: existingRestaurantMatched.name
      } : null
    });
  } catch (err: any) {
    return handleApiError('Payments-Create-Order', err, 'Failed to create payment order. Please try again later.', 500);
  }
}


