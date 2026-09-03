import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  const { data: rests } = await client.from('restaurants').select('id, name, settings, owner_id');
  console.log('Restaurants:\n', JSON.stringify(rests, null, 2));

  const { data: profs } = await client.from('profiles').select('id, email, role, push_token, updated_at');
  console.log('\nProfiles:\n', JSON.stringify(profs, null, 2));
}

checkData();
