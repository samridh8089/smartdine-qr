const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9';

async function checkRestColumns() {
  const { data: rest } = await supabase.from('restaurants').select('*').eq('id', TARGET_REST_ID).single();
  console.log('Restaurant Record:', rest);
}

checkRestColumns().catch(console.error);
