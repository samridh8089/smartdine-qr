import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const batchId = '8df5a6f6-ff8b-4295-a1ac-0571c5a5c479';
  const orderId = 'fb926d11-e539-4d36-8afb-4de2e6e221f2';

  // 1. Move to accepted
  console.log('[KDS Workflow] Moving batch to ACCEPTED...');
  const tAccepted = new Date().toISOString();
  await supabase
    .from('order_batches')
    .update({ status: 'accepted', accepted_at: tAccepted, accepted_by: 'Kitchen Staff' })
    .eq('id', batchId);
  console.log('[KDS Workflow] ACCEPTED AT:', tAccepted);

  await new Promise(r => setTimeout(r, 2000));

  // 2. Move to preparing
  console.log('[KDS Workflow] Moving batch to PREPARING...');
  const tPreparing = new Date().toISOString();
  await supabase
    .from('order_batches')
    .update({ status: 'preparing', preparing_at: tPreparing, preparing_by: 'Kitchen Staff' })
    .eq('id', batchId);
  console.log('[KDS Workflow] PREPARING AT:', tPreparing);

  await new Promise(r => setTimeout(r, 2000));

  // 3. Move to ready
  console.log('[KDS Workflow] Moving batch to READY...');
  const tReady = new Date().toISOString();
  await supabase
    .from('order_batches')
    .update({ status: 'ready', ready_at: tReady, ready_by: 'Kitchen Staff' })
    .eq('id', batchId);
  console.log('[KDS Workflow] READY AT:', tReady);

  // Update order status to ready as well
  await supabase
    .from('orders')
    .update({ status: 'ready' })
    .eq('id', orderId);
}

run();
