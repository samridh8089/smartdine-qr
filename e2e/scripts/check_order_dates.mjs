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

async function checkOrderDates() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, created_at, status')
    .eq('restaurant_id', 'c1853f65-c10c-4f8a-b379-00a60f404ef9');

  if (error || !orders) {
    console.error('Error fetching orders:', error?.message);
    return;
  }
  console.log(`Total Orders for The foody hub: ${orders.length}`);
  const dateCounts = {};
  orders.forEach(o => {
    const d = new Date(o.created_at).toISOString().split('T')[0];
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });

  console.log('Order counts by date:');
  console.dir(dateCounts);
}

checkOrderDates();
