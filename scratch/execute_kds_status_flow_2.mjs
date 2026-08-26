import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const batchId = 'f8098b83-2e0d-4e86-b0e2-1e0d1770afeb';
  const orderId = 'fb926d11-e539-4d36-8afb-4de2e6e221f2';

  // 1. Move to accepted
  console.log('[KDS Workflow 2] Moving Batch 2 to ACCEPTED...');
  await supabase
    .from('order_batches')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: 'Kitchen Staff' })
    .eq('id', batchId);

  await new Promise(r => setTimeout(r, 2000));

  // 2. Move to preparing
  console.log('[KDS Workflow 2] Moving Batch 2 to PREPARING...');
  await supabase
    .from('order_batches')
    .update({ status: 'preparing', preparing_at: new Date().toISOString(), preparing_by: 'Kitchen Staff' })
    .eq('id', batchId);

  await new Promise(r => setTimeout(r, 2000));

  // 3. Move to ready
  console.log('[KDS Workflow 2] Moving Batch 2 to READY...');
  await supabase
    .from('order_batches')
    .update({ status: 'ready', ready_at: new Date().toISOString(), ready_by: 'Kitchen Staff' })
    .eq('id', batchId);
}

run();
