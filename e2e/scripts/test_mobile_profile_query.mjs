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

async function testMobileProfileQuery() {
  console.log('Testing Mobile Profile Query with Anon Client...');
  const { data: profile, error } = await supabaseAnon
    .from('profiles')
    .select('*, restaurants(name)')
    .eq('id', '4bc2a7cc-72c2-4e09-b253-193f3f45f431')
    .maybeSingle();

  if (error) {
    console.error('❌ Mobile Profile Query ERROR:', error.message, error.code, error.details);
  } else {
    console.log('✅ Mobile Profile Query SUCCESS:', profile);
  }

  // Also test simple select('*')
  const { data: simpleProfile, error: simpleErr } = await supabaseAnon
    .from('profiles')
    .select('*')
    .eq('id', '4bc2a7cc-72c2-4e09-b253-193f3f45f431')
    .maybeSingle();

  if (simpleErr) {
    console.error('❌ Simple Profile Query ERROR:', simpleErr.message);
  } else {
    console.log('✅ Simple Profile Query SUCCESS:', simpleProfile);
  }
}

testMobileProfileQuery();
