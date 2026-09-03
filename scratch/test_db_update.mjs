import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testUpdate() {
  const { data: oBefore } = await supabase.from('orders').select('*').eq('id', 'cb8b4371-6fb5-42ac-847e-445132385c27').single();
  console.log('Order before:', {
    subtotal: oBefore.subtotal,
    gst: oBefore.gst,
    cgst_amount: oBefore.cgst_amount,
    sgst_amount: oBefore.sgst_amount,
    total: oBefore.total
  });

  const newGst = oBefore.gst;
  const newCgst = parseFloat((newGst / 2).toFixed(2));
  const newSgst = parseFloat((newGst - newCgst).toFixed(2));

  const { data: oAfter, error } = await supabase.from('orders').update({
    cgst_amount: newCgst,
    sgst_amount: newSgst
  }).eq('id', oBefore.id).select().single();

  console.log('Order after update:', {
    cgst_amount: oAfter?.cgst_amount,
    sgst_amount: oAfter?.sgst_amount,
    error
  });
}

testUpdate().catch(console.error);
