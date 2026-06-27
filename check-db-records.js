const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve('.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const userId = '58ee6928-4ca6-43f7-a564-6d77124b7469';
  console.log('Querying profile...');
  const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', userId);
  console.log('Profile result:', profile, profErr);

  if (profile && profile.length > 0 && profile[0].restaurant_id) {
    console.log('Querying restaurant...');
    const { data: rest, error: restErr } = await supabase.from('restaurants').select('*').eq('id', profile[0].restaurant_id);
    console.log('Restaurant result:', rest, restErr);
  }
  process.exit(0);
}

check();
