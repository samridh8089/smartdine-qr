import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkResourceLimitForRestaurant } from '@/lib/entitlements';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

import { verifyStaffRequest } from '@/lib/staffAuthGuard';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, password, role, department, restaurantId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // 1. Caller Authorization Guard: only owner, manager, or super_admin can create/invite staff
    const authCheck = await verifyStaffRequest(req, ['owner', 'manager', 'super_admin'], restaurantId);
    if (!authCheck.isAuthorized && authCheck.response) {
      return authCheck.response;
    }

    // 2. Privilege Escalation Protection: Forbid creating super_admin or owner roles via staff invite
    const requestedRole = (role || 'staff').toLowerCase().trim();
    const ALLOWED_STAFF_ROLES = ['waiter', 'kitchen', 'cashier', 'manager', 'supervisor', 'staff'];
    if (requestedRole === 'super_admin' || requestedRole === 'owner' || !ALLOWED_STAFF_ROLES.includes(requestedRole)) {
      return NextResponse.json({
        error: 'ROLE_ESCALATION_FORBIDDEN',
        message: 'Forbidden: Cannot create super_admin or owner accounts through staff invites.'
      }, { status: 403 });
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const resolvedDept = department || (role === 'waiter' ? 'waiter' : role === 'kitchen' ? 'kitchen' : 'general');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: 'Valid email address is required', code: 'INVALID_EMAIL' }, { status: 400 });
    }

    // 0. Enforce Staff Resource Limit on Subscription Plan
    const { count: currentStaffCount } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .neq('role', 'owner');

    const limitCheck = await checkResourceLimitForRestaurant(restaurantId, 'staff_accounts', currentStaffCount || 0);
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: limitCheck.message || 'Staff limit reached for your current subscription plan. Upgrade your plan to add more staff.',
        code: 'STAFF_LIMIT_EXCEEDED',
        limit: limitCheck.limit,
        count: limitCheck.count
      }, { status: 403 });
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
      try {
        const { data: authList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        existingAuthUser = authList?.users ? authList.users.find(u => u.email?.toLowerCase() === cleanEmail) : null;
      } catch (listErr) {
        console.warn('[create-invite] auth listUsers skipped:', listErr);
      }
    }

    let newUser: any = null;
    if (existingAuthUser) {
      if (existingAuthUser.id === restRow?.owner_id || existingAuthUser.email?.toLowerCase() === ownerEmail) {
        return NextResponse.json({
          error: 'The restaurant owner email cannot be registered as a staff account.',
          code: 'OWNER_EMAIL_RESTRICTED'
        }, { status: 400 });
      }
      const existingRestId = existingAuthUser.user_metadata?.restaurant_id || existingProfile?.restaurant_id;
      if (existingRestId === restaurantId) {
        return NextResponse.json({
          error: 'A staff account with this email already exists in this restaurant.',
          code: 'STAFF_EMAIL_ALREADY_EXISTS'
        }, { status: 409 });
      }
      if (existingRestId && existingRestId !== restaurantId) {
        // Verify if the other restaurant still exists in DB
        const { data: otherRest } = await supabaseAdmin
          .from('restaurants')
          .select('id, name')
          .eq('id', existingRestId)
          .maybeSingle();

        if (otherRest) {
          return NextResponse.json({
            error: `This email is already registered to another restaurant (${otherRest.name}).`,
            code: 'EMAIL_REGISTERED_OTHER_RESTAURANT'
          }, { status: 409 });
        }
      }

      // If user has no active restaurant in DB (unassigned or leftover from previous restaurant cleanups),
      // seamlessly adopt this account into this restaurant as a staff member!
      newUser = existingAuthUser;
      try {
        await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
          password: password || undefined,
          user_metadata: {
            fullName: name,
            role: role || 'staff',
            department: resolvedDept,
            phone: phone || '',
            restaurant_id: restaurantId,
            verification_status: 'pending_verification'
          }
        });
      } catch (updateErr) {
        console.warn('[create-invite] Could not update auth user metadata on adopt:', updateErr);
      }
    }

    // 2. User does not exist -> Create user cleanly using admin API or signUp fallback
    let createErrMessage = '';
    try {
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
      if (newAuthData?.user) {
        newUser = newAuthData.user;
      } else if (createErr) {
        createErrMessage = createErr.message || (typeof createErr === 'string' ? createErr : '');
        console.warn('[create-invite] admin.createUser returned error:', createErr);
      }
    } catch (adminErr: any) {
      console.warn('[create-invite] admin.createUser threw:', adminErr);
      createErrMessage = adminErr?.message || 'Failed to create user in auth system';
    }

    if (!newUser) {
      if (createErrMessage && createErrMessage.trim() && createErrMessage !== '{}') {
        const lower = createErrMessage.toLowerCase();
        if (lower.includes('already') || lower.includes('registered') || lower.includes('exists')) {
          // Attempt to find user and adopt if unassigned to another active restaurant
          try {
            const { data: searchList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const foundUser = searchList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
            if (foundUser) {
              const uRestId = foundUser.user_metadata?.restaurant_id;
              if (uRestId && uRestId !== restaurantId) {
                const { data: activeOtherRest } = await supabaseAdmin.from('restaurants').select('id, name').eq('id', uRestId).maybeSingle();
                if (activeOtherRest) {
                  return NextResponse.json({
                    error: `This email is already registered to another restaurant (${activeOtherRest.name}).`,
                    code: 'EMAIL_REGISTERED_OTHER_RESTAURANT'
                  }, { status: 409 });
                }
              }
              // Adopt unassigned user
              newUser = foundUser;
              try {
                await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
                  password: password || undefined,
                  user_metadata: {
                    fullName: name,
                    role: role || 'staff',
                    department: resolvedDept,
                    phone: phone || '',
                    restaurant_id: restaurantId,
                    verification_status: 'pending_verification'
                  }
                });
              } catch (_) {}
            }
          } catch (adoptErr) {
            console.warn('[create-invite] Adoption search error:', adoptErr);
          }

          if (!newUser) {
            return NextResponse.json({
              error: 'An account with this email address already exists. Please use a different email.',
              code: 'STAFF_EMAIL_ALREADY_EXISTS'
            }, { status: 409 });
          }
        } else if (lower.includes('password')) {
          return NextResponse.json({
            error: 'Staff password does not meet requirements. Please provide at least 6 characters.',
            code: 'INVALID_PASSWORD'
          }, { status: 400 });
        } else {
          return NextResponse.json({
            error: createErrMessage,
            code: 'USER_CREATION_FAILED'
          }, { status: 400 });
        }
      }

      const { data: signUpData, error: signUpErr } = await supabaseAdmin.auth.signUp({
        email: cleanEmail,
        password: password || 'SmartDine123!',
        options: {
          data: {
            fullName: name,
            role: role || 'staff',
            department: resolvedDept,
            phone: phone || '',
            restaurant_id: restaurantId,
            verification_status: 'pending_verification'
          }
        }
      });
      if (signUpErr || !signUpData?.user) {
        const signMsg = signUpErr?.message?.toLowerCase() || '';
        const isAlreadyExists = signMsg.includes('already') || signMsg.includes('exists') || (signUpErr && (signUpErr).code === 'user_already_exists');

        if (isAlreadyExists) {
          // Check if user has an existing profile in another active restaurant
          const { data: existingProf } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (existingProf?.restaurant_id && existingProf.restaurant_id !== restaurantId) {
            const { data: otherRest } = await supabaseAdmin.from('restaurants').select('id, name').eq('id', existingProf.restaurant_id).maybeSingle();
            if (otherRest) {
              return NextResponse.json({
                error: `This email is already registered to another restaurant (${otherRest.name}).`,
                code: 'EMAIL_REGISTERED_OTHER_RESTAURANT'
              }, { status: 409 });
            }
          }

          // User is unassigned to any restaurant: adopt existing auth account!
          try {
            const { data: searchList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            const matchedAuthUser = searchList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
            if (matchedAuthUser) {
              newUser = matchedAuthUser;
              try {
                await supabaseAdmin.auth.admin.updateUserById(matchedAuthUser.id, {
                  password: password || undefined,
                  user_metadata: {
                    fullName: name,
                    role: role || 'staff',
                    department: resolvedDept,
                    phone: phone || '',
                    restaurant_id: restaurantId,
                    verification_status: 'pending_verification'
                  }
                });
              } catch (_) {}
            }
          } catch (_) {}
        }

        if (!newUser) {
          const fallbackMsg = (signUpErr?.message && signUpErr.message.trim() && signUpErr.message !== '{}')
            ? signUpErr.message.trim()
            : 'Failed to create staff account. The email may already be registered or invalid.';
          return NextResponse.json({ error: fallbackMsg, code: 'SIGNUP_FAILED' }, { status: 400 });
        }
      } else {
        newUser = signUpData.user;
      }
    }

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
          plain_password: password || undefined,
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

    // Broadcast staff-created event across Realtime channels
    try {
      const { broadcastStaffRealtimeEvent } = await import('@/lib/realtime');
      await broadcastStaffRealtimeEvent({
        restaurantId,
        staffId: newUser.id,
        action: 'create',
        profile: {
          id: newUser.id,
          email: cleanEmail,
          full_name: name,
          role: role || 'staff',
          department: resolvedDept,
          phone: phone || '',
          restaurant_id: restaurantId,
          is_active: true
        },
        client: supabaseAdmin
      });
    } catch (bcErr) {
      console.warn('[create-invite] broadcastStaffRealtimeEvent error:', bcErr);
    }

    return NextResponse.json({
      success: true,
      user: newUser,
      otpSent: true,
      message: 'Staff account created. Verification OTP sent to email.'
    });
  } catch (err: any) {
    console.error('[create-invite] Uncaught error:', err);
    let errMsg = 'Server error creating staff invite';
    if (typeof err === 'string' && err.trim() && err !== '{}') {
      errMsg = err.trim();
    } else if (err?.message && typeof err.message === 'string' && err.message.trim() && err.message !== '{}') {
      errMsg = err.message.trim();
    }
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
