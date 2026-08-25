const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPricingPlansColumns() {
  const { data: rows } = await supabase.from('pricing_plans').select('*').limit(1);
  if (rows && rows.length > 0) {
    console.log('Columns in pricing_plans:', Object.keys(rows[0]));
    console.log('Sample row:', rows[0]);
  }
}

inspectPricingPlansColumns().catch(console.error);
