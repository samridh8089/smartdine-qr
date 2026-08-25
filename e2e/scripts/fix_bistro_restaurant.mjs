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

async function fixBistroSlug() {
  // Rename empty bistro slug
  await supabase.from('restaurants').update({ slug: 'bistro-dummy' }).eq('id', '73a27f2d-a272-49a9-ad7f-c9073a297dbd');
  
  // Set main restaurant c1853f65-c10c-4f8a-b379-00a60f404ef9 slug to 'bistro'
  await supabase.from('restaurants').update({ slug: 'bistro' }).eq('id', 'c1853f65-c10c-4f8a-b379-00a60f404ef9');

  console.log('✅ Updated restaurant slugs. Main active restaurant (c1853f65-c10c-4f8a-b379-00a60f404ef9) is now slug: bistro');
}

fixBistroSlug();
