import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/errors';
import { formatAuditLogDisplay } from '@/lib/auditLogger';
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurantId');
    const search = url.searchParams.get('search') || '';
    const action = url.searchParams.get('action') || 'all';
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.max(1, Number(url.searchParams.get('limit') || 10));
    const offset = (page - 1) * limit;

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurantId is required' }, { status: 400 });
    }

    // 1. Mandatory Authorization & Multi-tenant IDOR protection (Finding C6)
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'supervisor', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, restaurant_id, user_email, action, details, created_at', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Sanitize search query against PostgREST filter injection (Finding C6)
    const cleanSearch = search.replace(/[^a-zA-Z0-9\s\-_@.]/g, '').trim();
    if (cleanSearch) {
      query = query.or(`action.ilike.%${cleanSearch}%,details.ilike.%${cleanSearch}%,user_email.ilike.%${cleanSearch}%`);
    }

    if (action && action !== 'all') {
      if (action === 'table') {
        query = query.or('action.ilike.%table%,details.ilike.%table%');
      } else if (action === 'reservation') {
        query = query.or('action.ilike.%reservation%,details.ilike.%reservation%');
      } else if (action === 'order') {
        query = query.or('action.ilike.%order%,details.ilike.%order%');
      } else if (action === 'payment') {
        query = query.or('action.ilike.%payment%,action.ilike.%void%,action.ilike.%refund%,details.ilike.%payment%');
      } else {
        const cleanAction = action.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
        if (cleanAction) {
          query = query.or(`action.ilike.%${cleanAction}%,details.ilike.%${cleanAction}%`);
        }
      }
    }

    const { data, count, error } = await query;
    if (error) throw error;

    // Parse details JSON if needed
    const parsedLogs = (data || []).map((log: any) => {
      let parsedDetails: any = log.details;
      if (typeof log.details === 'string') {
        try {
          parsedDetails = JSON.parse(log.details);
        } catch {
          parsedDetails = { message: log.details };
        }
      }

      const orderIdMatch = typeof log.details === 'string' ? log.details.match(/Order #([a-f0-9\-]+)/i) : null;
      const detectedOrderId = parsedDetails?.entityId || parsedDetails?.orderId || orderIdMatch?.[1] || null;
      const isRes = log.action?.includes('reservation') || String(log.details).toLowerCase().includes('reservation');
      const isTbl = !isRes && (log.action?.includes('table') || String(log.details).toLowerCase().includes('table'));
      const isOrd = Boolean(detectedOrderId) || log.action?.includes('order') || log.action?.includes('payment');

      const detectedEntityType = parsedDetails?.entity || (isRes ? 'reservation' : (isOrd ? 'order' : (isTbl ? 'table' : null)));

      return {
        ...log,
        user_role: parsedDetails?.role || null,
        entity_type: detectedEntityType,
        entity_id: detectedOrderId,
        details: formatAuditLogDisplay(log).detailsDisplay,
        parsedDetails
      };
    });

    return NextResponse.json({
      success: true,
      logs: parsedLogs,
      auditLogs: parsedLogs,
      total: count || 0
    });
  } catch (err: any) {
    return handleApiError('Restaurant-AuditLogs-GET', err, 'Failed to fetch restaurant audit logs', 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { restaurantId, userEmail, userName, role, action, entity, entityId, previousValue, newValue, details, timestamp } = body;

    if (!restaurantId || !action) {
      return NextResponse.json({ success: false, error: 'restaurantId and action are required' }, { status: 400 });
    }

    // Mandatory Authorization & Multi-tenant isolation (Finding C6)
    const authCheck = await verifyStaffRequest(
      req,
      ['owner', 'manager', 'supervisor', 'super_admin'],
      restaurantId
    );
    if (!authCheck.isAuthorized) {
      return authCheck.response || NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    const fullDetails = JSON.stringify({
      userName: userName || userEmail || 'Staff',
      role: role || 'Staff',
      entity: entity || 'general',
      entityId: entityId || '',
      previousValue: previousValue ?? null,
      newValue: newValue ?? null,
      ...(typeof details === 'object' ? details : { message: details || '' })
    });

    const { data, error } = await supabaseAdmin.from('audit_logs').insert({
      restaurant_id: restaurantId,
      user_email: userEmail || userName || 'system',
      action,
      details: fullDetails,
      created_at: timestamp || new Date().toISOString()
    }).select().single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      log: data
    });
  } catch (err: any) {
    return handleApiError('Restaurant-AuditLogs-POST', err, 'Failed to record audit log', 500);
  }
}
