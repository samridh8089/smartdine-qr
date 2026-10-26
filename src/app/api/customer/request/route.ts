import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { dispatchFCMNotification } from '@/lib/pushDispatcher';

// Sliding-window in-memory rate limiter: max 10 requests per 60 seconds per IP/table
const customerRequestRateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, maxLimit: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const entry = customerRequestRateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    customerRequestRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  entry.count += 1;
  return entry.count <= maxLimit;
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const body = await req.json();
    const { restaurantId, tableId, type } = body;

    if (!restaurantId || !tableId) {
      return NextResponse.json({ error: 'Missing restaurantId or tableId' }, { status: 400 });
    }

    if (type !== 'call_waiter' && type !== 'request_bill') {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    // Rate limit: max 10 waiter requests per minute per IP
    const rateLimitKey = `${ip}:${tableId}`;
    const allowed = checkRateLimit(rateLimitKey, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before calling waiter again.' },
        { status: 429 }
      );
    }

    const admin = getAdminClient();

    // Verify table exists in this restaurant
    const { data: table, error: tableErr } = await admin
      .from('tables')
      .select('id, name')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    if (tableErr || !table) {
      return NextResponse.json({ error: 'Table not found for this restaurant' }, { status: 404 });
    }

    // Check for existing pending or accepted request
    const { data: existingReqs } = await admin
      .from('customer_requests')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('table_id', tableId)
      .eq('type', type)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingReqs && existingReqs.length > 0) {
      const existing = existingReqs[0];
      const reqTitle = type === 'call_waiter' ? 'WAITER CALL ALERT!' : 'BILL REQUEST ALERT!';
      try {
        await dispatchFCMNotification(
          restaurantId,
          reqTitle,
          `Table ${table.name} requested ${type === 'call_waiter' ? 'Waiter Assistance' : 'The Bill'}`,
          ['waiter', 'kitchen', 'owner', 'manager'],
          { requestId: existing.id, tableId, type, notificationType: 'CUSTOMER_CALL' },
          tableId
        );
      } catch (e) {
        console.warn('[api/customer/request] Repeat push warning:', e);
      }
      return NextResponse.json({ success: true, request: existing, repeated: true });
    }

    // Insert new request
    const { data: inserted, error: insertErr } = await admin
      .from('customer_requests')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_name: table.name,
        type,
        status: 'pending'
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message || 'Failed to create request' }, { status: 500 });
    }

    // Dispatch FCM push alert
    const reqTitle = type === 'call_waiter' ? 'WAITER CALL ALERT!' : 'BILL REQUEST ALERT!';
    try {
      await dispatchFCMNotification(
        restaurantId,
        reqTitle,
        `Table ${table.name} requested ${type === 'call_waiter' ? 'Waiter Assistance' : 'The Bill'}`,
        ['waiter', 'kitchen', 'owner', 'manager'],
        { requestId: inserted.id, tableId, type, notificationType: 'CUSTOMER_CALL' },
        tableId
      );
    } catch (e) {
      console.warn('[api/customer/request] Push notification error:', e);
    }

    return NextResponse.json({ success: true, request: inserted });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const tableId = searchParams.get('tableId');
    const requestId = searchParams.get('requestId');

    const admin = getAdminClient();

    if (requestId) {
      const { data, error } = await admin
        .from('customer_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error || !data) {
        return NextResponse.json({ success: true, request: null });
      }
      return NextResponse.json({ success: true, request: data });
    }

    if (!restaurantId || !tableId) {
      return NextResponse.json({ error: 'Missing restaurantId or tableId' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('customer_requests')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('table_id', tableId)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: true, request: null });
    }

    return NextResponse.json({ success: true, request: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
