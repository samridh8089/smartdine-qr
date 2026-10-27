import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { decodeJwtPayloadSafe } from './jwtHelper';

export { decodeJwtPayloadSafe };

let _supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdminInstance) return _supabaseAdminInstance;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  _supabaseAdminInstance = createClient(rawUrl, serviceKey);
  return _supabaseAdminInstance;
}

export async function verifySuperAdminRequest(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    let token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      token = req.headers.get('x-admin-token') || '';
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

    // NOTE: Query string (?token=) has been removed for security to avoid token leaks in logs/browser history

    if (!token) {
      return {
        isSuperAdmin: false,
        user: null,
        response: NextResponse.json({
          error: 'UNAUTHORIZED',
          message: 'Authentication token required for Super Admin access.'
        }, { status: 401 })
      };
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return {
        isSuperAdmin: false,
        user: null,
        response: NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED', message: 'Invalid or expired authentication token' }, { status: 403 })
      };
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('id', user.id)
      .maybeSingle();

    // STRICT ROLE CHECK: Only authentic role in database is authorized (C7)
    const isSuperAdmin = profile?.role === 'super_admin';

    if (!isSuperAdmin) {
      console.warn(`[FORBIDDEN 403]: Non-super-admin user ${user.email} (Role: ${profile?.role || 'owner'}) called admin API`);
      return {
        isSuperAdmin: false,
        user,
        response: NextResponse.json({
          error: 'SUPER_ADMIN_REQUIRED',
          message: 'Access denied: Only Super Admin accounts can access this resource.'
        }, { status: 403 })
      };
    }

    // 1. Decode JWT payload using strict fail-closed base64url decoder
    let jwtPayload: Record<string, any>;
    try {
      jwtPayload = decodeJwtPayloadSafe(token);
    } catch (parseErr: any) {
      console.warn(`[FORBIDDEN 403]: Super Admin ${user.email} presented unparseable JWT:`, parseErr?.message);
      return {
        isSuperAdmin: false,
        user,
        response: NextResponse.json({
          error: 'INVALID_TOKEN_PAYLOAD',
          message: 'Malformed or unparseable authentication token format.'
        }, { status: 403 })
      };
    }

    const jwtAal = jwtPayload.aal || 'aal1';

    // 2. UNCONDITIONAL FAIL-CLOSED AAL2 CHECK FOR ALL SUPER ADMIN REQUESTS
    // Super Admin endpoints MANDATE an aal2 token on every single request.
    if (jwtAal !== 'aal2') {
      // Check if user has enrolled/verified TOTP factors to return the precise actionable error code
      let hasVerifiedTotp = false;
      try {
        const { data: mfaData } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
        hasVerifiedTotp = Boolean(mfaData?.factors?.some((f: any) => f.factor_type === 'totp' && f.status === 'verified'));
      } catch (factorErr) {
        console.warn('[superAdminGuard] Could not query MFA factors list:', factorErr);
      }

      if (!hasVerifiedTotp) {
        console.warn(`[MFA ENROLLMENT REQUIRED]: Super Admin ${user.email} has no verified TOTP factor enrolled.`);
        return {
          isSuperAdmin: false,
          user,
          response: NextResponse.json({
            error: 'MFA_ENROLLMENT_REQUIRED',
            message: 'Two-Factor Authentication (TOTP) enrollment is mandatory for Super Admin accounts before accessing admin endpoints. Please enroll via the Super Admin portal.'
          }, { status: 403 })
        };
      }

      console.warn(`[MFA CHALLENGE REQUIRED]: Super Admin ${user.email} presented single-factor token (${jwtAal}) instead of mandatory aal2.`);
      return {
        isSuperAdmin: false,
        user,
        response: NextResponse.json({
          error: 'MFA_CHALLENGE_REQUIRED',
          message: 'Two-Factor Authentication (AAL2) token required for Super Admin actions. Please verify your 6-digit TOTP code.'
        }, { status: 403 })
      };
    }

    return { isSuperAdmin: true, user, response: null };
  } catch (err: any) {
    return {
      isSuperAdmin: false,
      user: null,
      response: NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED', message: err?.message }, { status: 403 })
    };
  }
}
