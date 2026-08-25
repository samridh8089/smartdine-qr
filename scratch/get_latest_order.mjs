import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_batches(*)')
    .eq('restaurant_id', 'c1853f65-c10c-4f8a-b379-00a60f404ef9')
    .order('created_at', { ascending: false })
    .limit(1);
    
  console.log('LATEST ORDER:', JSON.stringify(orders, null, 2));
}

run();
