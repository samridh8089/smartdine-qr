import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, role, department, restaurantId } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const resolvedDept = department || (role === 'waiter' ? 'waiter' : role === 'kitchen' ? 'kitchen' : 'general');

    // 1. Search for existing profile or auth user by email
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    let existingAuthUser: any = null;
    if (existingProfile?.id) {
      const { data: uData } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      if (uData?.user) existingAuthUser = uData.user;
    }

    if (!existingAuthUser) {
      // Fallback search in listUsers paginated
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      existingAuthUser = users ? users.find(u => u.email?.toLowerCase() === cleanEmail) : null;
    }

    if (existingAuthUser) {
      // Check existing profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', existingAuthUser.id)
        .maybeSingle();

      const existingRestId = existingProfile?.restaurant_id || existingAuthUser.user_metadata?.restaurant_id;

      // Conflict Check: Registered to another restaurant
      if (existingRestId && existingRestId !== restaurantId) {
        return NextResponse.json({
          error: 'This email is already registered to another restaurant.',
          code: 'EMAIL_REGISTERED_OTHER_RESTAURANT'
        }, { status: 409 });
      }

      // User belongs to the same restaurant or has unmapped restaurant_id -> Resume & Resend Verification
      const isUnverified = !existingAuthUser.email_confirmed_at;

      // Update auth user metadata & profiles row with current restaurant_id
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        password: password || undefined,
        user_metadata: {
          ...existingAuthUser.user_metadata,
          fullName: name || existingAuthUser.user_metadata?.fullName || cleanEmail,
          role: role || 'staff',
          department: resolvedDept,
          phone: phone || '',
          restaurant_id: restaurantId,
          verification_status: isUnverified ? 'pending_verification' : 'verified'
        }
      });

      await supabaseAdmin.from('profiles').upsert({
        id: existingAuthUser.id,
        user_id: existingAuthUser.id,
        email: cleanEmail,
        full_name: name || cleanEmail,
        role: role || 'staff',
        restaurant_id: restaurantId,
        plain_password: password || undefined,
        updated_at: new Date().toISOString()
      });

      // Resend Verification Email / OTP if unverified
      let resendSuccess = false;
      if (isUnverified) {
        try {
          const { createAndDispatchOtp } = await import('@/lib/otpEngine');
          await createAndDispatchOtp({
            target: cleanEmail,
            type: 'staff_email',
            userId: existingAuthUser.id,
            recipientName: name || cleanEmail,
            restaurantName: 'SmartDine'
          });
          resendSuccess = true;
        } catch (e) {
          console.warn('createAndDispatchOtp resend error:', e);
        }
      }

      return NextResponse.json({
        success: true,
        user: existingAuthUser,
        resent: isUnverified,
        resumed: true,
        message: isUnverified
          ? 'Verification email resent.'
          : 'Staff member onboarding resumed and profile updated.'
      });
    }

    // 2. User does not exist -> Create user cleanly using admin API
    const { data: newAuthData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password || 'SmartDine123!',
      email_confirm: false, // Triggers email confirmation
      user_metadata: {
        fullName: name,
        role: role || 'staff',
        department: resolvedDept,
        phone: phone || '',
        restaurant_id: restaurantId,
        verification_status: 'pending_verification'
      }
    });

    if (createErr) {
      return NextResponse.json({ error: createErr.message || 'Failed to create auth user' }, { status: 500 });
    }

    const newUser = newAuthData.user;

    // Create profile row with explicit restaurant_id using valid columns
    await supabaseAdmin.from('profiles').upsert({
      id: newUser.id,
      user_id: newUser.id,
      email: cleanEmail,
      full_name: name,
      role: role || 'staff',
      restaurant_id: restaurantId,
      plain_password: password || undefined,
      updated_at: new Date().toISOString()
    });

    // Save metadata in restaurant settings
    try {
      const { data: rest } = await supabaseAdmin.from('restaurants').select('settings').eq('id', restaurantId).maybeSingle();
      if (rest) {
        const staffMeta = rest.settings?.staff_metadata || {};
        staffMeta[newUser.id] = {
          full_name: name,
          email: cleanEmail,
          role: role || 'staff',
          department: resolvedDept,
          phone: phone || '',
          is_active: true,
          is_verified: false,
          verification_status: 'pending_verification'
        };

        await supabaseAdmin.from('restaurants').update({
          settings: { ...rest.settings, staff_metadata: staffMeta }
        }).eq('id', restaurantId);
      }
    } catch (metaErr) {
      console.warn('[create-invite] Error updating restaurant staff_metadata:', metaErr);
    }

    // Send 8-digit OTP verification code to staff email
    try {
      const { createAndDispatchOtp } = await import('@/lib/otpEngine');
      await createAndDispatchOtp({
        target: cleanEmail,
        type: 'staff_email',
        userId: newUser.id,
        recipientName: name,
        restaurantName: 'SmartDine'
      });
    } catch (e) {
      console.warn('createAndDispatchOtp error:', e);
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      otpSent: true,
      message: 'Staff account created. Verification OTP sent to email.'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error creating staff invite' }, { status: 500 });
  }
}
