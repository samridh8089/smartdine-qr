const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkPlans() {
  const { data, error } = await supabaseAdmin.from('pricing_plans').select('*');
  console.log('Error:', error);
  console.log('Plans:', data?.map(d => ({ id: d.id, name: d.name, featuresCount: d.features?.length })));
  if (data && data.length > 0) {
    data.forEach(d => {
      console.log(`\n=== PLAN ${d.id} (${d.name}) ===`);
      const specStr = d.features?.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
      console.log('Specs:', specStr ? JSON.parse(specStr.replace('__SPECS__:', '')) : 'NO __SPECS__');
    });
  }
}
checkPlans();
