-- TABLE MERGE SESSION MEMBERS MIGRATION

CREATE TABLE IF NOT EXISTS public.table_merge_session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.table_merge_sessions(id) ON DELETE CASCADE,
  merge_group_id UUID NOT NULL REFERENCES public.table_merge_groups(id) ON DELETE CASCADE,
  table_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_members_session_id ON public.table_merge_session_members(session_id);
CREATE INDEX IF NOT EXISTS idx_session_members_group_id ON public.table_merge_session_members(merge_group_id);

ALTER TABLE public.table_merge_session_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read/write table_merge_session_members" ON public.table_merge_session_members;
CREATE POLICY "Allow anon read/write table_merge_session_members" ON public.table_merge_session_members FOR ALL USING (true) WITH CHECK (true);
