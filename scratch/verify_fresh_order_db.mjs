import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let serviceRoleKey = '';

envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
const orderId = 'dd61bc33-dce5-4d00-adeb-ce7849463bd4';

async function main() {
  const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
  const { data: batches } = await supabase.from('order_batches').select('*').eq('order_id', orderId);
  const { data: items } = await supabase.from('order_items').select('*').eq('order_id', orderId);

  console.log('=== VERIFICATION OF FRESH TABLE 2 ORDER IN DATABASE ===');
  console.log('Order Details:', {
    id: order?.id,
    table_name: order?.table_name,
    status: order?.status,
    subtotal: order?.subtotal,
    gst: order?.gst,
    cgst: order?.cgst_amount,
    sgst: order?.sgst_amount,
    total: order?.total,
    special_instructions: order?.special_instructions
  });
  console.log('\nBatches Count:', batches?.length);
  batches?.forEach(b => console.log(` - Batch #${b.batch_number} (ID: ${b.id}, Status: ${b.status})`));

  console.log('\nItems Count:', items?.length);
  items?.forEach(it => console.log(` - ${it.menu_item_name} x ${it.quantity} @ ₹${it.price} (Notes: ${it.notes})`));
}

main().catch(console.error);
