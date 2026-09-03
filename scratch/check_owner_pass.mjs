import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: anonUser, error: anonErr } = await supabase.auth.signInWithPassword({
    email: 'dsoni1281@gmail.com',
    password: 'FoodyHub@Owner2026!'
  });
  console.log('OWNER SIGNIN:', anonErr ? anonErr.message : 'SUCCESS', anonUser?.user?.id);
  if (anonErr) {
    // Check with updateUserById
    console.log('Resetting password for owner to FoodyHub@Owner2026!...');
    const { error: resetErr } = await supabase.auth.admin.updateUserById('311a8235-14ea-400e-9188-3b6b54edd31f', {
      password: 'FoodyHub@Owner2026!'
    });
    console.log('RESET RESULT:', resetErr ? resetErr.message : 'SUCCESS');
  }
}

run();
