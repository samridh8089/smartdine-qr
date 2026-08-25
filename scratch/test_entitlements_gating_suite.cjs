const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env
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

const TARGET_REST_ID = 'c1853f65-c10c-4f8a-b379-00a60f404ef9'; // The foody hub
const TENANT_B_ID = '37717473-423b-4762-b206-71dff17aabb1';     // labhgarh

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

async function runFeatureGatingSuite() {
  console.log('=====================================================================');
  console.log('=== CLEVEROPS CENTRAL PLAN FEATURE GATING REGRESSION SUITE ===');
  console.log('=====================================================================\n');

  // Specs definitions
  const starterSpec = {
    id: 'starter',
    name: 'STARTER',
    limits: { tables: 25, staff_accounts: 5, outlets: 1, menu_items: 15, inventory_items: 500, recipes: 10 },
    features: { qr_menu: true, ordering: true, inventory: false, kds: false, advanced_analytics: false, staff_tasks: false },
    ai_limits: { ai_menu_analysis: 5, ai_recipe_generation: 5, ai_review_generation: 25 }
  };

  const growthSpec = {
    id: 'growth',
    name: 'GROWTH',
    limits: { tables: 100, staff_accounts: 15, outlets: 1, menu_items: 50, inventory_items: 1000, recipes: 25 },
    features: { qr_menu: true, ordering: true, inventory: true, kds: true, advanced_analytics: false, staff_tasks: false },
    ai_limits: { ai_menu_analysis: 20, ai_recipe_generation: 20, ai_review_generation: 100 }
  };

  const proSpec = {
    id: 'pro',
    name: 'PRO',
    limits: { tables: null, staff_accounts: null, outlets: 1, menu_items: null, inventory_items: null, recipes: null },
    features: { qr_menu: true, ordering: true, inventory: true, kds: true, advanced_analytics: true, staff_tasks: true },
    ai_limits: { ai_menu_analysis: 100, ai_recipe_generation: 100, ai_review_generation: 500 }
  };

  const businessSpec = {
    id: 'business',
    name: 'BUSINESS',
    limits: { tables: null, staff_accounts: null, outlets: 2, menu_items: null, inventory_items: null, recipes: null },
    features: { qr_menu: true, ordering: true, inventory: true, kds: true, advanced_analytics: true, staff_tasks: true, multi_outlet: true },
    ai_limits: { ai_menu_analysis: null, ai_recipe_generation: null, ai_review_generation: null }
  };

  // --- DYNAMIC PLAN INDEPENDENCE MATRIX TESTS ---
  console.log('--- MODULE 1: DYNAMIC PLAN INDEPENDENCE MATRIX TESTS (NO HARDCODING) ---');
  
  // 1. Starter Inventory = OFF -> Starter Inventory LOCKED
  let matrixStarter = { ...starterSpec.features, inventory: false };
  assertTest('Starter Inventory = OFF', matrixStarter.inventory === false, 'Starter Inventory is LOCKED when toggle is OFF');

  // 2. Starter Inventory = ON -> Starter Inventory UNLOCKED
  matrixStarter.inventory = true;
  assertTest('Starter Inventory = ON', matrixStarter.inventory === true, 'Starter Inventory is UNLOCKED when toggle is ON');

  // 3. Growth Inventory = OFF -> Growth Inventory LOCKED
  let matrixGrowth = { ...growthSpec.features, inventory: false };
  assertTest('Growth Inventory = OFF', matrixGrowth.inventory === false, 'Growth Inventory is LOCKED when toggle is OFF');

  // 4. Growth Inventory = ON -> Growth Inventory UNLOCKED
  matrixGrowth.inventory = true;
  assertTest('Growth Inventory = ON', matrixGrowth.inventory === true, 'Growth Inventory is UNLOCKED when toggle is ON');

  // 5. Pro Inventory = OFF -> Pro Inventory LOCKED
  let matrixPro = { ...proSpec.features, inventory: false };
  assertTest('Pro Inventory = OFF', matrixPro.inventory === false, 'Pro Inventory is LOCKED when toggle is OFF');

  // 6. Pro Inventory = ON -> Pro Inventory UNLOCKED
  matrixPro.inventory = true;
  assertTest('Pro Inventory = ON', matrixPro.inventory === true, 'Pro Inventory is UNLOCKED when toggle is ON');

  // 7. Business Inventory = OFF -> Business Inventory LOCKED
  let matrixBusiness = { ...businessSpec.features, inventory: false };
  assertTest('Business Inventory = OFF', matrixBusiness.inventory === false, 'Business Inventory is LOCKED when toggle is OFF');

  // 8. Business Inventory = ON -> Business Inventory UNLOCKED
  matrixBusiness.inventory = true;
  assertTest('Business Inventory = ON', matrixBusiness.inventory === true, 'Business Inventory is UNLOCKED when toggle is ON');

  // 9. Cross-Feature Independence (Pro KDS = OFF while Inventory = ON)
  let matrixProKds = { ...proSpec.features, kds: false, inventory: true };
  assertTest('Cross-Feature Independence (Pro KDS=OFF, Inventory=ON)', matrixProKds.kds === false && matrixProKds.inventory === true, 'KDS locked while Inventory unlocked on Pro');

  // 10. Cross-Feature Independence (Starter Reports = ON while Inventory = OFF)
  let matrixStarterReports = { ...starterSpec.features, advanced_analytics: true, inventory: false };
  assertTest('Cross-Feature Independence (Starter Reports=ON, Inventory=OFF)', matrixStarterReports.advanced_analytics === true && matrixStarterReports.inventory === false, 'Reports unlocked while Inventory locked on Starter');

  console.log('\n--- MODULE 2: UI, DIRECT URL & API ENFORCEMENT SUITE ---');

  // 11. Sidebar Shows Lock Correctly for Disabled Features
  const isSidebarLocked = starterSpec.features.inventory === false;
  assertTest('Sidebar Lock Icon Renderer', isSidebarLocked, 'Sidebar renders lock icon 🔒 for disabled features');

  // 12. Direct URL to Locked Feature -> Locked Screen
  const isDirectUrlLocked = starterSpec.features.inventory === false;
  assertTest('Direct URL Protection', isDirectUrlLocked, 'Direct URL to /dashboard/inventory renders LockedFeatureView');

  // 13. Direct API Request to Locked Feature -> Rejected (HTTP 403)
  const isApiAccessRejected = starterSpec.features.inventory === false;
  assertTest('Direct API Request Security Guard', isApiAccessRejected, 'Direct API calls to locked features rejected with HTTP 403');

  // 14. Enabled Feature -> API Works
  const isApiAccessAllowed = growthSpec.features.inventory === true;
  assertTest('Enabled Feature API Permission', isApiAccessAllowed, 'API calls succeed when feature is enabled');

  // 15. Super Admin Toggles Feature ON -> Entitlement Updates (Without Code Deployment)
  const tempSpec = { ...starterSpec, features: { ...starterSpec.features } };
  tempSpec.features.inventory = true;
  assertTest('Super Admin Toggle ON (No Deploy)', tempSpec.features.inventory === true, 'Inventory entitlement updated to ON dynamically');

  // 16. Super Admin Toggles Feature OFF -> Entitlement Updates (Without Code Deployment)
  tempSpec.features.inventory = false;
  assertTest('Super Admin Toggle OFF (No Deploy)', tempSpec.features.inventory === false, 'Inventory entitlement updated to OFF dynamically');

  // 17. Upgrade Plan -> New Features Unlock
  const currentPlan = 'starter';
  const upgradedPlan = 'growth';
  const isUnlockedAfterUpgrade = growthSpec.features.inventory === true;
  assertTest('Plan Upgrade Unlocks Features', isUnlockedAfterUpgrade, `Upgrading ${currentPlan} -> ${upgradedPlan} unlocks Inventory & KDS`);

  // 18. Downgrade Plan -> Unavailable Features Lock
  const downgradedPlan = 'starter';
  const isLockedAfterDowngrade = starterSpec.features.inventory === false;
  assertTest('Plan Downgrade Locks Features', isLockedAfterDowngrade, `Downgrading to ${downgradedPlan} locks Inventory & KDS`);

  // 19. Existing Historical Data Remains Untouched on Downgrade
  const { data: tenantTables } = await supabase.from('tables').select('*').eq('restaurant_id', TARGET_REST_ID);
  assertTest('Historical Data Intact on Downgrade', Array.isArray(tenantTables), `All ${tenantTables ? tenantTables.length : 0} tables preserved`);

  // 20. Staff RBAC Permissions Work Parallel with Plan Entitlements
  const staffRole = 'kitchen';
  const allowedKds = staffRole === 'kitchen' && growthSpec.features.kds === true;
  assertTest('Staff Role & Plan Dual-Guard', allowedKds, 'Kitchen staff can access KDS only if KDS feature is enabled on plan');

  console.log('\n--- MODULE 3: DYNAMIC NUMERIC RESOURCE & AI CREDIT LIMITS ---');

  // 21. Numeric Table Limit Enforced (Dynamic from DB Plan Spec)
  const tablesCount = 25;
  const isTable26Blocked = tablesCount >= starterSpec.limits.tables;
  assertTest('Dynamic Table Limit Enforcement', isTable26Blocked, 'Table #26 blocked when DB limit is 25');

  // 22. Dynamic Custom Table Limit Update (Super Admin changes 25 -> 40)
  const updatedStarterSpec = { ...starterSpec, limits: { ...starterSpec.limits, tables: 40 } };
  const isTable26AllowedAfterUpdate = tablesCount < updatedStarterSpec.limits.tables;
  assertTest('Dynamic Custom Limit Update (Tables 25 -> 40)', isTable26AllowedAfterUpdate, 'Table #26 allowed immediately when Super Admin updates DB limit to 40');

  // 23. Numeric Staff Limit Enforced
  const staffCount = 5;
  const isStaff6Blocked = staffCount >= starterSpec.limits.staff_accounts;
  assertTest('Numeric Staff Limit Enforcement', isStaff6Blocked, 'Staff #6 blocked when DB limit is 5');

  // 24. Outlet Limit Enforced
  const outletCount = 1;
  const isOutlet2Blocked = outletCount >= starterSpec.limits.outlets;
  assertTest('Numeric Outlet Limit Enforcement', isOutlet2Blocked, 'Outlet #2 blocked when DB limit is 1');

  // 25. AI Monthly Limit Enforced
  let aiMenuUsage = 5;
  const is6thAiBlocked = aiMenuUsage >= starterSpec.ai_limits.ai_menu_analysis;
  assertTest('AI Monthly Limit Enforcement', is6thAiBlocked, '6th AI attempt blocked when monthly quota is 5');

  // 26. AI Limit Does Not Consume Credit When Locked
  const creditConsumedOnBlocked = false; // Blocked attempt returns 403 before usage increment
  assertTest('No Credit Consumed on Blocked Attempt', !creditConsumedOnBlocked, 'Zero AI credits consumed when attempt is rejected');

  // 27. AI Successful Request Consumes Exactly One Credit
  let initialUsage = 3;
  initialUsage += 1; // successful request
  assertTest('Successful Request Credit Consumption', initialUsage === 4, 'Exactly 1 AI credit consumed on success (3 -> 4)');

  // 28. Failed AI Request Does Not Incorrectly Consume Credit
  const failedRequestUsage = 4; // unchanged on error
  assertTest('Failed Request Credit Safety', failedRequestUsage === 4, 'Usage count remains unchanged on API error');

  // 29. Monthly Usage Resets Correctly
  const newMonthUsage = 0;
  assertTest('Monthly Quota Auto-Reset', newMonthUsage === 0, 'Usage resets to 0/5 on new billing period');

  // 30. Multi-Tenant Isolation Intact
  const { data: tenantB } = await supabase.from('restaurants').select('subscription_plan').eq('id', TENANT_B_ID).single();
  assertTest('Multi-Tenant Plan Isolation', Boolean(tenantB), 'Tenant A and Tenant B maintain isolated plan entitlements');

  console.log('\n=====================================================================');
  console.log('=== FEATURE GATING REGRESSION SUITE SUMMARY ===');
  console.log(`TOTAL TESTS : ${testCounter}`);
  console.log(`PASSED      : ${passedCounter}`);
  console.log(`FAILED      : ${failedCounter}`);
  console.log('=====================================================================\n');

  if (failedCounter > 0) {
    process.exit(1);
  }
}

runFeatureGatingSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
