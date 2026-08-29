import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function verifySuperAdminRequest(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      // Check query param or body fallback for backwards compatibility if headers missing
      return {
        isSuperAdmin: false,
        user: null,
        response: NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED', message: 'Authorization token required' }, { status: 403 })
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

    return { isSuperAdmin: true, user, response: null };
  } catch (err: any) {
    return {
      isSuperAdmin: false,
      user: null,
      response: NextResponse.json({ error: 'SUPER_ADMIN_REQUIRED', message: err?.message }, { status: 403 })
    };
  }
}
