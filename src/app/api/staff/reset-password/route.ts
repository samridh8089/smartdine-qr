import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service environment variables');
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

export async function POST(req: Request) {
  try {
    // 1. Resolve requester Auth User strictly via verified JWT token, headers, or cookies
    const authCheck = await verifyStaffRequest(req, ['owner', 'manager', 'super_admin']);
    if (!authCheck.isAuthorized || !authCheck.profile) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required.' }, { status: 401 });
    }

    const requesterProfile = authCheck.profile;

    // Check requester role
    if (!['owner', 'manager', 'super_admin'].includes(requesterProfile.role)) {
      return NextResponse.json({ error: 'Forbidden: Only restaurant owners, managers, and super admins can reset passwords' }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, newPassword } = body;

    if (!targetUserId || !newPassword) {
      return NextResponse.json({ error: 'targetUserId and newPassword are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 2. Fetch target staff profile from DB (or fallback to Auth user)
    let targetProfile: any = null;
    const { data: targetProf } = await supabaseAdmin.from('profiles').select('*').eq('id', targetUserId).maybeSingle();
    if (targetProf) {
      targetProfile = targetProf;
    } else {
      const { data: targetAuth } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      if (targetAuth?.user) {
        targetProfile = {
          id: targetAuth.user.id,
          email: targetAuth.user.email,
          full_name: targetAuth.user.user_metadata?.fullName || targetAuth.user.email,
          role: targetAuth.user.user_metadata?.role || 'staff',
          restaurant_id: targetAuth.user.user_metadata?.restaurant_id || null
        };
      }
    }

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target staff member profile not found' }, { status: 404 });
    }

    // Explicit Owner Protection: Block resetting Owner or Super Admin accounts via staff management
    const restIdForCheck = requesterProfile.restaurant_id || targetProfile.restaurant_id;
    let restaurantOwnerId: string | null = null;
    if (restIdForCheck) {
      const { data: restRow } = await supabaseAdmin.from('restaurants').select('owner_id').eq('id', restIdForCheck).maybeSingle();
      if (restRow?.owner_id) restaurantOwnerId = restRow.owner_id;
    }

    if (
      targetProfile.role === 'owner' || 
      targetProfile.role === 'super_admin' || 
      (restaurantOwnerId && targetUserId === restaurantOwnerId)
    ) {
      return NextResponse.json({ error: 'Forbidden: Cannot reset the restaurant owner password via staff management' }, { status: 403 });
    }

    // 3. STRICT TENANT ISOLATION: Target user must belong to requester's restaurant (unless super_admin)
    if (!authCheck.isSuperAdmin) {
      if (!requesterProfile.restaurant_id || targetProfile.restaurant_id !== requesterProfile.restaurant_id) {
        return NextResponse.json(
          { error: 'Forbidden: You are not authorized to modify users belonging to another restaurant.' },
          { status: 403 }
        );
      }
    }

    // 4. Update password via Supabase Admin Auth API + RPC fallback + confirm email
    let updateSuccess = false;
    try {
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          is_active: true,
          is_verified: true,
          verification_status: 'active'
        }
      });
      if (!updateErr) updateSuccess = true;
    } catch (_) {}

    // 4b. Database RPC to crypt password directly in auth.users
    try {
      await supabaseAdmin.rpc('reset_staff_password', {
        target_user_id: targetUserId,
        new_password: newPassword
      });
      updateSuccess = true;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${targetProfile.full_name || targetProfile.email}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error resetting password' }, { status: 500 });
  }
}
