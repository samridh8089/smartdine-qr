import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SEED_SECRET = 'foody_hub_seed_2026';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createClient(supabaseUrl, supabaseKey);
    const results: Record<string, unknown> = {};

    // Extract project ref from URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
    results.project_ref = projectRef;

    // Try Supabase Management API to run SQL
    const migrationSql = `
CREATE TABLE IF NOT EXISTS public.system_events (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        REFERENCES public.restaurants(id) ON DELETE CASCADE,
  correlation_id  TEXT        NOT NULL,
  order_id        UUID,
  table_uuid      UUID,
  actor_type      TEXT,
  actor_id        UUID,
  event_type      TEXT        NOT NULL,
  source_node     TEXT,
  target_node     TEXT,
  duration_ms     INTEGER,
  metadata        JSONB       DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_system_events_restaurant_created ON public.system_events (restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_order_id ON public.system_events (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_system_events_correlation_id ON public.system_events (correlation_id);
CREATE INDEX IF NOT EXISTS idx_system_events_event_type ON public.system_events (event_type, created_at DESC);
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_own_system_events" ON public.system_events;
CREATE POLICY "staff_read_own_system_events" ON public.system_events FOR SELECT
  USING (restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1));
DROP POLICY IF EXISTS "service_insert_system_events" ON public.system_events;
CREATE POLICY "service_insert_system_events" ON public.system_events FOR INSERT WITH CHECK (true);
`;

    let mgmtOk = false;
    let mgmtError = '';

    // Approach 1: Supabase Management API /database/query
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: migrationSql }),
      });
      const txt = await r.text();
      results.mgmt_api_status = r.status;
      results.mgmt_api_body = txt.substring(0, 500);
      mgmtOk = r.ok;
      if (!r.ok) mgmtError = txt;
    } catch (e: unknown) {
      mgmtError = e instanceof Error ? e.message : String(e);
      results.mgmt_api_error = mgmtError;
    }

    // Approach 2: Supabase pg REST endpoint (direct)
    if (!mgmtOk) {
      try {
        const r = await fetch(`${supabaseUrl}/pg/query`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: migrationSql }),
        });
        const txt = await r.text();
        results.pg_rest_status = r.status;
        results.pg_rest_body = txt.substring(0, 500);
        mgmtOk = r.ok;
      } catch (e: unknown) {
        results.pg_rest_error = e instanceof Error ? e.message : String(e);
      }
    }

    // Verify: can admin client access system_events?
    const { data: check, error: checkErr } = await (admin.from('system_events') as any)
      .select('id').limit(1);

    results.table_accessible = checkErr
      ? `NO — ${checkErr.message}`
      : `YES — table exists and is accessible via service_role`;
    results.row_count = check?.length ?? 0;
    results.migration_needed = !!checkErr;

    // If table is still not accessible, return instructions for manual migration
    if (checkErr) {
      results.manual_steps = [
        '1. Go to Supabase Dashboard → SQL Editor',
        '2. Run the migration from: supabase/migrations/20260909000001_system_events.sql',
        '3. Then call this endpoint again to verify',
      ];
    }

    return NextResponse.json({ success: !checkErr, results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
