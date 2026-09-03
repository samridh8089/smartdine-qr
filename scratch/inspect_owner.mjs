import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: owners } = await supabase.from('profiles').select('id, email, role, restaurant_id').eq('role', 'owner');
  console.log('Owners in profiles:', owners);
  const { data: rest } = await supabase.from('restaurants').select('id, name, owner_email, owner_password_hash').eq('id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae');
  console.log('Restaurant info:', rest);
}

main().catch(console.error);
