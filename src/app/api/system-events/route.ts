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
 * POST /api/system-events
 * Public endpoint for client-side event ingestion (customer events: QR scan, menu open, etc.)
 * Rate-limited by existing middleware (60 req/min per IP).
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
    await (supabaseAdmin.from('system_events') as any).insert({
      restaurant_id,
      correlation_id,
      order_id: order_id || null,
      table_uuid: table_uuid || null,
      actor_type,
      event_type,
      metadata: metadata || {},
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[system-events] POST error:', message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
