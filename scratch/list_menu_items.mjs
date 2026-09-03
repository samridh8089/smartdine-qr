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
  const { data: dishes } = await supabase
    .from('menu_items')
    .select('id, name, price, is_available')
    .eq('restaurant_id', '81fa8201-51d7-4da5-98f5-a52dbff4e6ae');

  console.log('Real Dishes:');
  dishes?.forEach(d => console.log(`Dish: "${d.name}" -> ID: ${d.id} (₹${d.price}, avail: ${d.is_available})`));
}

main();
