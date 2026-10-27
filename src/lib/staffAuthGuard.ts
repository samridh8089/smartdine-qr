import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decodeJwtPayloadSafe } from '@/lib/superAdminGuard';

let _supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdminInstance) return _supabaseAdminInstance;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!serviceKey) {
    throw new Error('Missing Supabase key environment variable');
  }

  _supabaseAdminInstance = createClient(rawUrl, serviceKey);
  return _supabaseAdminInstance;
}

const STAFF_AUTH_CACHE = new Map<string, { result: StaffAuthResult; expiresAt: number }>();

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

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Service role key fast path (internal API calls, background tasks, scripts)
    const isServiceKey = Boolean(serviceKey && serviceKey.length > 20 && (
      token === serviceKey ||
      req.headers.get('x-service-role-key') === serviceKey ||
      authHeader.includes(serviceKey)
    ));
    if (isServiceKey) {
      return {
        isAuthorized: true,
        isSuperAdmin: true,
        user: { id: 'service-role', email: 'admin@cleverops.in' },
        profile: { id: 'service-role', role: 'super_admin', full_name: 'System Admin' },
        response: null
      };
    }

    // Fast-path: Check in-memory cache
    if (token && STAFF_AUTH_CACHE.has(token)) {
      const cached = STAFF_AUTH_CACHE.get(token)!;
      if (cached.expiresAt > Date.now()) {
        const { isSuperAdmin, user, profile } = cached.result;
        const effectiveRole = isSuperAdmin ? 'super_admin' : (profile?.role || 'owner');
        if (!allowedRoles || isSuperAdmin || allowedRoles.includes(effectiveRole)) {
          if (!targetRestaurantId || isSuperAdmin || !profile?.restaurant_id || profile.restaurant_id === targetRestaurantId) {
            return {
              isAuthorized: true,
              isSuperAdmin,
              user,
              profile,
              response: null
            };
          }
        }
      } else {
        STAFF_AUTH_CACHE.delete(token);
      }
    }

    if (!token) {
      // Try extracting from Cookie header (supports standard and chunked sb-*-auth-token cookies)
      const cookieHeader = req.headers.get('cookie') || '';
      const cookieMatches = cookieHeader.match(/(?:smartdine_auth_token_v2|sb-[^=]+-auth-token(?:\.\d+)?)=([^;]+)/g) || [];
      for (const m of cookieMatches) {
        const val = m.split('=')[1];
        if (!val) continue;
        try {
          const rawVal = decodeURIComponent(val);
          if (rawVal.startsWith('base64-')) {
            const decoded = Buffer.from(rawVal.substring(7), 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            const candidate = Array.isArray(parsed) ? (parsed[0]?.access_token || parsed[0]) : (parsed?.access_token || parsed);
            if (candidate && typeof candidate === 'string' && candidate.length > 20) {
              token = candidate;
              break;
            }
          } else {
            const parsed = JSON.parse(rawVal);
            const candidate = Array.isArray(parsed) ? (parsed[0]?.access_token || parsed[0]) : (parsed?.access_token || parsed);
            if (candidate && typeof candidate === 'string' && candidate.length > 20) {
              token = candidate;
              break;
            }
          }
        } catch (e) {
          if (val.length > 20) {
            token = decodeURIComponent(val);
            break;
          }
        }
      }
    }

    // NOTE: 'x-impersonated-profile' header handling has been completely removed for security (R2)
    // NOTE: Query string (?token=) extraction has been completely removed for security

    if (!token) {
      // Strict local development check: ONLY when NODE_ENV is explicitly 'development', never based on host header
      const localRestId = req.headers.get('x-restaurant-id');
      const localStaffRole = req.headers.get('x-staff-role') || 'owner';
      const isDevEnv = process.env.NODE_ENV === 'development';
      if (localRestId && isDevEnv) {
        return {
          isAuthorized: true,
          isSuperAdmin: false,
          user: { id: `local_${localStaffRole}`, email: 'owner@localhost' },
          profile: { id: `local_${localStaffRole}`, role: localStaffRole, restaurant_id: localRestId, full_name: 'Staff Member' },
          response: null
        };
      }

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

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify token with Supabase Auth
    let userResult = await supabaseAdmin.auth.getUser(token);
    let user = userResult.data?.user;
    let authErr = userResult.error;

    // 1a. If token failed, check if Cookie header contains alternative valid tokens
    if ((authErr || !user) && req.headers.get('cookie')) {
      const cookieHeader = req.headers.get('cookie') || '';
      const cookieMatches = cookieHeader.match(/sb-[^=]+-auth-token(?:\.\d+)?=([^;]+)/g) || [];
      for (const m of cookieMatches) {
        const val = m.split('=')[1];
        try {
          const rawVal = decodeURIComponent(val);
          let candidateToken = '';
          if (rawVal.startsWith('base64-')) {
            const decoded = Buffer.from(rawVal.substring(7), 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            candidateToken = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed);
          } else {
            const parsed = JSON.parse(rawVal);
            candidateToken = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed);
          }
          if (candidateToken && candidateToken !== token) {
            const check = await supabaseAdmin.auth.getUser(candidateToken);
            if (check.data?.user) {
              user = check.data.user;
              authErr = null;
              token = candidateToken;
              break;
            }
          }
        } catch (_) {}
      }
    }

    // NOTE: Unsigned JWT "grace period" fallback has been completely removed for security (R3)

    if (authErr || !user) {
      const localRestId = req.headers.get('x-restaurant-id') || targetRestaurantId;
      const localStaffRole = req.headers.get('x-staff-role') || 'owner';
      const isDevEnv = process.env.NODE_ENV === 'development';
      if (localRestId && isDevEnv) {
        return {
          isAuthorized: true,
          isSuperAdmin: false,
          user: { id: `local_${localStaffRole}`, email: 'owner@localhost' },
          profile: { id: `local_${localStaffRole}`, role: localStaffRole, restaurant_id: localRestId, full_name: 'Staff Member' },
          response: null
        };
      }

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

    let resolvedProfile: any = profile;
    if (resolvedProfile && !resolvedProfile.restaurant_id) {
      const { data: ownedRest } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (ownedRest?.id) {
        resolvedProfile.restaurant_id = ownedRest.id;
      }
    } else if (!resolvedProfile && user?.id) {
      const { data: ownedRest } = await supabaseAdmin
        .from('restaurants')
        .select('id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      resolvedProfile = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || 'Staff',
        role: ownedRest ? 'owner' : 'staff',
        restaurant_id: ownedRest?.id || targetRestaurantId || null
      };
    }

    // Hardened Super Admin determination: STRICTLY role === 'super_admin' in database (C7, R4)
    const isSuperAdmin = resolvedProfile?.role === 'super_admin';
    const effectiveRole = isSuperAdmin ? 'super_admin' : (resolvedProfile?.role || 'owner');

    // Super Admin staff operations MANDATE AAL2 token (fail-closed)
    if (isSuperAdmin) {
      let jwtAal = 'aal1';
      try {
        const payload = decodeJwtPayloadSafe(token);
        jwtAal = payload.aal || 'aal1';
      } catch (parseErr: any) {
        return {
          isAuthorized: false,
          isSuperAdmin: false,
          user,
          profile: resolvedProfile,
          response: NextResponse.json({
            error: 'INVALID_TOKEN_PAYLOAD',
            message: 'Malformed or unparseable authentication token format.'
          }, { status: 403 })
        };
      }

      if (jwtAal !== 'aal2') {
        console.warn(`[STAFF_GUARD MFA REJECTED]: Super Admin ${user.email} attempted staff route bypass with single-factor (${jwtAal}) token.`);
        return {
          isAuthorized: false,
          isSuperAdmin: false,
          user,
          profile: resolvedProfile,
          response: NextResponse.json({
            error: 'MFA_CHALLENGE_REQUIRED',
            message: 'Two-Factor Authentication (AAL2) token required for Super Admin staff operations. Please verify your 6-digit TOTP code.'
          }, { status: 403 })
        };
      }
    }

    // 3. Verify Allowed Roles
    if (allowedRoles && allowedRoles.length > 0 && !isSuperAdmin) {
      if (!allowedRoles.includes(effectiveRole)) {
        return {
          isAuthorized: false,
          isSuperAdmin: false,
          user,
          profile: resolvedProfile || { id: user.id, email: user.email, role: effectiveRole },
          response: NextResponse.json({
            error: 'FORBIDDEN',
            message: `Role "${effectiveRole}" is not authorized for this staff operation.`
          }, { status: 403 })
        };
      }
    }

    // 4. Verify Tenant Isolation (Multi-tenant restaurant check)
    if (targetRestaurantId && !isSuperAdmin) {
      const staffRestId = resolvedProfile?.restaurant_id;
      if (staffRestId && staffRestId !== targetRestaurantId) {
        return {
          isAuthorized: false,
          isSuperAdmin: false,
          user,
          profile: resolvedProfile || { id: user.id, email: user.email, role: effectiveRole },
          response: NextResponse.json({
            error: 'TENANT_MISMATCH',
            message: 'Forbidden: You cannot access or modify orders from another restaurant.'
          }, { status: 403 })
        };
      }
    }

    const authSuccess: StaffAuthResult = {
      isAuthorized: true,
      isSuperAdmin,
      user,
      profile: resolvedProfile || { id: user.id, email: user.email, role: effectiveRole, restaurant_id: targetRestaurantId },
      response: null
    };

    if (token) {
      STAFF_AUTH_CACHE.set(token, {
        result: authSuccess,
        expiresAt: Date.now() + 60000 // 60s fast-path cache
      });
    }

    return authSuccess;
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
