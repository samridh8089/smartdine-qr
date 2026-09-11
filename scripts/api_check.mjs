import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

let supabaseUrl = '';
let supabaseKey = '';
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = trimmed.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^['"]|['"]$/g, '');
  }
  if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    supabaseKey = trimmed.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^['"]|['"]$/g, '');
  }
  if (!supabaseKey && trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = trimmed.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/^['"]|['"]$/g, '');
  }
});


async function main() {
  const sb = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await sb.from('restaurants').select('id, name, settings');
  if (error) console.error('DB Error:', error);
  data?.forEach(r => {
    console.log(`[${r.name} (${r.id})]`);
    console.log('  Announcement:', r.settings?.broadcast_announcement);
  });
}

main().catch(console.error);

