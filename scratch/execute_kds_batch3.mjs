import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const batchId = '8b9c247d-fa75-4e61-9e5f-401cd0e7e80c';  // Batch 3
  const orderId = 'fb926d11-e539-4d36-8afb-4de2e6e221f2';

  // 1. Move to accepted
  console.log('[KDS] Moving Batch 3 to ACCEPTED...');
  const tAccepted = new Date().toISOString();
  const r1 = await supabase
    .from('order_batches')
    .update({ status: 'accepted', accepted_at: tAccepted, accepted_by: 'Kitchen Staff' })
    .eq('id', batchId);
  if (r1.error) console.error('ACCEPTED error:', r1.error.message);
  else console.log('[KDS] ACCEPTED AT:', tAccepted);

  await new Promise(r => setTimeout(r, 3000));

  // 2. Move to preparing
  console.log('[KDS] Moving Batch 3 to PREPARING...');
  const tPreparing = new Date().toISOString();
  const r2 = await supabase
    .from('order_batches')
    .update({ status: 'preparing', preparing_at: tPreparing, preparing_by: 'Kitchen Staff' })
    .eq('id', batchId);
  if (r2.error) console.error('PREPARING error:', r2.error.message);
  else console.log('[KDS] PREPARING AT:', tPreparing);

  await new Promise(r => setTimeout(r, 3000));

  // 3. Move to ready
  console.log('[KDS] Moving Batch 3 to READY...');
  const tReady = new Date().toISOString();
  const r3 = await supabase
    .from('order_batches')
    .update({ status: 'ready', ready_at: tReady, ready_by: 'Kitchen Staff' })
    .eq('id', batchId);
  if (r3.error) console.error('READY error:', r3.error.message);
  else console.log('[KDS] READY AT:', tReady);

  console.log('[KDS] Batch 3 flow complete. Order is READY for Waiter.');
}

run().catch(console.error);
