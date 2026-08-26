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

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001';

async function testPlanSaveAuthHeader() {
  console.log('=== TESTING API PLAN SAVE WITH SUPER ADMIN AUTHORIZATION ===\n');

  const testSpec = {
    id: 'starter',
    name: 'STARTER',
    price_monthly: 499,
    price_yearly: 4990,
    description: 'Ideal for small cafes & food stalls starting with digital QR ordering',
    is_active: true,
    is_popular: false,
    limits: { tables: 35, staff_accounts: 5, outlets: 1, menu_items: 20, inventory_items: 500 },
    features: { qr_menu: true, ordering: true, inventory: false, kds: false, advanced_analytics: false },
    ai_limits: { ai_menu_analysis: 10, ai_recipe_generation: 10, ai_review_generation: 50 }
  };

  const res = await fetch(`${BASE_URL}/api/admin/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planSpec: testSpec,
      adminUser: 'Super Admin Test',
      role: 'super_admin'
    })
  });

  const data = await res.json();
  console.log('API Response:', JSON.stringify(data, null, 2));

  // Verify in DB
  const { data: dbRow } = await supabase.from('pricing_plans').select('*').eq('id', 'starter').single();
  console.log('Fetched DB Row price_monthly:', dbRow?.price_monthly);
}

testPlanSaveAuthHeader().catch(console.error);
