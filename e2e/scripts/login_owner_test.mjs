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

async function loginOwner() {
  const { data: user, error: adminErr } = await supabase.auth.admin.updateUserById(
    '4bc2a7cc-72c2-4e09-b253-193f3f45f431',
    { password: 'Password123!' }
  );

  if (adminErr) {
    console.error('Admin update password error:', adminErr.message);
  } else {
    console.log('✅ Set owner password for you@gmail.com to Password123!');
  }

  const clientSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await clientSupabase.auth.signInWithPassword({
    email: 'you@gmail.com',
    password: 'Password123!'
  });

  if (error) {
    console.error('Sign in error:', error.message);
  } else {
    console.log('✅ Owner Sign in successful! Session access_token:', data.session.access_token.slice(0, 30));
  }
}

loginOwner();
