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
    const body = await req.json().catch(() => ({}));
    const { restaurantId } = body;

    if (!restaurantId) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'restaurantId is required' }, { status: 400 });
    }

    // Security check: verify that this user is legitimately the owner of this restaurant
    const { data: restaurant, error: restErr } = await supabaseAdmin
      .from('restaurants')
      .select('id, owner_id, settings')
      .eq('id', restaurantId)
      .maybeSingle();

    if (restErr || !restaurant) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Restaurant not found' }, { status: 404 });
    }

    const isLegitimateOwner =
      restaurant.owner_id === user.id ||
      (user.email && restaurant.settings?.owner_email?.toLowerCase() === user.email.toLowerCase()) ||
      (user.phone && restaurant.settings?.owner_phone === user.phone);

    if (!isLegitimateOwner) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'User is not verified as the owner of this restaurant' },
        { status: 403 }
      );
    }

    // Execute privileged profile link using service_role instance
    const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert({
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.fullName || user.email || 'Owner',
      role: 'owner',
      restaurant_id: restaurant.id,
      is_active: true
    });

    if (upsertErr) {
      console.error('[auto-link-profile] Upsert error:', upsertErr);
      return NextResponse.json({ error: 'INTERNAL_ERROR', message: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, restaurantId: restaurant.id });
  } catch (err: any) {
    console.error('[auto-link-profile] Unexpected error:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: err?.message || 'Server error' }, { status: 500 });
  }
}
