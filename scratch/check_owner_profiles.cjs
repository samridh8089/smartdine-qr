const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOwnerProfiles() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('All Profiles:', profiles);
}

checkOwnerProfiles().catch(console.error);
