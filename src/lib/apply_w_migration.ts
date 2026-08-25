import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying Migration 20260806000003_waiter_module_atomic_fixes.sql...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE UNIQUE INDEX IF NOT EXISTS unq_pending_customer_requests 
        ON public.customer_requests (restaurant_id, table_id, type) 
        WHERE status IN ('pending', 'accepted');

        ALTER TABLE public.customer_requests 
        ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
        ADD COLUMN IF NOT EXISTS accepted_by text,
        ADD COLUMN IF NOT EXISTS completed_at timestamptz;

        CREATE OR REPLACE FUNCTION public.serve_order_atomic(
            p_order_id uuid,
            p_served_by text
        )
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            v_now timestamptz := now();
            v_order record;
        BEGIN
            SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Order not found';
            END IF;

            UPDATE public.orders
            SET status = 'served',
                updated_at = v_now
            WHERE id = p_order_id;

            UPDATE public.order_batches
            SET status = 'served',
                served_at = v_now,
                served_by = p_served_by,
                updated_at = v_now
            WHERE order_id = p_order_id
              AND status != 'cancelled'
              AND (special_instructions IS NULL OR special_instructions NOT LIKE '%[CANCELLED]%');

            RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
        END;
        $$;
      `
    });

    if (error) {
      console.log('RPC exec_sql result error:', error.message);
    } else {
      console.log('Migration applied successfully via RPC!');
    }
  } catch (e: any) {
    console.log('RPC exec_sql exception:', e.message);
  }
}

applyMigration();
