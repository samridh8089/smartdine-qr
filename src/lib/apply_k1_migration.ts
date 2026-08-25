import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying Migration 20260806000002_add_cancelled_to_order_batches_status.sql...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE public.order_batches 
        DROP CONSTRAINT IF EXISTS order_batches_status_check;

        ALTER TABLE public.order_batches 
        ADD CONSTRAINT order_batches_status_check 
        CHECK (status IN ('new', 'accepted', 'preparing', 'ready', 'served', 'cancelled'));
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
