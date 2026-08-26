const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseAnonKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnonUpdate() {
  console.log('Testing update on order_batches via anon client...');
  
  // 1. Get latest batch
  const { data: batches, error: bErr } = await supabase
    .from('order_batches')
    .select('id, order_id, status')
    .eq('status', 'new')
    .limit(1);

  if (bErr || !batches || batches.length === 0) {
    console.log('No new batches found to test:', bErr);
    return;
  }

  const testBatch = batches[0];
  console.log('Target batch ID:', testBatch.id, 'Current status:', testBatch.status);

  // 2. Try updating batch status to accepted
  const now = new Date().toISOString();
  const { data: uBatch, error: uErr } = await supabase
    .from('order_batches')
    .update({ status: 'accepted', accepted_by: 'Test Staff', accepted_at: now, updated_at: now })
    .eq('id', testBatch.id)
    .select();

  console.log('Update Batch Result:', { data: uBatch, error: uErr });

  // 3. Try updating order status
  if (testBatch.order_id) {
    const { data: uOrder, error: oErr } = await supabase
      .from('orders')
      .update({ status: 'accepted', updated_at: now })
      .eq('id', testBatch.order_id)
      .select();

    console.log('Update Order Result:', { data: uOrder, error: oErr });
  }
}

testAnonUpdate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
