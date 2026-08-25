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

async function testRLSPolicies() {
  console.log('=== TEST 1: Unauthenticated SELECT on pricing_plans ===');
  const { data: selectData, error: selectErr } = await supabase.from('pricing_plans').select('*');
  console.log(`SELECT count: ${selectData ? selectData.length : 0}, error: ${selectErr?.message || 'none'}`);

  console.log('\n=== TEST 2: Unauthenticated INSERT on pricing_plans ===');
  const { data: insData, error: insErr } = await supabase.from('pricing_plans').insert({
    id: 'test_plan_' + Date.now(),
    name: 'TEST PLAN',
    price_monthly: 99,
    price_yearly: 990,
    features: ['Test']
  }).select();
  console.log(`INSERT result: ${insData ? 'ALLOWED' : 'DENIED'}, error: ${insErr?.message || 'none'}`);

  console.log('\n=== TEST 3: Unauthenticated UPDATE on pricing_plans ===');
  const { data: upData, error: upErr } = await supabase.from('pricing_plans').update({
    updated_at: new Date().toISOString()
  }).eq('id', 'starter').select();
  console.log(`UPDATE result: ${upData ? 'ALLOWED' : 'DENIED'}, error: ${upErr?.message || 'none'}`);

  console.log('\n=== TEST 4: Fetch Profiles to see super_admin user ===');
  const { data: superAdminProfiles, error: profErr } = await supabase.from('profiles').select('*').eq('role', 'super_admin');
  console.log(`Super Admin profiles found: ${superAdminProfiles ? superAdminProfiles.length : 0}`);
  if (superAdminProfiles && superAdminProfiles.length > 0) {
    console.log(`Super Admin email: ${superAdminProfiles[0].email}, id: ${superAdminProfiles[0].id}`);
  }
}

testRLSPolicies().catch(console.error);
