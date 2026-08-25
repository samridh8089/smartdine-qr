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

async function inspectAndFixBistroMenu() {
  const { data: rest } = await supabase.from('restaurants').select('*').eq('slug', 'bistro').single();
  console.log('Bistro Restaurant:', rest.id, rest.name);

  const { data: items } = await supabase.from('menu_items').select('*').eq('restaurant_id', rest.id);
  console.log(`Found ${items?.length} menu items for bistro:`);
  
  if (items) {
    for (const item of items) {
      console.log(`- ${item.name} | is_available: ${item.is_available} | price: ${item.price} | cat: ${item.category_id}`);
    }
  }

  // Update all bistro items to be available
  const { data: updated, error } = await supabase
    .from('menu_items')
    .update({ is_available: true })
    .eq('restaurant_id', rest.id)
    .select();

  if (error) {
    console.error('Error updating availability:', error.message);
  } else {
    console.log(`✅ Set ${updated?.length} menu items as AVAILABLE (is_available = true)`);
  }
}

inspectAndFixBistroMenu();
