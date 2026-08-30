import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otpEngine';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, otp, staffId, restaurantId } = body;

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and 8-digit OTP code are required.' }, { status: 400 });
    }

    // 1. Verify OTP
    const verifyResult = await verifyOtp({
      target: email,
      type: 'staff_email',
      otp: otp.trim(),
      userId: staffId
    });

    if (!verifyResult.success) {
      return NextResponse.json({ error: verifyResult.message }, { status: 400 });
    }

    // 2. Mark staff profile as Active & Verified in Database + Auth
    if (staffId) {
      try {
        // Confirm email on Supabase Auth user
        await supabaseAdmin.auth.admin.updateUserById(staffId, {
          email_confirm: true,
          user_metadata: {
            is_active: true,
            is_verified: true,
            verification_status: 'active'
          }
        }).catch(() => {});

        // Ensure profiles table has restaurant_id linked using ONLY valid columns
        if (restaurantId) {
          await supabaseAdmin.from('profiles').update({
            restaurant_id: restaurantId,
            updated_at: new Date().toISOString()
          }).eq('id', staffId);
        }
      } catch (e) {
        console.warn('[Staff Verify-OTP] Profile status update notice:', e);
      }
    }

    // 3. Update staff metadata in restaurant settings if restaurantId provided
    if (restaurantId && staffId) {
      try {
        const { data: rest } = await supabaseAdmin.from('restaurants').select('settings').eq('id', restaurantId).maybeSingle();
        if (rest) {
          const staffMeta = rest.settings?.staff_metadata || {};
          const existingMeta = staffMeta[staffId] || {};

          // Also fetch profile info if email/name missing
          const { data: prof } = await supabaseAdmin.from('profiles').select('*').eq('id', staffId).maybeSingle();

          staffMeta[staffId] = {
            ...existingMeta,
            full_name: existingMeta.full_name || prof?.full_name || 'Staff Member',
            email: existingMeta.email || prof?.email || email,
            role: existingMeta.role || prof?.role || 'waiter',
            department: existingMeta.department || prof?.department || 'waiter',
            is_verified: true,
            verification_status: 'active',
            is_active: true
          };

          await supabaseAdmin.from('restaurants').update({
            settings: {
              ...rest.settings,
              staff_metadata: staffMeta
            }
          }).eq('id', restaurantId);
        }
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      message: 'Staff account successfully verified and activated!'
    });
  } catch (err: any) {
    console.error('[API Staff-Verify-OTP] Error:', err);
    return NextResponse.json({ error: err?.message || 'Server error verifying staff OTP' }, { status: 500 });
  }
}
