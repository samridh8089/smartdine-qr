import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminRequest } from '@/lib/superAdminGuard';
import { handleApiError } from '@/lib/errors';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const authCheck = await verifySuperAdminRequest(req);
    if (!authCheck.isSuperAdmin && authCheck.response) {
      return authCheck.response;
    }

    const url = new URL(req.url);
    const search = url.searchParams.get('search') || '';
    const limit = Number(url.searchParams.get('limit') || 50);

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, restaurant_id, user_email, action, details, created_at, restaurants(name, slug)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search.trim()) {
      query = query.or(`action.ilike.%${search}%,details.ilike.%${search}%,user_email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      logs: data || []
    });
  } catch (err: any) {
    return handleApiError('Admin-AuditLogs', err, 'Failed to fetch audit logs', 500);
  }
}
