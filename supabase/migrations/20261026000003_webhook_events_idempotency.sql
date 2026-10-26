-- ==============================================================================
-- Migration: 20261026000003_webhook_events_idempotency.sql
-- Purpose: Store processed webhook events for strict idempotency protection
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'razorpay',
  event_type TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_processed_webhook_event UNIQUE (source, event_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_lookup 
ON public.processed_webhook_events (source, event_id);

ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Restrict to service_role only (webhooks run with service_role key)
DROP POLICY IF EXISTS "service_role_processed_webhook_events" ON public.processed_webhook_events;
CREATE POLICY "service_role_processed_webhook_events" 
ON public.processed_webhook_events 
FOR ALL TO service_role 
USING (true) 
WITH CHECK (true);
