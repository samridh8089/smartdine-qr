import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
async function run() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) console.error(error);
  else {
    console.log('Order columns count:', Object.keys(data[0] || {}).length);
    console.log('Order columns:', Object.keys(data[0] || {}).sort());
  }

  const { data: bData } = await supabase.from('order_batches').select('*').limit(1);
  if (bData && bData[0]) {
    console.log('Order Batch columns:', Object.keys(bData[0]).sort());
  }

  const { data: tData } = await supabase.from('tables').select('*').limit(1);
  if (tData && tData[0]) {
    console.log('Table columns:', Object.keys(tData[0]).sort());
  }
}
run();
