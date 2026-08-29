import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const body = await req.json();
    const { targetUserId, newPassword, requesterUserId: clientRequesterId } = body;

    if (!targetUserId || !newPassword) {
      return NextResponse.json({ error: 'targetUserId and newPassword are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // 1. Resolve requester Auth User
    let user: any = null;
    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) user = data.user;
    }

    if (!user && clientRequesterId) {
      const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(clientRequesterId);
      if (adminUser?.user) user = adminUser.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthenticated user session' }, { status: 401 });
    }

    // 2. Resolve requester profile from DB with robust fallbacks
    let requesterProfile: any = null;
    const { data: profById } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profById) {
      requesterProfile = profById;
    } else if (user.email) {
      const { data: profByEmail } = await supabaseAdmin.from('profiles').select('*').eq('email', user.email).maybeSingle();
      if (profByEmail) requesterProfile = profByEmail;
    }

    // If profile row doesn't exist in profiles table, construct profile object from Auth user metadata & restaurant lookup
    if (!requesterProfile) {
      const isSuperAdmin = false; // require DB profile for super_admin
      const role = (user.user_metadata?.role) || 'owner';
      let restId = user.user_metadata?.restaurant_id || null;

      if (!restId && role === 'owner') {
        const { data: rest } = await supabaseAdmin.from('restaurants').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (rest) restId = rest.id;
      }

      requesterProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.fullName || user.email,
        role: role,
        restaurant_id: restId
      };
    }

    // Check requester role
    if (!['owner', 'manager', 'super_admin'].includes(requesterProfile.role)) {
      return NextResponse.json({ error: 'Forbidden: Only restaurant owners, managers, and super admins can reset passwords' }, { status: 403 });
    }

    // 3. Fetch target staff profile from DB (or fallback to Auth user)
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

    // 4. STRICT TENANT ISOLATION (Independent of subscription status)
    if (requesterProfile.role === 'owner') {
      if (!requesterProfile.restaurant_id || (targetProfile.restaurant_id && requesterProfile.restaurant_id !== targetProfile.restaurant_id)) {
        return NextResponse.json(
          { error: 'Forbidden: You are not authorized to modify users belonging to another restaurant.' },
          { status: 403 }
        );
      }
    }

    // 5. Update password via Supabase Admin Auth API
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      password: newPassword
    });

    if (updateErr) {
      console.error('Supabase Auth updateUserById error:', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Failed to update staff password' }, { status: 500 });
    }

    // Update plain_password on profile if row exists
    try {
      await supabaseAdmin.from('profiles').update({ plain_password: newPassword }).eq('id', targetUserId);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${targetProfile.full_name || targetProfile.email}.`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error resetting password' }, { status: 500 });
  }
}
