import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyStaffRequest } from '@/lib/staffAuthGuard';

let _supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role environment variables');
  _supabaseAdmin = createClient(url, key);
  return _supabaseAdmin;
}

// In-memory staff list cache (60s TTL)
interface StaffCacheEntry {
  timestamp: number;
  staff: any[];
}
const staffListCache = new Map<string, StaffCacheEntry>();

// In-memory auth users cache (5 min TTL) to avoid heavy 1000-user scan on every call
let authUsersCache: { timestamp: number; map: Map<string, any> } | null = null;
async function getCachedAuthUsers(admin: any): Promise<Map<string, any>> {
  if (authUsersCache && Date.now() - authUsersCache.timestamp < 300000) {
    return authUsersCache.map;
  }
  try {
    const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch(() => ({ data: null }));
    const map = new Map<string, any>((authData?.users || []).map((u: any) => [u.id, u]));
    authUsersCache = { timestamp: Date.now(), map };
    return map;
  } catch {
    return authUsersCache?.map || new Map();
  }
}

export async function GET(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const isRefresh = searchParams.get('refresh') === 'true';

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    // Return instant cached staff list if available and fresh
    if (!isRefresh) {
      const cached = staffListCache.get(restaurantId);
      if (cached && Date.now() - cached.timestamp < 60000) {
        return NextResponse.json({
          success: true,
          staff: cached.staff
        });
      }
    }

    // Enforce mandatory staff authentication & multi-tenant isolation
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'supervisor', 'waiter', 'cashier', 'kitchen', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized && authCheck.response) {
      return authCheck.response;
    }

    // 1. Fetch restaurant settings for staff_metadata fallback
    const { data: rest } = await supabaseAdmin
      .from('restaurants')
      .select('owner_id, settings')
      .eq('id', restaurantId)
      .maybeSingle();

    const staffMeta = rest?.settings?.staff_metadata || {};

    // 2. Fetch profiles using admin service role key (bypasses RLS filtering)
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, restaurant_id, created_at, updated_at, push_token, user_id')
      .eq('restaurant_id', restaurantId)
      .neq('role', 'super_admin');

    if (error) {
      console.error('[API Staff List] Supabase admin error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch auth users from fast memory cache
    const authUsersMap = await getCachedAuthUsers(supabaseAdmin);

    const rawProfiles = profiles || [];
    const foundIds = new Set(rawProfiles.map((p: any) => p.id));

    // 3. Map & enrich DB profiles
    const mergedProfiles = rawProfiles.map((p: any) => {
      const meta = (p as any).metadata || {};
      const staffSetting = staffMeta[p.id] || {};
      const authUser: any = authUsersMap.get(p.id);

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

    const seenEmails = new Set(mergedProfiles.map((p: any) => p.email.trim().toLowerCase()));

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

    // Cache the merged result
    staffListCache.set(restaurantId, {
      timestamp: Date.now(),
      staff: mergedProfiles
    });

    // Passwords are never returned over API in modern secure design
    return NextResponse.json({
      success: true,
      staff: mergedProfiles
    });
  } catch (err: any) {
    console.error('[API Staff List] Server Exception:', err);
    return NextResponse.json({ error: err?.message || 'Server error fetching staff list' }, { status: 500 });
  }
}
