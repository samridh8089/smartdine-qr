import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _adminClient: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_adminClient) _adminClient = createClient(url, key);
  return _adminClient;
}

/**
 * GET /api/system-events?restaurantId=...&limit=200
 * Securely returns real events from system_events using service role,
 * bypassing RLS restrictions for client dashboard display.
 */
export async function GET(req: Request) {
  try {
    const supabaseAdmin = getAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabaseAdmin.from('system_events') as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (restaurantId && restaurantId !== 'all') {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/system-events
 * Public endpoint for client-side event ingestion (customer events: QR scan, menu open, cart, etc.)
 * Rate-limited by existing middleware.
 */
export async function POST(req: Request) {
  try {
    const supabaseAdmin = getAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const body = await req.json();
    const {
      restaurant_id,
      correlation_id,
      order_id,
      table_uuid,
      event_type,
      actor_type = 'customer',
      source_node,
      target_node,
      duration_ms,
      metadata = {},
    } = body;

    if (!restaurant_id || typeof restaurant_id !== 'string') {
      return NextResponse.json({ error: 'restaurant_id required' }, { status: 400 });
    }
    if (!event_type || typeof event_type !== 'string') {
      return NextResponse.json({ error: 'event_type required' }, { status: 400 });
    }
    if (!correlation_id || typeof correlation_id !== 'string') {
      return NextResponse.json({ error: 'correlation_id required' }, { status: 400 });
    }

    // Validate restaurant exists
    const { data: rest } = await supabaseAdmin
      .from('restaurants')
      .select('id')
      .eq('id', restaurant_id)
      .maybeSingle();

    if (!rest) {
      return NextResponse.json({ error: 'Invalid restaurant_id' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (supabaseAdmin.from('system_events') as any).insert({
      restaurant_id,
      correlation_id,
      order_id: order_id || null,
      table_uuid: table_uuid || null,
      actor_type,
      event_type,
      source_node: source_node || null,
      target_node: target_node || null,
      duration_ms: duration_ms || null,
      metadata: metadata || {},
    });

    if (insertErr) {
      console.error('[system-events] Insert error:', insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[system-events] POST error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

