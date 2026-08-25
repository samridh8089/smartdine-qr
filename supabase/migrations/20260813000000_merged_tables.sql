-- MERGED TABLES SYSTEM MIGRATION

-- 1. Create table_merge_groups
CREATE TABLE IF NOT EXISTS public.table_merge_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  group_number INT DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_merge_groups_rest_status ON public.table_merge_groups(restaurant_id, status);

-- 2. Create table_merge_members
CREATE TABLE IF NOT EXISTS public.table_merge_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL,
  merge_group_id UUID NOT NULL REFERENCES public.table_merge_groups(id) ON DELETE CASCADE,
  table_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_merge_members_rest_table ON public.table_merge_members(restaurant_id, table_id);
CREATE INDEX IF NOT EXISTS idx_table_merge_members_group ON public.table_merge_members(merge_group_id);

-- 3. Add merge_group_id to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS merge_group_id UUID REFERENCES public.table_merge_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_merge_group_id ON public.orders(merge_group_id);

-- 4. Enable RLS and add basic policies
ALTER TABLE public.table_merge_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_merge_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read/write table_merge_groups" ON public.table_merge_groups;
CREATE POLICY "Allow anon read/write table_merge_groups" ON public.table_merge_groups FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon read/write table_merge_members" ON public.table_merge_members;
CREATE POLICY "Allow anon read/write table_merge_members" ON public.table_merge_members FOR ALL USING (true) WITH CHECK (true);
