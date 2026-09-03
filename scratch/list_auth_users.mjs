import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
env.split('\n').forEach(l => {
  if (l.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = l.split('=')[1].replace(/^["']|["']$/g, '').trim();
  if (l.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = l.split('=')[1].replace(/^["']|["']$/g, '').trim();
});

async function main() {
  const admin = createClient(url, key);
  const { data: { users }, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  console.log('Total auth users in Supabase:', users.length);
  users.forEach(u => {
    console.log(` - ID: ${u.id} | Email: ${u.email} | Confirmed: ${!!u.email_confirmed_at} | Created: ${u.created_at}`);
  });
}

main();
