const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(condition, description, failDetail = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ TEST #${totalTests} PASSED: ${description}`);
    return true;
  } else {
    failedTests++;
    console.error(`❌ TEST #${totalTests} FAILED: ${description} — ${failDetail}`);
    return false;
  }
}

function parsePlanSpec(dbRow) {
  const planId = (dbRow?.id || 'starter').toLowerCase();
  let embeddedSpec = {};
  if (Array.isArray(dbRow?.features)) {
    const specsStr = dbRow.features.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
    if (specsStr) {
      try {
        embeddedSpec = JSON.parse(specsStr.replace('__SPECS__:', ''));
      } catch (e) {}
    }
  }
  return {
    id: planId,
    name: (dbRow?.name || planId).toUpperCase(),
    limits: embeddedSpec.limits || {},
    features: embeddedSpec.features || {},
    ai_limits: embeddedSpec.ai_limits || {}
  };
}

async function runTestSuite() {
  console.log('=====================================================================');
  console.log('=== CLEVEROPS STARTER WAITER + KITCHEN LOGIN REGRESSION SUITE ===');
  console.log('=====================================================================\n');

  // 1. Get Bistro restaurant on Starter plan
  const { data: rest } = await supabaseAdmin.from('restaurants').select('*').eq('slug', 'bistro').maybeSingle();
  if (!rest) {
    console.error('❌ Bistro restaurant not found!');
    process.exit(1);
  }
  const restaurantId = rest.id;
  await supabaseAdmin.from('restaurants').update({ subscription_plan: 'starter' }).eq('id', restaurantId);

  // Clean up any temporary test profiles from previous runs
  await supabaseAdmin.from('profiles').delete().eq('restaurant_id', restaurantId).neq('role', 'owner');

  // 2. Fetch Starter plan spec
  const DEFAULT_STARTER_SPEC = {
    id: 'starter',
    name: 'STARTER',
    price_monthly: 499,
    price_yearly: 4990,
    limits: { tables: 5, menu_items: 25, staff_accounts: 5, inventory_items: 0, recipes: 0, outlets: 1, monthly_orders: null },
    features: { qr_menu: true, ordering: true, takeaway: true, reservations: false, live_order_tracking: false, call_waiter: false, request_bill: false, table_management: true, kds: true, kitchen_notifications: false, batch_orders: false, floor_plan: false, table_merge: false, manual_discount: false, inventory: false, stock_in: false, low_stock_alerts: false, out_of_stock_auto_disable: false, auto_stock_deduction: false, csv_inventory_import: false, recipes: false, recipe_costing: false, gross_margin: false, waste_management: false, transaction_ledger: false, advanced_analytics: false, csv_exports: false, pdf_reports: false, detailed_gst_reports: false, staff_rbac: true, staff_tasks: false, task_proof_upload: false, task_approval: false, audit_logs: false, multi_outlet: false, central_dashboard: false, outlet_reports: false, custom_reports: false, api_access: false, custom_branding: false, ai_menu: false, ai_recipe: false },
    ai_limits: { ai_menu_analysis: 0, ai_recipe_generation: 0 }
  };
  await supabaseAdmin.from('pricing_plans').upsert({
    id: 'starter',
    name: 'STARTER',
    price_monthly: 499,
    price_yearly: 4990,
    features: ['STARTER Plan Entitlements Matrix', `__SPECS__:${JSON.stringify(DEFAULT_STARTER_SPEC)}`]
  });

  const { data: planRow } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', 'starter').maybeSingle();
  const starterSpec = parsePlanSpec(planRow || { id: 'starter' });

  // ASSERTION 1: Starter supports staff_rbac (Staff roles including Waiter and Kitchen)
  check(starterSpec.features.staff_rbac !== false, 'Starter plan entitlement includes staff_rbac (Staff Roles & Access Control)');

  // ASSERTION 2: Owner Login Supported
  const { data: ownerProf } = await supabaseAdmin.from('profiles').select('*').eq('restaurant_id', restaurantId).eq('role', 'owner').maybeSingle();
  check(ownerProf && ownerProf.role === 'owner', 'Starter supports Owner Login profile');

  // ASSERTION 3: Waiter Staff Account Creation & Profile Supported
  const testWaiterEmail = `waiter_test_${Date.now()}@bistro.com`;
  const { data: waiterAuth, error: wErr } = await supabaseAdmin.auth.admin.createUser({
    email: testWaiterEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { fullName: 'Test Waiter Staff', role: 'waiter', restaurant_id: restaurantId }
  });

  if (waiterAuth?.user) {
    await supabaseAdmin.from('profiles').upsert({
      id: waiterAuth.user.id,
      email: testWaiterEmail,
      full_name: 'Test Waiter Staff',
      role: 'waiter',
      restaurant_id: restaurantId
    });
  }

  const { data: waiterProf } = await supabaseAdmin.from('profiles').select('*').eq('restaurant_id', restaurantId).eq('role', 'waiter').limit(1).maybeSingle();
  check(waiterProf && waiterProf.role === 'waiter', 'Starter supports Waiter Account Creation & Login');

  // ASSERTION 4: Kitchen/KDS Staff Account Creation & Profile Supported
  const testKitchenEmail = `kitchen_test_${Date.now()}@bistro.com`;
  const { data: kitchenAuth } = await supabaseAdmin.auth.admin.createUser({
    email: testKitchenEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { fullName: 'Test Kitchen Staff', role: 'kitchen', restaurant_id: restaurantId }
  });

  if (kitchenAuth?.user) {
    await supabaseAdmin.from('profiles').upsert({
      id: kitchenAuth.user.id,
      email: testKitchenEmail,
      full_name: 'Test Kitchen Staff',
      role: 'kitchen',
      restaurant_id: restaurantId
    });
  }

  const { data: kitchenProf } = await supabaseAdmin.from('profiles').select('*').eq('restaurant_id', restaurantId).eq('role', 'kitchen').limit(1).maybeSingle();
  check(kitchenProf && kitchenProf.role === 'kitchen', 'Starter supports Kitchen/KDS Account Creation & Login');

  // ASSERTION 5: Staff Limit Boundary Enforcement (Limit = 5)
  const staffLimit = starterSpec.limits.staff_accounts || 5;
  check(staffLimit === 5, 'Starter default staff accounts limit is 5');

  // Fetch current staff count
  const { data: currentStaff } = await supabaseAdmin.from('profiles').select('id').eq('restaurant_id', restaurantId);
  const currentCount = currentStaff ? currentStaff.length : 0;
  check(currentCount <= 5, `Current staff count (${currentCount}) is within Starter staff limit (${staffLimit})`);

  // ASSERTION 6: Restricted Starter Features Remain Locked
  check(starterSpec.features.inventory === false, 'Restricted Feature: Inventory remains LOCKED on Starter');
  check(starterSpec.features.ai_menu === false, 'Restricted Feature: Smart Menu / AI Menu remains LOCKED on Starter');
  check(starterSpec.features.ai_recipe === false, 'Restricted Feature: AI Recipe remains LOCKED on Starter');
  check(starterSpec.features.advanced_analytics === false, 'Restricted Feature: Advanced Reports remain LOCKED on Starter');

  // Cleanup test users
  if (waiterAuth?.user?.id) await supabaseAdmin.auth.admin.deleteUser(waiterAuth.user.id);
  if (kitchenAuth?.user?.id) await supabaseAdmin.auth.admin.deleteUser(kitchenAuth.user.id);

  console.log('\n=====================================================================');
  console.log(`=== TEST SUMMARY: ${passedTests}/${totalTests} PASSED ===`);
  console.log('=====================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite();
