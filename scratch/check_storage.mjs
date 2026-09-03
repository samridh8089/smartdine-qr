import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env.local', 'utf8');
let anonKey = '';
envText.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    anonKey = t.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient('https://tiuwfhkrjvtkshebdwlp.supabase.co', anonKey);

async function main() {
  const { data, error } = await supabase.storage.from('smartdine-images').list('', { limit: 100 });
  console.log('List with anon key error:', error);
  console.log('Total items in smartdine-images root:', data?.length);
  if (data) {
    data.forEach(item => {
      console.log(' -', item.name, item.id ? '(file)' : '(folder)');
    });
  }

  const { data: menuItems } = await supabase.from('menu_items').select('name, image_url').eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae');
  console.log('\nMenu Items Image URLs in DB:');
  menuItems?.forEach(m => console.log(` - ${m.name}: ${m.image_url || 'NULL'}`));
}

main().catch(console.error);
