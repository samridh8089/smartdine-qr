const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9'; // The foody hub

async function updatePlan() {
  console.log('=== UPDATING FOODY HUB SUBSCRIPTION PLAN TO PREMIUM ===\n');

  const { data, error } = await supabase.from('restaurants').update({
    subscription_plan: 'premium'
  }).eq('id', TARGET_REST_ID).select();

  if (error) console.error('Error updating plan:', error);
  else console.log('✅ Plan updated to PREMIUM for target restaurant:', data);
}

updatePlan().catch(console.error);
