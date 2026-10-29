import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { dispatchFCMNotification } from '@/lib/pushDispatcher';

const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

// Distributed Rate Limiter: max 10 requests per 60 seconds per IP
const ipRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'rl:cust_req:ip',
    })
  : null;

// Distributed Rate Limiter: max 10 requests per 60 seconds per table
const tableRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60 s'),
      prefix: 'rl:cust_req:table',
    })
  : null;

async function checkRateLimit(ip: string, tableId: string, restaurantId: string): Promise<boolean> {
  // Upstash Rate limit: IP check
  if (ipRatelimit) {
    const ipRes = await ipRatelimit.limit(ip);
    if (!ipRes.success) {
      return false;
    }
  }

  // Upstash Rate limit: Table check
  if (tableRatelimit) {
    const tableRes = await tableRatelimit.limit(`table:${restaurantId}:${tableId}`);
    if (!tableRes.success) {
      return false;
    }
  }

  return true;
}

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey === '[SENSITIVE]') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required and missing');
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required and missing');
  }
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

    // Rate limit via Upstash (@upstash/ratelimit) on IP and table
    const allowed = await checkRateLimit(ip, tableId, restaurantId);
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
