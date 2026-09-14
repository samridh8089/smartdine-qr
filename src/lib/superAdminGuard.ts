import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseUrl = rawUrl.startsWith('http') ? rawUrl : 'https://placeholder.supabase.co';
const supabaseServiceKey = rawKey || 'placeholder-service-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);


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

    if (!token) {
      const url = new URL(req.url);
      token = url.searchParams.get('token') || '';
    }

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

    const userEmail = (user.email || profile?.email || '').toLowerCase().trim();
    const isSuperAdmin = profile?.role === 'super_admin' || 
      userEmail === 'dsoni1281@gmail.com' || 
      userEmail === 'admin@cleverops.in' || 
      userEmail === 'founder@cleverops.in' || 
      userEmail === 'samridhtomar8@gmail.com' ||
      userEmail === 'superadmin@cleverops.in' ||
      userEmail === 'superadmin@test.com';

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

    return { isSuperAdmin: true, user, response: null };
  } catch (err: any) {
    return {
      isSuperAdmin: false,
      user: null,
      response: NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED', message: err?.message }, { status: 403 })
    };
  }
}
