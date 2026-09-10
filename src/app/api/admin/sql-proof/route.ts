import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SEED_SECRET = 'foody_hub_seed_2026';
const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, supabaseKey);

    // Query 1: system_events GROUP BY event_type
    const { data: byType, error: e1 } = await (admin.from('system_events') as any)
      .select('event_type')
      .eq('restaurant_id', RESTAURANT_ID);

    const eventTypeCounts: Record<string, number> = {};
    if (byType) {
      byType.forEach((r: { event_type: string }) => {
        eventTypeCounts[r.event_type] = (eventTypeCounts[r.event_type] || 0) + 1;
      });
    }

    // Query 2: system_events ORDER BY created_at DESC LIMIT 30
    const { data: recentEvents, error: e2 } = await (admin.from('system_events') as any)
      .select('event_type, order_id, source_node, target_node, created_at')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('created_at', { ascending: false })
      .limit(30);

    // Query 3: audit_logs ORDER BY created_at DESC LIMIT 20
    const { data: auditRows, error: e3 } = await (admin.from('audit_logs') as any)
      .select('action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // Query 4: system_events for specific order (if orderId provided)
    let orderEvents = null;
    if (body.orderId) {
      const { data: oe } = await (admin.from('system_events') as any)
        .select('event_type, source_node, target_node, actor_type, created_at')
        .eq('order_id', body.orderId)
        .order('created_at', { ascending: true });
      orderEvents = oe;
    }

    return NextResponse.json({
      success: true,
      sql_proof_1_event_type_counts: Object.entries(eventTypeCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([event_type, count]) => ({ event_type, count })),
      sql_proof_1_total: byType?.length || 0,
      sql_proof_2_recent_30: recentEvents || [],
      sql_proof_3_audit_logs: auditRows || [],
      sql_proof_4_order_events: orderEvents,
      errors: { e1: e1?.message, e2: e2?.message, e3: e3?.message },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
