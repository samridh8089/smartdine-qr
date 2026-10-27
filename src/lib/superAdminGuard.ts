import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

    // MANDATORY MFA (AAL2) VERIFICATION FOR SUPER ADMIN
    let jwtAal = 'aal1';
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        jwtAal = payload.aal || 'aal1';
      }
    } catch (e) {
      // In case of parsing error, jwtAal remains 'aal1'
    }

    // Check if user has enrolled/verified TOTP factors
    let hasVerifiedTotp = (user as any).factors?.some((f: any) => f.factor_type === 'totp' && f.status === 'verified');
    if (hasVerifiedTotp === undefined) {
      try {
        const { data: mfaData } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: user.id });
        hasVerifiedTotp = mfaData?.factors?.some((f: any) => f.factor_type === 'totp' && f.status === 'verified');
      } catch (mfaErr) {
        console.warn('[superAdminGuard] Failed to fetch MFA factors:', mfaErr);
      }
    }

    if (hasVerifiedTotp && jwtAal !== 'aal2') {
      console.warn(`[MFA REJECTED]: Super Admin ${user.email} attempted admin API call with single-factor token (${jwtAal} instead of aal2)`);
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
