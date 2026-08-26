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

async function checkBistroSlug() {
  const { data: rests } = await supabase.from('restaurants').select('*');
  console.log('All Restaurants in DB:');
  rests.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Slug: ${r.slug}`));

  const { data: bistroItems } = await supabase.from('menu_items').select('*').eq('restaurant_id', 'c1853f65-c10c-4f8a-b379-00a60f404ef9');
  console.log(`\nActive menu items for c1853f65-c10c-4f8a-b379-00a60f404ef9: ${bistroItems.length}`);
}

checkBistroSlug();
