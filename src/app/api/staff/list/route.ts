import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // 1. Fetch restaurant settings for staff_metadata fallback
    const { data: rest } = await supabaseAdmin
      .from('restaurants')
      .select('settings')
      .eq('id', restaurantId)
      .maybeSingle();

    const staffMeta = rest?.settings?.staff_metadata || {};

    // 2. Fetch profiles using admin service role key (bypasses RLS filtering)
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .neq('role', 'super_admin');

    if (error) {
      console.error('[API Staff List] Supabase admin error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch auth users to inspect email_confirmed_at & user_metadata
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: null }));
    const authUsersMap = new Map((authData?.users || []).map(u => [u.id, u]));

    const rawProfiles = profiles || [];
    const foundIds = new Set(rawProfiles.map(p => p.id));

    // 3. Map & enrich DB profiles
    const mergedProfiles = rawProfiles.map(p => {
      const meta = (p as any).metadata || {};
      const staffSetting = staffMeta[p.id] || {};
      const authUser = authUsersMap.get(p.id);

      const isVerified = Boolean(
        authUser?.email_confirmed_at ||
        authUser?.user_metadata?.is_verified === true ||
        authUser?.user_metadata?.verification_status === 'active' ||
        staffSetting.is_verified === true ||
        staffSetting.verification_status === 'active' ||
        meta.is_verified === true ||
        p.role === 'owner'
      );

      const verStatus = isVerified ? 'active' : 'pending_verification';

      return {
        ...p,
        department: p.department || staffSetting.department || (p.role === 'waiter' ? 'waiter' : p.role === 'kitchen' ? 'kitchen' : 'general'),
        phone: p.phone || staffSetting.phone || '',
        is_active: p.is_active !== undefined ? p.is_active : (staffSetting.is_active !== false),
        is_verified: isVerified,
        verification_status: verStatus
      };
    });

    const seenEmails = new Set(mergedProfiles.map(p => p.email.trim().toLowerCase()));

    // 4. Also include any virtual staff members stored in staff_metadata if not in profiles yet
    Object.keys(staffMeta).forEach(id => {
      if (!foundIds.has(id)) {
        const item = staffMeta[id];
        if (item && item.email) {
          const normEmail = item.email.trim().toLowerCase();
          if (!seenEmails.has(normEmail)) {
            seenEmails.add(normEmail);
            mergedProfiles.push({
              id,
              email: item.email,
              full_name: item.full_name || item.name || 'Staff Member',
              role: item.role || 'waiter',
              department: item.department || 'waiter',
              phone: item.phone || '',
              restaurant_id: restaurantId,
              is_active: item.is_active !== false,
              is_verified: item.is_verified !== false,
              verification_status: item.verification_status || 'active'
            } as any);
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      staff: mergedProfiles
    });
  } catch (err: any) {
    console.error('[API Staff List] Server Exception:', err);
    return NextResponse.json({ error: err?.message || 'Server error fetching staff list' }, { status: 500 });
  }
}
