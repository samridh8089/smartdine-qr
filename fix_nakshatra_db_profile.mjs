import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NAKSHATRA_ID = '6f0bf0d3-f87e-4583-861c-262fb44720af';
const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const CURRENT_DEVICE_TOKEN = 'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]';

async function fixNakshatraProfile() {
  console.log('=== FIXING NAKSHATRA PROFILE IN SUPABASE DB ===');

  const { data, error } = await client.from('profiles').upsert({
    id: NAKSHATRA_ID,
    email: 'nakshatra1233@gmail.com',
    full_name: 'sam',
    role: 'waiter',
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    push_token: CURRENT_DEVICE_TOKEN,
    updated_at: new Date().toISOString()
  });

  console.log('Upsert result:', data, error);
}

fixNakshatraProfile();
