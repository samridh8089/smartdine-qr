const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
['.env.local', '.env'].forEach(file => {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [k, ...v] = trimmed.split('=');
        if (k && v.length > 0) {
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (val) process.env[k.trim()] = val;
        }
      }
    });
  }
});

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co').replace(/^["']|["']$/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-').replace(/^["']|["']$/g, '');
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPricingPlansRLS() {
  console.log('--- SUPABASE ENVIRONMENT & KEYS DIAGNOSTICS ---');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Service Role Key set? ${Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)}`);
  console.log(`Key prefix in use: ${supabaseKey.slice(0, 15)}...`);

  console.log('\n--- TESTING PRICING_PLANS QUERY ---');
  const { data: plans, error: fetchErr } = await supabase.from('pricing_plans').select('*');
  console.log(`Fetch result count: ${plans ? plans.length : 0}, error: ${fetchErr?.message || 'none'}`);

  console.log('\n--- TESTING PRICING_PLANS UPSERT WITH CURRENT KEY ---');
  const testPayload = {
    id: 'starter',
    name: 'STARTER',
    price_monthly: 499,
    price_yearly: 4990,
    features: ['Test Feature'],
    updated_at: new Date().toISOString()
  };

  const { data: upsertData, error: upsertErr } = await supabase.from('pricing_plans').upsert(testPayload).select();
  console.log(`Upsert result: ${upsertData ? 'SUCCESS' : 'FAILED'}, error: ${upsertErr?.message || 'none'}`);
  if (upsertErr) {
    console.log(`Error Code: ${upsertErr.code}`);
    console.log(`Error Details: ${upsertErr.details}`);
    console.log(`Error Hint: ${upsertErr.hint}`);
  }
}

inspectPricingPlansRLS().catch(err => console.error(err));
