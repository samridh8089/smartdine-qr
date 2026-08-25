import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying Migration 20260820000000_staff_roles_table_assignments.sql...');
  const sql = `
    -- 1. Update profiles check constraint to include 'supervisor'
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
      CHECK (role IN ('owner', 'manager', 'supervisor', 'waiter', 'kitchen', 'cashier', 'super_admin'));

    -- 2. Add department, phone, is_active, and last_login_at columns to profiles
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

    -- 3. Create table_assignments table
    CREATE TABLE IF NOT EXISTS public.table_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
      table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
      waiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT unq_active_table_assignment UNIQUE (restaurant_id, table_id, waiter_id)
    );

    CREATE INDEX IF NOT EXISTS idx_table_assignments_waiter ON public.table_assignments(waiter_id, active);
    CREATE INDEX IF NOT EXISTS idx_table_assignments_table ON public.table_assignments(table_id, active);
    CREATE INDEX IF NOT EXISTS idx_table_assignments_rest ON public.table_assignments(restaurant_id, active);

    -- 4. Enable RLS on table_assignments
    ALTER TABLE public.table_assignments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow restaurant staff to read table_assignments" ON public.table_assignments;
    CREATE POLICY "Allow restaurant staff to read table_assignments"
      ON public.table_assignments FOR SELECT
      USING (
        restaurant_id = public.get_user_restaurant_id(auth.uid())
      );

    DROP POLICY IF EXISTS "Allow owner and manager to manage table_assignments" ON public.table_assignments;
    CREATE POLICY "Allow owner and manager to manage table_assignments"
      ON public.table_assignments FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() 
            AND profiles.restaurant_id = table_assignments.restaurant_id
            AND (profiles.role IN ('owner', 'manager') OR (profiles.role = 'supervisor' AND profiles.department = 'waiter'))
        )
      );

    -- Also allow anon read/write if using anon client in certain queries
    DROP POLICY IF EXISTS "Allow anon manage table_assignments" ON public.table_assignments;
    CREATE POLICY "Allow anon manage table_assignments"
      ON public.table_assignments FOR ALL
      USING (true)
      WITH CHECK (true);
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      console.log('RPC exec_sql error:', error.message);
    } else {
      console.log('Migration applied successfully via RPC! Result:', data);
    }
  } catch (e: any) {
    console.log('RPC exec_sql exception:', e.message);
  }
}

applyMigration();
