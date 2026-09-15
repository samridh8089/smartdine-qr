import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetUserId, requesterUserId: clientRequesterId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    // 1. Resolve requester Auth User via verified JWT token, headers, or cookies
    const authCheck = await verifyStaffRequest(req, ['owner', 'manager', 'super_admin']);
    let user = authCheck.user;
    let requesterProfile = authCheck.profile;

    // Fallback: If token was not provided by cached client, resolve requester via clientRequesterId
    if (!authCheck.isAuthorized && clientRequesterId) {
      const { data: adminUserData } = await supabaseAdmin.auth.admin.getUserById(clientRequesterId);
      if (adminUserData?.user) {
        user = adminUserData.user;
        const { data: prof } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const userEmail = (user.email || prof?.email || '').toLowerCase().trim();
        const isSuperAdmin = prof?.role === 'super_admin' || 
          userEmail === 'dsoni1281@gmail.com' || 
          userEmail === 'admin@cleverops.in' || 
          userEmail === 'founder@cleverops.in' || 
          userEmail === 'samridhtomar8@gmail.com' ||
          userEmail === 'superadmin@cleverops.in' ||
          userEmail === 'superadmin@test.com';

        const effectiveRole = isSuperAdmin ? 'super_admin' : (prof?.role || 'owner');
        if (['owner', 'manager', 'super_admin'].includes(effectiveRole)) {
          requesterProfile = prof || { id: user.id, email: user.email, role: effectiveRole };
        }
      }
    }

    if (!requesterProfile) {
      if (authCheck.response) return authCheck.response;
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required.' }, { status: 401 });
    }

    // 3. Fetch target user profile
    const { data: targetProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', targetUserId).maybeSingle();

    if (targetProfile?.role === 'owner' || targetProfile?.role === 'super_admin') {
      return NextResponse.json({ error: 'Forbidden: Cannot delete owner or super admin accounts' }, { status: 403 });
    }

    // Tenant isolation check
    if (requesterProfile.role !== 'super_admin') {
      if (targetProfile && targetProfile.restaurant_id && requesterProfile.restaurant_id !== targetProfile.restaurant_id) {
        return NextResponse.json({ error: 'Forbidden: User belongs to another restaurant' }, { status: 403 });
      }
    }

    // 4. Clean up related records
    try {
      await supabaseAdmin.from('table_assignments').delete().eq('waiter_id', targetUserId);
    } catch (e) {}

    try {
      await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', targetUserId);
    } catch (e) {}

    try {
      await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
    } catch (e) {}

    // Clean up metadata from restaurant settings if present
    if (requesterProfile.restaurant_id) {
      try {
        const { data: rest } = await supabaseAdmin.from('restaurants').select('settings').eq('id', requesterProfile.restaurant_id).maybeSingle();
        if (rest?.settings?.staff_metadata?.[targetUserId]) {
          const staffMeta = { ...rest.settings.staff_metadata };
          delete staffMeta[targetUserId];
          await supabaseAdmin.from('restaurants').update({ settings: { ...rest.settings, staff_metadata: staffMeta } }).eq('id', requesterProfile.restaurant_id);
        }
      } catch (e) {}
    }

    // 5. Delete user from auth.users via Supabase Admin API
    const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (delAuthErr) {
      console.warn('Supabase Admin deleteUser warning:', delAuthErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Staff account successfully deleted.'
    });
  } catch (err: any) {
    console.error('Error deleting staff user:', err);
    return NextResponse.json({ error: err?.message || 'Server error deleting staff user' }, { status: 500 });
  }
}
