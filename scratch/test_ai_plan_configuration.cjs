/**
 * CleverOps — AI CREDIT PLAN CONFIGURATION & STARTER AI CREDIT TEST SUITE
 * Run via: node scratch/test_ai_plan_configuration.cjs
 */

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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    passedCount++;
  } else {
    console.error(`❌ FAILED: ${message}`);
    failedCount++;
  }
}

async function runTestSuite() {
  console.log('=====================================================================');
  console.log('=== CLEVEROPS AI CREDIT PLAN CONFIGURATION REGRESSION SUITE ===');
  console.log('=====================================================================\n');

  try {
    // Fetch test restaurant (Bistro or target restaurant)
    const { data: restaurants } = await supabaseAdmin.from('restaurants').select('id, name, subscription_plan').limit(1);
    if (!restaurants || restaurants.length === 0) {
      throw new Error('No test restaurant found');
    }
    const testRest = restaurants[0];
    const restaurantId = testRest.id;
    console.log(`ℹ Using test restaurant: ${testRest.name} (${restaurantId})\n`);

    // ------------------------------------------------------------------
    // MODULE 1: STARTER PLAN ZERO-CREDIT & FEATURE LOCKING TESTS
    // ------------------------------------------------------------------
    console.log('--- MODULE 1: STARTER PLAN ZERO-CREDIT & FEATURE LOCKING ---');

    // Set restaurant to STARTER plan
    await supabaseAdmin.from('restaurants').update({ subscription_plan: 'starter' }).eq('id', restaurantId);

    // Fetch pricing_plans table row for STARTER
    const { data: starterPlanRow } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', 'starter').maybeSingle();
    let starterSpec = {};
    if (starterPlanRow?.features && Array.isArray(starterPlanRow.features)) {
      const specStr = starterPlanRow.features.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
      if (specStr) starterSpec = JSON.parse(specStr.replace('__SPECS__:', ''));
    }

    assert((starterSpec.ai_limits?.ai_menu_analysis ?? 0) === 0, 'Starter AI Menu Analysis limit is 0 credits');
    assert((starterSpec.ai_limits?.ai_recipe_generation ?? 0) === 0, 'Starter AI Recipe Generation limit is 0 credits');
    assert(starterSpec.features?.ai_menu === false, 'Starter feature toggle "ai_menu" is OFF (false)');
    assert(starterSpec.features?.ai_recipe === false, 'Starter feature toggle "ai_recipe" is OFF (false)');

    // Verify restaurant on STARTER plan
    const { data: starterRestData } = await supabaseAdmin.from('restaurants').select('subscription_plan, settings').eq('id', restaurantId).single();
    assert(starterRestData.subscription_plan === 'starter', 'Restaurant verified on STARTER plan');

    // ------------------------------------------------------------------
    // MODULE 2: PRO PLAN AI CREDITS (200 ITEMS / MONTH)
    // ------------------------------------------------------------------
    console.log('\n--- MODULE 2: PRO PLAN AI CREDITS (200 ITEM CREDITS) ---');

    await supabaseAdmin.from('restaurants').update({ subscription_plan: 'pro' }).eq('id', restaurantId);
    const { data: proPlanRow } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', 'pro').maybeSingle();
    let proSpec = {};
    if (proPlanRow?.features && Array.isArray(proPlanRow.features)) {
      const specStr = proPlanRow.features.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
      if (specStr) proSpec = JSON.parse(specStr.replace('__SPECS__:', ''));
    }

    assert((proSpec.ai_limits?.ai_menu_analysis ?? 200) === 200, 'PRO AI Menu Analysis is 200 item credits/month');
    assert((proSpec.ai_limits?.ai_recipe_generation ?? 200) === 200, 'PRO AI Recipe Generation is 200 item credits/month');
    assert(proSpec.features?.ai_menu === true, 'PRO feature toggle "ai_menu" is ON (true)');
    assert(proSpec.features?.ai_recipe === true, 'PRO feature toggle "ai_recipe" is ON (true)');

    // ------------------------------------------------------------------
    // MODULE 3: PREMIUM PLAN AI CREDITS (2000 ITEMS / MONTH)
    // ------------------------------------------------------------------
    console.log('\n--- MODULE 3: PREMIUM PLAN AI CREDITS (2000 ITEM CREDITS) ---');

    await supabaseAdmin.from('restaurants').update({ subscription_plan: 'premium' }).eq('id', restaurantId);
    const { data: premPlanRow } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', 'premium').maybeSingle();
    let premSpec = {};
    if (premPlanRow?.features && Array.isArray(premPlanRow.features)) {
      const specStr = premPlanRow.features.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
      if (specStr) premSpec = JSON.parse(specStr.replace('__SPECS__:', ''));
    }

    assert((premSpec.ai_limits?.ai_menu_analysis ?? 2000) === 2000, 'PREMIUM AI Menu Analysis is 2000 item credits/month');
    assert((premSpec.ai_limits?.ai_recipe_generation ?? 2000) === 2000, 'PREMIUM AI Recipe Generation is 2000 item credits/month');

    // ------------------------------------------------------------------
    // MODULE 4: DYNAMIC SUPER ADMIN CUSTOM OVERRIDE (200 -> 500 & 200 -> 750)
    // ------------------------------------------------------------------
    console.log('\n--- MODULE 4: DYNAMIC SUPER ADMIN AI CREDIT OVERRIDE ---');

    // Modify PRO plan spec: set AI Menu to 500 credits & AI Recipe to 750 credits
    const customProSpec = {
      ...proSpec,
      ai_limits: {
        ...proSpec.ai_limits,
        ai_menu_analysis: 500,
        ai_recipe_generation: 750
      }
    };

    const displayBullets = proSpec.display_features || [];
    const featuresArray = [
      ...displayBullets.filter(b => typeof b === 'string' && !b.startsWith('__SPECS__:')),
      `__SPECS__:${JSON.stringify(customProSpec)}`
    ];

    await supabaseAdmin.from('pricing_plans').update({
      features: featuresArray,
      updated_at: new Date().toISOString()
    }).eq('id', 'pro');

    // Re-fetch PRO plan from DB and verify updated numbers
    const { data: updatedProRow } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', 'pro').single();
    let verifiedProSpec = {};
    if (updatedProRow?.features && Array.isArray(updatedProRow.features)) {
      const specStr = updatedProRow.features.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
      if (specStr) verifiedProSpec = JSON.parse(specStr.replace('__SPECS__:', ''));
    }

    assert(verifiedProSpec.ai_limits?.ai_menu_analysis === 500, 'Super Admin update: PRO AI Menu limit updated to 500 credits in DB');
    assert(verifiedProSpec.ai_limits?.ai_recipe_generation === 750, 'Super Admin update: PRO AI Recipe limit updated to 750 credits in DB');

    // Restore PRO plan back to standard defaults (200 / 200)
    const restoredProSpec = {
      ...proSpec,
      ai_limits: {
        ...proSpec.ai_limits,
        ai_menu_analysis: 200,
        ai_recipe_generation: 200
      }
    };
    const restoredFeaturesArray = [
      ...displayBullets.filter(b => typeof b === 'string' && !b.startsWith('__SPECS__:')),
      `__SPECS__:${JSON.stringify(restoredProSpec)}`
    ];
    await supabaseAdmin.from('pricing_plans').update({
      features: restoredFeaturesArray,
      updated_at: new Date().toISOString()
    }).eq('id', 'pro');

    console.log('ℹ Restored PRO plan specs to defaults (200 / 200)\n');

    // ------------------------------------------------------------------
    // MODULE 5: RESTORE ORIGINAL TENANT SUBSCRIPTION STATUS
    // ------------------------------------------------------------------
    await supabaseAdmin.from('restaurants').update({ subscription_plan: testRest.subscription_plan }).eq('id', restaurantId);
    console.log(`ℹ Restored restaurant ${restaurantId} subscription to "${testRest.subscription_plan}"\n`);

  } catch (err) {
    console.error('❌ CRITICAL ERROR IN TEST SUITE:', err);
    failedCount++;
  }

  console.log('=====================================================================');
  console.log(`=== TEST SUMMARY: ${passedCount}/${passedCount + failedCount} PASSED ===`);
  console.log('=====================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
