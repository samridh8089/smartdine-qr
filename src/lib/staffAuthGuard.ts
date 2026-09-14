import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseServiceKey = rawKey || 'placeholder-service-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export interface StaffAuthResult {
  isAuthorized: boolean;
  isSuperAdmin: boolean;
  user: any;
  profile: any;
  response: NextResponse | null;
}

export async function verifyStaffRequest(
  req: Request,
  allowedRoles?: string[],
  targetRestaurantId?: string
): Promise<StaffAuthResult> {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    let token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      token = req.headers.get('x-staff-token') || req.headers.get('x-admin-token') || '';
    }

    if (!token) {
      // Try extracting from Cookie header
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
      if (match) {
        try {
          const rawVal = decodeURIComponent(match[1]);
          const parsed = JSON.parse(rawVal);
          token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed);
        } catch (e) {
          token = decodeURIComponent(match[1]);
        }
      }
    }

    if (!token) {
      const url = new URL(req.url);
      token = url.searchParams.get('token') || '';
    }

    if (!token) {
      return {
        isAuthorized: false,
        isSuperAdmin: false,
        user: null,
        profile: null,
        response: NextResponse.json({
          error: 'UNAUTHORIZED',
          message: 'Authentication required. Missing staff session token.'
        }, { status: 401 })
      };
    }

    // 1. Verify token with Supabase Auth
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return {
        isAuthorized: false,
        isSuperAdmin: false,
        user: null,
        profile: null,
        response: NextResponse.json({
          error: 'INVALID_TOKEN',
          message: 'Invalid or expired staff session token.'
        }, { status: 401 })
      };
    }

    // 2. Fetch user profile from database
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, restaurant_id')
      .eq('id', user.id)
      .maybeSingle();

    const userEmail = (user.email || profile?.email || '').toLowerCase().trim();
    const isSuperAdmin = profile?.role === 'super_admin' || 
      userEmail === 'dsoni1281@gmail.com' || 
      userEmail === 'admin@cleverops.in' || 
      userEmail === 'founder@cleverops.in' || 
      userEmail === 'samridhtomar8@gmail.com' ||
      userEmail === 'superadmin@cleverops.in' ||
      userEmail === 'superadmin@test.com';

    const effectiveRole = isSuperAdmin ? 'super_admin' : (profile?.role || 'owner');

    // 3. Verify Allowed Roles
    if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
      if (!allowedRoles.includes(effectiveRole)) {
        return {
          isAuthorized: false,
          isSuperAdmin: false,
          user,
          profile: profile || { id: user.id, email: user.email, role: effectiveRole },
          response: NextResponse.json({
            error: 'FORBIDDEN',
            message: `Role "${effectiveRole}" is not authorized for this staff operation.`
          }, { status: 403 })
        };
      }
    }

    // 4. Verify Tenant Isolation (Multi-tenant restaurant check)
    if (targetRestaurantId && !isSuperAdmin) {
      const staffRestId = profile?.restaurant_id;
      if (staffRestId && staffRestId !== targetRestaurantId) {
        return {
          isAuthorized: false,
          isSuperAdmin: false,
          user,
          profile: profile || { id: user.id, email: user.email, role: effectiveRole },
          response: NextResponse.json({
            error: 'TENANT_MISMATCH',
            message: 'Forbidden: You cannot access or modify orders from another restaurant.'
          }, { status: 403 })
        };
      }
    }

    return {
      isAuthorized: true,
      isSuperAdmin,
      user,
      profile: profile || { id: user.id, email: user.email, role: effectiveRole, restaurant_id: targetRestaurantId },
      response: null
    };
  } catch (err: any) {
    return {
      isAuthorized: false,
      isSuperAdmin: false,
      user: null,
      profile: null,
      response: NextResponse.json({
        error: 'AUTH_ERROR',
        message: err?.message || 'Authentication error'
      }, { status: 500 })
    };
  }
}
