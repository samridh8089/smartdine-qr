-- TABLE MERGE SESSIONS MIGRATION

CREATE TABLE IF NOT EXISTS public.table_merge_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  merge_group_id UUID NOT NULL REFERENCES public.table_merge_groups(id) ON DELETE CASCADE,
  session_number INT DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merge_session_id UUID REFERENCES public.table_merge_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.table_merge_groups ADD COLUMN IF NOT EXISTS active_session_id UUID REFERENCES public.table_merge_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_merge_session_id ON public.orders(merge_session_id);
CREATE INDEX IF NOT EXISTS idx_table_merge_sessions_group_status ON public.table_merge_sessions(merge_group_id, status);

ALTER TABLE public.table_merge_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read/write table_merge_sessions" ON public.table_merge_sessions;
CREATE POLICY "Allow anon read/write table_merge_sessions" ON public.table_merge_sessions FOR ALL USING (true) WITH CHECK (true);
