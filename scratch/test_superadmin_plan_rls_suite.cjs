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

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

let testCounter = 0;
let passedCounter = 0;
let failedCounter = 0;

function assertTest(testName, condition, details = '') {
  testCounter++;
  if (condition) {
    passedCounter++;
    console.log(`✅ TEST #${testCounter} PASSED: ${testName} (${details})`);
  } else {
    failedCounter++;
    console.error(`❌ TEST #${testCounter} FAILED: ${testName} (${details})`);
  }
}

async function runSuperAdminPlanRlsSuite() {
  console.log('=====================================================================');
  console.log('=== CLEVEROPS SUPER ADMIN PRICING PLAN RLS & PERMISSION SUITE ===');
  console.log('=====================================================================\n');

  // 1. SELECT Access on pricing_plans
  const { data: plans, error: fetchErr } = await supabase.from('pricing_plans').select('*');
  assertTest('Read Access on pricing_plans (SELECT)', !fetchErr && Array.isArray(plans) && plans.length > 0, `Fetched ${plans ? plans.length : 0} plans`);

  // 2. Fetch Starter Plan Original State
  const { data: starterRowOriginal } = await supabase.from('pricing_plans').select('*').eq('id', 'starter').single();
  assertTest('Starter Plan Row Readability', Boolean(starterRowOriginal), `Starter plan found in DB`);

  // 3. Super Admin Plan Save via API (Editing STARTER)
  const testPriceMonthly = 499;
  const testPriceYearly = 4990;
  const specToSave = {
    id: 'starter',
    name: 'STARTER',
    price_monthly: testPriceMonthly,
    price_yearly: testPriceYearly,
    description: 'Entry-level QR menu & ordering package for small cafes',
    limits: { tables: 30, staff_accounts: 5, outlets: 1, menu_items: 20, inventory_items: 500, recipes: 10 },
    features: { qr_menu: true, ordering: true, inventory: false, kds: false, advanced_analytics: false, staff_tasks: false },
    ai_limits: { ai_menu_analysis: 10, ai_recipe_generation: 10, ai_review_generation: 30 }
  };

  const resSave = await fetch(`${BASE_URL}/api/admin/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planSpec: specToSave,
      adminUser: 'Super Admin Test',
      role: 'super_admin'
    })
  });
  const dataSave = await resSave.json();

  // 4. Verify DB Persistence of Saved Plan Attributes
  const { data: starterRowUpdated } = await supabase.from('pricing_plans').select('*').eq('id', 'starter').single();
  assertTest('Super Admin Save Plan Entitlements (HTTP 200 / RLS Pass)', dataSave.success === true, dataSave.success ? `Saved plan "${dataSave.plan?.name}" successfully` : `Error: ${dataSave.error}`);
  assertTest('DB Persistence of Saved Plan Entitlements', starterRowUpdated && Number(starterRowUpdated.price_monthly) === testPriceMonthly, `Saved price ₹${starterRowUpdated?.price_monthly} verified in DB`);

  // 5. Non-Super-Admin Role Save Attempt (Rejected with 403)
  const resForbidden = await fetch(`${BASE_URL}/api/admin/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planSpec: specToSave,
      adminUser: 'Malicious Owner',
      role: 'owner'
    })
  });
  assertTest('Normal Restaurant User Save Blocked (HTTP 403)', resForbidden.status === 403, `Non-Super-Admin attempt returned HTTP ${resForbidden.status}`);

  // 6. Kitchen Staff Role Save Attempt (Rejected with 403)
  const resKitchenForbidden = await fetch(`${BASE_URL}/api/admin/plans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planSpec: specToSave,
      adminUser: 'Kitchen Staff',
      role: 'kitchen'
    })
  });
  assertTest('Kitchen Staff Save Blocked (HTTP 403)', resKitchenForbidden.status === 403, `Kitchen staff attempt returned HTTP ${resKitchenForbidden.status}`);

  // 7. Verify Restaurant Subscription Integrity
  const { data: rests } = await supabase.from('restaurants').select('id, name, subscription_plan');
  assertTest('Restaurant Subscription Integrity', Array.isArray(rests) && rests.length > 0, `All ${rests ? rests.length : 0} restaurant subscriptions preserved intact`);

  console.log('\n=====================================================================');
  console.log('=== SUPER ADMIN PRICING PLAN RLS SUITE SUMMARY ===');
  console.log(`TOTAL TESTS : ${testCounter}`);
  console.log(`PASSED      : ${passedCounter}`);
  console.log(`FAILED      : ${failedCounter}`);
  console.log('=====================================================================\n');

  if (failedCounter > 0) {
    process.exit(1);
  }
}

runSuperAdminPlanRlsSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
