import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');

const hasServiceRoleKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=');
const hasUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
const hasAnonKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');

console.log('Environment Variables Check in .env.local:');
console.log(' - SUPABASE_SERVICE_ROLE_KEY present:', hasServiceRoleKey);
console.log(' - NEXT_PUBLIC_SUPABASE_URL present:', hasUrl);
console.log(' - NEXT_PUBLIC_SUPABASE_ANON_KEY present:', hasAnonKey);

let serviceRoleKey = '';
let supabaseUrl = '';

envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
});

console.log('\nService Role Key Length:', serviceRoleKey.length);
console.log('Supabase URL:', supabaseUrl);

async function testConnection() {
  if (!serviceRoleKey || serviceRoleKey === '[SENSITIVE]') {
    console.log('Service role key is empty or masked as [SENSITIVE]');
    return;
  }
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.from('tables').select('id, name').limit(2);
    if (error) {
      console.log('Connection test result: ERROR -', error.message);
    } else {
      console.log('Connection test result: SUCCESS! Fetched tables count:', data?.length);
    }
  } catch (err) {
    console.log('Connection test exception:', err.message);
  }
}

testConnection();
