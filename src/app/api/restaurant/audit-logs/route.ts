import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { handleApiError } from '@/lib/errors';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get('restaurantId');
    const search = url.searchParams.get('search') || '';
    const limit = Number(url.searchParams.get('limit') || 50);

    if (!restaurantId) {
      return NextResponse.json({ success: false, error: 'restaurantId is required' }, { status: 400 });
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select('id, restaurant_id, user_email, action, details, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (search.trim()) {
      query = query.or(`action.ilike.%${search}%,details.ilike.%${search}%,user_email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Parse details JSON if needed
    const parsedLogs = (data || []).map(log => {
      let parsedDetails = log.details;
      if (typeof log.details === 'string') {
        try {
          parsedDetails = JSON.parse(log.details);
        } catch {
          parsedDetails = { message: log.details };
        }
      }
      return {
        ...log,
        parsedDetails
      };
    });

    return NextResponse.json({
      success: true,
      logs: parsedLogs
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
