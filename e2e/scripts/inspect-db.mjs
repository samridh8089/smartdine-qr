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
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnv('.env.test');
loadEnv('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCustomers() {
  const { data: cust, error: cErr } = await supabase.from('customers').select('*').limit(3);
  console.log('CUSTOMERS TABLE:', cust ? (cust[0] ? Object.keys(cust[0]) : 'empty table') : null, 'ERROR:', cErr);

  const { data: ord, error: oErr } = await supabase.from('orders').select('*').limit(2);
  console.log('ORDERS SAMPLE COLUMNS:', ord ? Object.keys(ord[0] || {}) : [], 'ERROR:', oErr);
}

checkCustomers();

