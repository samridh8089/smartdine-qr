import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Read .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';
let supabaseServiceRoleKey = '';

envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = t.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseServiceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

console.log('=== STEP 1: LOCAL ENV VERIFICATION ===');
console.log('1. Presence Check:');
console.log(' - NEXT_PUBLIC_SUPABASE_URL present:', Boolean(supabaseUrl), `(length: ${supabaseUrl.length})`);
console.log(' - NEXT_PUBLIC_SUPABASE_ANON_KEY present:', Boolean(supabaseAnonKey), `(length: ${supabaseAnonKey.length})`);
console.log(' - SUPABASE_SERVICE_ROLE_KEY present:', Boolean(supabaseServiceRoleKey), `(length: ${supabaseServiceRoleKey.length})`);

console.log('\n2. Prefix Check:');
console.log(' - SUPABASE_SERVICE_ROLE_KEY.startsWith("sb_secret_"):', supabaseServiceRoleKey.startsWith('sb_secret_'));

console.log('\n3. Real Supabase Service-Role Connection Test:');
async function testServiceRole() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: tables, error: tableErr, count: tableCount } = await supabase
      .from('tables')
      .select('id, name, restaurant_id', { count: 'exact' })
      .eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae');

    if (tableErr) {
      console.log(' - Tables Query ERROR:', tableErr.message, tableErr.code);
    } else {
      console.log(` - Tables Query SUCCESS: count = ${tableCount} tables retrieved.`);
      console.log(`   Sample table: "${tables?.[0]?.name}" (ID: ${tables?.[0]?.id})`);
    }

    const { count: staffCount, error: staffErr } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae');

    if (staffErr) {
      console.log(' - Profiles Query ERROR:', staffErr.message);
    } else {
      console.log(` - Profiles Query SUCCESS: count = ${staffCount} staff profiles active.`);
    }

    const { count: menuCount, error: menuErr } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae');

    if (menuErr) {
      console.log(' - Menu Items Query ERROR:', menuErr.message);
    } else {
      console.log(` - Menu Items Query SUCCESS: count = ${menuCount} menu dishes active.`);
    }
  } catch (err) {
    console.error(' - Connection Exception:', err.message);
  }
}

testServiceRole();
