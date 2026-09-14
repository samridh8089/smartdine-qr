const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let envFile = '.env.local';
const envContent = fs.readFileSync(envFile, 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
  const t = line.trim();
  if (t && !t.startsWith('#')) {
    const eq = t.indexOf('=');
    if (eq > 0) {
      let val = t.slice(eq + 1).trim();
      val = val.replace(/^["']/, '').replace(/["']$/, '').trim();
      env[t.slice(0, eq).trim()] = val;
    }
  }
});

const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const key = (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
console.log('Connecting to URL:', url.substring(0, 30) + '...');
const sb = createClient(url, key);

async function main() {
  const { data: rest, error: restErr } = await sb
    .from('restaurants')
    .select('id, name, slug, email, settings')
    .eq('email', 'dsoni1281@gmail.com')
    .maybeSingle();

  console.log('Restaurant:', { rest: rest ? { id: rest.id, name: rest.name, slug: rest.slug } : null, error: restErr });

  if (!rest) {
    // Try searching by name "The Foody Hub"
    const { data: byName } = await sb
      .from('restaurants')
      .select('id, name, slug, email')
      .ilike('name', '%Foody Hub%');
    console.log('Search by Foody Hub name:', byName);
    return;
  }

  // Get Maharaja table
  const { data: tables, error: tblErr } = await sb
    .from('tables')
    .select('*')
    .eq('restaurant_id', rest.id);

  console.log('Tables for restaurant:', (tables || []).map(t => ({ id: t.id, name: t.name, status: t.status })));

  const maharaja = (tables || []).find(t => t.name && t.name.toLowerCase().includes('maharaja'));
  console.log('Maharaja Table:', maharaja);

  if (maharaja) {
    // Check table states in settings
    const tableStates = rest.settings?.table_states || {};
    console.log('Table state in rest.settings for Maharaja:', tableStates[maharaja.id]);

    // Check active orders for Maharaja
    const { data: orders } = await sb
      .from('orders')
      .select('id, table_id, table_name, status, created_at, payment_status')
      .eq('restaurant_id', rest.id)
      .eq('table_id', maharaja.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Recent orders for Maharaja table:', orders);
  }
}

main().catch(console.error);
