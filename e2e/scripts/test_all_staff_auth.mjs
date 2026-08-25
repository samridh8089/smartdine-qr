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

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncPasswords() {
  const staff = [
    { email: 'you@gmail.com', pass: 'Password123!' },
    { email: 'youk@gmail.com', pass: 'Password123!' },
    { email: 'youw@gmail.com', pass: 'Password123!' }
  ];

  for (const s of staff) {
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('email', s.email).single();
    if (profile) {
      await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: s.pass });
      console.log(`✅ Synced password for ${s.email} (Role: ${profile.role}) -> ${s.pass}`);
    }
  }
}

syncPasswords();
