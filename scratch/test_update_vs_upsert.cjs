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
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-').replace(/^["']|["']$/g, '');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdateVsUpsert() {
  console.log('=== TESTING UPDATE VS UPSERT ON STARTER PLAN ===');

  const testPayload = {
    id: 'starter',
    name: 'STARTER',
    price_monthly: 499,
    price_yearly: 4990,
    features: ['Test Feature Updated at ' + new Date().toISOString()],
    updated_at: new Date().toISOString()
  };

  console.log('\n--- 1. Testing UPSERT ---');
  const { data: upsertData, error: upsertErr } = await supabase.from('pricing_plans').upsert(testPayload).select();
  console.log(`UPSERT Result: ${upsertData ? 'SUCCESS' : 'FAILED'}, Error: ${upsertErr?.message || 'none'}`);

  console.log('\n--- 2. Testing UPDATE ---');
  const { data: updateData, error: updateErr } = await supabase.from('pricing_plans').update(testPayload).eq('id', 'starter').select();
  console.log(`UPDATE Result: ${updateData ? 'SUCCESS' : 'FAILED'}, Error: ${updateErr?.message || 'none'}`);
  if (updateData && updateData.length > 0) {
    console.log('Saved Row ID:', updateData[0].id);
    console.log('Saved Row Name:', updateData[0].name);
    console.log('Saved Row Price:', updateData[0].price_monthly);
  }
}

testUpdateVsUpsert().catch(console.error);
