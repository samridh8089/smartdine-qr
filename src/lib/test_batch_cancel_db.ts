import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCancelStatus() {
  const { data: batches } = await supabase.from('order_batches').select('*').limit(1);
  if (!batches || batches.length === 0) {
    console.log('No order batches found to test.');
    return;
  }

  const batchId = batches[0].id;
  console.log('Testing status update to cancelled on batch ID:', batchId);

  const { data, error } = await supabase.from('order_batches').update({ status: 'cancelled' }).eq('id', batchId).select();
  if (error) {
    console.log('Update status=cancelled failed:', error.message);
  } else {
    console.log('Update status=cancelled succeeded!', data);
    // Revert status back
    await supabase.from('order_batches').update({ status: batches[0].status }).eq('id', batchId);
  }
}

testCancelStatus();
