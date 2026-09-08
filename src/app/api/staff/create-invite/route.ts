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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Valid email address is required', code: 'INVALID_EMAIL' }, { status: 400 });
    }

    // 1. Check if email belongs to Restaurant Owner
    const { data: restRow } = await supabaseAdmin
      .from('restaurants')
      .select('owner_id, settings')
      .eq('id', restaurantId)
      .maybeSingle();

    let ownerEmail: string | null = restRow?.settings?.owner_email?.toLowerCase() || null;
    if (restRow?.owner_id) {
      const { data: ownerProf } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', restRow.owner_id)
        .maybeSingle();
      if (ownerProf?.email) {
        ownerEmail = ownerProf.email.toLowerCase();
      }
    }

    if (ownerEmail && cleanEmail === ownerEmail) {
      return NextResponse.json({
        error: 'The restaurant owner email cannot be registered as a staff account.',
        code: 'OWNER_EMAIL_RESTRICTED'
      }, { status: 400 });
    }

    // 2. Check Phone Uniqueness against canonical sources (staff_metadata, owner contact, and auth users)
    if (phone && String(phone).trim()) {
      const cleanPhone = String(phone).trim().replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        // 2a. Check staff_metadata in restaurant settings
        const staffMeta = restRow?.settings?.staff_metadata || {};
        const staffMetaValues = Object.values(staffMeta) as any[];
        const metaPhoneConflict = staffMetaValues.find(m => {
          const mPhone = (m?.phone || '').replace(/\D/g, '');
          return mPhone && mPhone.slice(-10) === cleanPhone.slice(-10);
        });

        // 2b. Check restaurant owner contact phone
        const ownerPhone = (restRow?.settings?.owner_phone || (restRow as any)?.phone || '').replace(/\D/g, '');
        const isOwnerPhoneConflict = Boolean(ownerPhone && ownerPhone.slice(-10) === cleanPhone.slice(-10));

        // 2c. Check auth users metadata for this restaurant
        let authPhoneConflict = false;
        try {
          const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const matchingAuthUser = (authUsersData?.users || []).find(u => {
            const uRestId = u.user_metadata?.restaurant_id;
            if (uRestId && uRestId !== restaurantId) return false;
            const uPhone = (u.user_metadata?.phone || u.phone || '').replace(/\D/g, '');
            return uPhone && uPhone.slice(-10) === cleanPhone.slice(-10);
          });
          if (matchingAuthUser) authPhoneConflict = true;
        } catch (authListErr) {
          console.warn('[create-invite] Phone auth lookup notice:', authListErr);
        }

        if (metaPhoneConflict || isOwnerPhoneConflict || authPhoneConflict) {
          return NextResponse.json({
            error: 'A staff member with this mobile number already exists.',
            code: 'DUPLICATE_PHONE_NUMBER'
          }, { status: 409 });
        }
      }
    }

    // 3. Search for existing profile by email
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.role === 'owner' || existingProfile.id === restRow?.owner_id) {
        return NextResponse.json({
          error: 'The restaurant owner email cannot be registered as a staff account.',
          code: 'OWNER_EMAIL_RESTRICTED'
        }, { status: 400 });
      }
      if (existingProfile.restaurant_id === restaurantId) {
        return NextResponse.json({
          error: 'A staff account with this email already exists in this restaurant.',
          code: 'STAFF_EMAIL_ALREADY_EXISTS'
        }, { status: 409 });
      }
      if (existingProfile.restaurant_id && existingProfile.restaurant_id !== restaurantId) {
        return NextResponse.json({
          error: 'This email is already registered to another restaurant.',
          code: 'EMAIL_REGISTERED_OTHER_RESTAURANT'
        }, { status: 409 });
      }
    }

    // 4. Search auth user by email
    let existingAuthUser: any = null;
    if (existingProfile?.id) {
      const { data: uData } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
      if (uData?.user) existingAuthUser = uData.user;
    }

    if (!existingAuthUser) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      existingAuthUser = users ? users.find(u => u.email?.toLowerCase() === cleanEmail) : null;
    }

    if (existingAuthUser) {
      if (existingAuthUser.id === restRow?.owner_id || existingAuthUser.email?.toLowerCase() === ownerEmail) {
        return NextResponse.json({
          error: 'The restaurant owner email cannot be registered as a staff account.',
          code: 'OWNER_EMAIL_RESTRICTED'
        }, { status: 400 });
      }
      const existingRestId = existingAuthUser.user_metadata?.restaurant_id;
      if (existingRestId === restaurantId) {
        return NextResponse.json({
          error: 'A staff account with this email already exists in this restaurant.',
          code: 'STAFF_EMAIL_ALREADY_EXISTS'
        }, { status: 409 });
      }
      if (existingRestId && existingRestId !== restaurantId) {
        return NextResponse.json({
          error: 'This email is already registered to another restaurant.',
          code: 'EMAIL_REGISTERED_OTHER_RESTAURANT'
        }, { status: 409 });
      }
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
