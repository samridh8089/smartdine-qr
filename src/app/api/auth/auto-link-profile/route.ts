import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Bearer token required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' }, { status: 401 });
    }

    const user = userData.user;

    // Requirement: user.email_confirmed_at null ho toh 403
    if (!user.email_confirmed_at) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Email must be confirmed before linking profile' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { restaurantId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'restaurantId is required' }, { status: 400 });
    }

    // Security check: verify that this user is legitimately the owner of this restaurant
    // Requirement: ownership sirf restaurant.owner_id === user.id se maano. settings.owner_email aur settings.owner_phone wale match hata do.
    const { data: restaurant, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, owner_id')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Restaurant not found' }, { status: 404 });
    }

    const isLegitimateOwner = restaurant.owner_id === user.id;

    if (!isLegitimateOwner) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'User is not verified as the owner of this restaurant' },
        { status: 403 }
      );
    }

    // Requirement: Agar profile pehle se maujood hai aur uska restaurant_id null nahi hai, toh kuch mat badlo (409 do).
    // Requirement: Existing profile ka role is route se kabhi overwrite mat karo.
    const { data: existingProfile, error: profileErr } = await supabaseAdmin.from('profiles')
      .select('id, role, restaurant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('[auto-link-profile] Profile fetch error:', profileErr);
      return NextResponse.json({ error: 'INTERNAL_ERROR', message: profileErr.message }, { status: 500 });
    }

    if (existingProfile) {
      if (existingProfile.restaurant_id) {
        return NextResponse.json(
          { error: 'CONFLICT', message: 'Profile is already linked to a restaurant' },
          { status: 409 }
        );
      }

      // Profile exists with null restaurant_id: link restaurant_id, but NEVER overwrite role!
      const { error: updateErr } = await supabaseAdmin.from('profiles')
        .update({
          restaurant_id: restaurant.id,
          is_active: true
        })
        .eq('id', user.id);

      if (updateErr) {
        console.error('[auto-link-profile] Profile update error:', updateErr);
        return NextResponse.json({ error: 'INTERNAL_ERROR', message: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, restaurantId: restaurant.id });
    }

    // Profile does not exist yet: insert brand new owner profile
    const { error: insertErr } = await supabaseAdmin.from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.fullName || user.email || 'Owner',
        role: 'owner',
        restaurant_id: restaurant.id,
        is_active: true
      });

    if (insertErr) {
      console.error('[auto-link-profile] Profile insert error:', insertErr);
      return NextResponse.json({ error: 'INTERNAL_ERROR', message: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, restaurantId: restaurant.id });
  } catch (err: any) {
    console.error('[auto-link-profile] Unexpected error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err?.message || 'Server error' }, { status: 500 });
  }
}
