const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  console.log('=== INSPECTING PRICING & ENTITLEMENT TABLES ===\n');

  const { data: plans, error: pErr } = await supabase.from('pricing_plans').select('*');
  console.log('pricing_plans:', pErr ? pErr.message : plans);

  const { data: pf, error: pfErr } = await supabase.from('plan_features').select('*');
  console.log('plan_features:', pfErr ? pfErr.message : pf);

  const { data: pl, error: plErr } = await supabase.from('plan_limits').select('*');
  console.log('plan_limits:', plErr ? plErr.message : pl);

  const { data: ai, error: aiErr } = await supabase.from('ai_usage').select('*');
  console.log('ai_usage:', aiErr ? aiErr.message : ai);

  const { data: rest, error: rErr } = await supabase.from('restaurants').select('id, name, subscription_plan, subscription_status').limit(5);
  console.log('restaurants:', rErr ? rErr.message : rest);
}

inspectTables().catch(console.error);
