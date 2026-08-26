import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const orderId = 'fb926d11-e539-4d36-8afb-4de2e6e221f2';
  
  // The Kitchen app updates orders.status when marking batch ready
  // Our script only updated order_batches.status → now propagate to orders table
  console.log('[Propagate] Updating orders.status = ready for order:', orderId);
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'ready' })
    .eq('id', orderId)
    .select();
  
  if (error) {
    console.error('[ERROR]', error.message);
  } else {
    console.log('[SUCCESS] orders.status set to ready at:', new Date().toISOString());
    console.log('[Data]', JSON.stringify(data, null, 2));
  }
}

run().catch(console.error);
