import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: rest } = await supabase.from('restaurants').select('id, name, slug');
  console.log('RESTAURANTS:', rest);
  const { data: tables } = await supabase.from('tables').select('id, name, restaurant_id');
  console.log('TABLES:', tables);
}

run();
