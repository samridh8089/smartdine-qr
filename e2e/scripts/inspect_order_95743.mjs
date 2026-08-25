import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv(file) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    }
  }
}

loadEnv('.env.test');
loadEnv('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectOrder() {
  console.log('--- SEARCHING FOR ORDERS ENDING IN 95743 OR MATCHING RECEIPT ---');

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, order_items(*), order_batches(*)');

  if (error) {
    console.error('Error fetching orders:', error);
    return;
  }

  const matching = (orders || []).filter(o => 
    o.id.toLowerCase().includes('95743') || 
    (o.receipt_number && o.receipt_number.toLowerCase().includes('95743')) ||
    o.total === 388.5 ||
    o.subtotal === 388.5
  );

  console.log(`Found ${matching.length} matching orders for 95743 or ₹388.50:`);
  console.log(JSON.stringify(matching, null, 2));

  // Also print all recent orders for context
  console.log('\n--- ALL RECENT ORDERS (LAST 10) ---');
  const recent = (orders || [])
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map(o => ({
      id: o.id,
      receipt: o.receipt_number,
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      total: o.total,
      subtotal: o.subtotal,
      discount_amount: o.discount_amount,
      created_at: o.created_at,
      batch_count: o.order_batches?.length || 0,
      cancelled_batches: o.order_batches?.filter(b => b.status === 'cancelled' || b.special_instructions?.includes('[CANCELLED]')).length || 0,
      item_count: o.order_items?.length || 0,
      cancelled_items: o.order_items?.filter(i => i.is_cancelled || i.status === 'cancelled').length || 0
    }));

  console.log(JSON.stringify(recent, null, 2));
}

inspectOrder();
