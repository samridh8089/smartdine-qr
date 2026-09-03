import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');

let supabaseUrl = '';
let supabaseAnonKey = '';
let serviceRoleKey = '';

envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = t.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

console.log('--- 1. ENV VARIABLES VERIFICATION ---');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey.substring(0, 16) + '...');
console.log('SUPABASE_SERVICE_ROLE_KEY is [SENSITIVE]?:', serviceRoleKey === '[SENSITIVE]');
console.log('SUPABASE_SERVICE_ROLE_KEY startsWith("sb_secret_"):', serviceRoleKey.startsWith('sb_secret_'));
console.log('SUPABASE_SERVICE_ROLE_KEY length:', serviceRoleKey.length);

console.log('\n--- 2. SERVICE ROLE PROTECTED TABLE QUERY ---');
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  // 1. Read protected table: profiles (restricted by RLS for public/anon)
  const { data: profiles, error: pErr, count: pCount } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, restaurant_id', { count: 'exact' })
    .eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae');

  console.log('Protected table [profiles] query:');
  console.log(' - Error:', pErr ? pErr.message : 'null (SUCCESS)');
  console.log(' - Count:', pCount);
  console.log(' - Sample profile:', profiles?.[0]);

  // 2. Read protected table: inventory_transactions (strict service_role internal ledger)
  const { data: invTx, error: txErr, count: txCount } = await supabaseAdmin
    .from('inventory_transactions')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae')
    .limit(3);

  console.log('\nProtected table [inventory_transactions] query:');
  console.log(' - Error:', txErr ? txErr.message : 'null (SUCCESS)');
  console.log(' - Total Transactions Count:', txCount);
  console.log(' - Sample Transaction:', invTx?.[0] ? {
    id: invTx[0].id,
    type: invTx[0].transaction_type,
    qty: invTx[0].quantity,
    created_at: invTx[0].created_at
  } : 'None');
}

run().catch(console.error);
