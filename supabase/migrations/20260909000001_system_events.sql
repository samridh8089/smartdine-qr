-- =============================================================================
-- Migration: 20260909000001_system_events.sql
-- Phase-19: Founder Control Center — Event Bus (system_events)
-- Additive only. Never modifies existing tables.
-- =============================================================================

-- 1. Create the system_events table (Event Bus for CleverOps debugging)
CREATE TABLE IF NOT EXISTS public.system_events (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   UUID        REFERENCES public.restaurants(id) ON DELETE CASCADE,
  correlation_id  TEXT        NOT NULL,   -- Follows one order end-to-end (e.g. corr_9FKL3A72)
  order_id        UUID,                   -- nullable (some events not tied to an order)
  table_uuid      UUID,                   -- nullable
  actor_type      TEXT,                   -- 'customer' | 'staff' | 'system' | 'kitchen' | 'waiter'
  actor_id        UUID,                   -- profile id of the actor (nullable for anonymous customers)
  event_type      TEXT        NOT NULL,   -- e.g. 'order_created', 'qr_scanned', 'payment_success'
  source_node     TEXT,                   -- source node in the execution graph
  target_node     TEXT,                   -- target node in the execution graph
  duration_ms     INTEGER,               -- latency of this transition (optional)
  metadata        JSONB       DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_events_restaurant_created
  ON public.system_events (restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_order_id
  ON public.system_events (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_system_events_correlation_id
  ON public.system_events (correlation_id);

CREATE INDEX IF NOT EXISTS idx_system_events_event_type
  ON public.system_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_events_created_at
  ON public.system_events (created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Super admin reads everything
DROP POLICY IF EXISTS "super_admin_all_system_events" ON public.system_events;
CREATE POLICY "super_admin_all_system_events"
  ON public.system_events FOR ALL
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- Restaurant staff (owner/manager) read their own restaurant's events
DROP POLICY IF EXISTS "staff_read_own_system_events" ON public.system_events;
CREATE POLICY "staff_read_own_system_events"
  ON public.system_events FOR SELECT
  USING (
    restaurant_id = (
      SELECT p.restaurant_id FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  );

-- Service role (API routes) can insert events
DROP POLICY IF EXISTS "service_insert_system_events" ON public.system_events;
CREATE POLICY "service_insert_system_events"
  ON public.system_events FOR INSERT
  WITH CHECK (true);

-- 5. Enable Supabase Realtime on system_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'system_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.system_events;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
