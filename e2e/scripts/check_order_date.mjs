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

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrderDate() {
  const { data: order } = await supabase.from('orders').select('*').eq('id', '4f443e47-0eaf-4bc1-b3f2-0ecf745d2e5e').single();
  if (order) {
    console.log('Order ID:', order.id);
    console.log('Created At Raw:', order.created_at);
    const d = new Date(order.created_at);
    console.log('ISO Date:', d.toISOString());
    console.log('Date String (YYYY-MM-DD):', d.toISOString().split('T')[0]);
    console.log('Local Date String:', d.toLocaleDateString('en-IN'));
    console.log('Payment Method:', order.payment_method);
    console.log('Payment Status:', order.payment_status);
    console.log('Total:', order.total);
  } else {
    console.log('Order not found directly by ID, fetching latest order:');
    const { data: latest } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(1);
    console.log(latest[0]);
  }
}

checkOrderDate();
