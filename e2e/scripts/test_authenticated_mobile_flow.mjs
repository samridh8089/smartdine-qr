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

const supabaseAnon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testAuthMobileFlow() {
  console.log('--- TEST 1: LOGIN WITH Password123! ---');
  const { data: authData, error: authErr } = await supabaseAnon.auth.signInWithPassword({
    email: 'you@gmail.com',
    password: 'Password123!'
  });

  if (authErr) {
    console.error('❌ Sign In Failed:', authErr.message);
    return;
  }

  console.log('✅ Sign In Succeeded! User ID:', authData.user.id);

  console.log('--- TEST 2: FETCH PROFILE FOR SIGNED IN USER ---');
  const { data: profile, error: profErr } = await supabaseAnon
    .from('profiles')
    .select('*, restaurants(name)')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profErr) {
    console.error('❌ Profile Query Error:', profErr.message);
  } else if (!profile) {
    console.error('❌ Profile is NULL!');
  } else {
    console.log('✅ Profile Fetched Successfully!');
    console.log(`Role: ${profile.role}`);
    console.log(`Restaurant ID: ${profile.restaurant_id}`);
    console.log(`Restaurant Name: ${profile.restaurants?.name}`);
  }
}

testAuthMobileFlow();
