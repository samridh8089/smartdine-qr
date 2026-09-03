import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let serviceRoleKey = '';

envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: tables } = await supabase
    .from('tables')
    .select('id, name')
    .eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae')
    .order('name');

  console.log('Real tables count:', tables?.length);
  tables?.forEach(t => console.log(`Table: "${t.name}" -> ID: ${t.id}`));
}

main();
