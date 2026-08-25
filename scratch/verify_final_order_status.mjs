import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const orderId = 'fb926d11-e539-4d36-8afb-4de2e6e221f2';
  
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, table_name, updated_at, order_batches(id, batch_number, status, ready_at, served_at)')
    .eq('id', orderId)
    .single();
  
  if (error) {
    console.error('[ERROR]', error.message);
  } else {
    console.log('[Order Status]');
    console.log('  Order ID:', data.id);
    console.log('  Table:', data.table_name);
    console.log('  Status:', data.status.toUpperCase());
    console.log('  Updated at:', data.updated_at);
    console.log('  Batches:');
    data.order_batches.forEach(b => {
      console.log(`    Batch ${b.batch_number}: status=${b.status.toUpperCase()} ready_at=${b.ready_at} served_at=${b.served_at}`);
    });
  }
}

run().catch(console.error);
