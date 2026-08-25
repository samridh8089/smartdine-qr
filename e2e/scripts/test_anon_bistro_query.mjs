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

async function testAnonBistroQuery() {
  const { data: rest, error: restErr } = await supabaseAnon.from('restaurants').select('*').eq('slug', 'bistro');
  if (restErr || !rest || rest.length === 0) {
    console.error('❌ Anon Restaurant Query Error:', restErr?.message || 'Empty array');
  } else {
    console.log('✅ Anon Restaurant Query SUCCESS:', rest[0].name, rest[0].id);

    const { data: items, error: itemErr } = await supabaseAnon.from('menu_items').select('*').eq('restaurant_id', rest[0].id);
    if (itemErr) {
      console.error('❌ Anon Menu Items Error:', itemErr.message);
    } else {
      console.log(`✅ Anon Menu Items Count: ${items.length}`);
    }
  }
}

testAnonBistroQuery();
