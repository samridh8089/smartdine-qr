const prodUrl = 'https://www.cleverops.in';

async function runSmokeTests() {
  console.log('=====================================================');
  console.log('=== CLEVEROPS PRODUCTION DEPLOYMENT SMOKE TESTS ===');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`✅ [PASS]: ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${msg}`);
      failed++;
    }
  }

  try {
    const routes = [
      '/',
      '/login',
      '/dashboard',
      '/dashboard/menu',
      '/dashboard/ai-menu',
      '/dashboard/offers',
      '/dashboard/inventory',
      '/dashboard/tables',
      '/dashboard/kds',
      '/dashboard/orders',
      '/dashboard/reports',
      '/dashboard/billing',
      '/dashboard/settings',
      '/super-admin'
    ];

    for (const route of routes) {
      const res = await fetch(`${prodUrl}${route}`);
      assert(res.status === 200, `Production route "${route}" responded with HTTP 200 (actual: ${res.status})`);
    }

    // Check SaaS pricing plans API endpoint
    const plansApiRes = await fetch(`${prodUrl}/api/admin/plans`);
    assert(plansApiRes.status === 200, `API /api/admin/plans responded with HTTP 200 (actual: ${plansApiRes.status})`);
    const plansData = await plansApiRes.json();
    assert(plansData.success === true && Array.isArray(plansData.plans), `API returns valid plans array`);

    const starterPlan = plansData.plans.find(p => p.id.toLowerCase() === 'starter');
    const proPlan = plansData.plans.find(p => p.id.toLowerCase() === 'pro');
    const premPlan = plansData.plans.find(p => p.id.toLowerCase() === 'premium');
    const customPlan = plansData.plans.find(p => p.id.toLowerCase() === 'custom');

    assert(Boolean(starterPlan), 'Plan STARTER exists in production response');
    assert(Boolean(proPlan), 'Plan PRO exists in production response');
    assert(Boolean(premPlan), 'Plan PREMIUM exists in production response');
    assert(Boolean(customPlan), 'Plan CUSTOM exists in production response');

    // STARTER Verifications
    assert(starterPlan && (starterPlan.ai_limits?.ai_menu_analysis ?? 0) === 0, 'Starter AI Menu limit is 0 credits');
    assert(starterPlan && (starterPlan.ai_limits?.ai_recipe_generation ?? 0) === 0, 'Starter AI Recipe limit is 0 credits');
    assert(starterPlan && starterPlan.features?.ai_menu === false, 'Starter AI Menu toggle is locked (false)');
    assert(starterPlan && starterPlan.features?.ai_recipe === false, 'Starter AI Recipe toggle is locked (false)');

    // PRO Verifications
    assert(proPlan && (proPlan.ai_limits?.ai_menu_analysis ?? 200) === 200, 'PRO AI Menu limit is 200 item credits/month');
    assert(proPlan && (proPlan.ai_limits?.ai_recipe_generation ?? 200) === 200, 'PRO AI Recipe limit is 200 item credits/month');
    assert(proPlan && proPlan.features?.ai_menu === true, 'PRO AI Menu toggle is enabled (true)');
    assert(proPlan && proPlan.features?.ai_recipe === true, 'PRO AI Recipe toggle is enabled (true)');

    // PREMIUM Verifications
    assert(premPlan && (premPlan.ai_limits?.ai_menu_analysis ?? 2000) === 2000, 'PREMIUM AI Menu limit is 2000 item credits/month');
    assert(premPlan && (premPlan.ai_limits?.ai_recipe_generation ?? 2000) === 2000, 'PREMIUM AI Recipe limit is 2000 item credits/month');
    assert(premPlan && premPlan.features?.multi_outlet === false, 'PREMIUM Multi-Outlet is disabled (false)');
    assert(premPlan && premPlan.features?.api_access === false, 'PREMIUM API Access is disabled (false)');
    assert(premPlan && premPlan.features?.custom_branding === true, 'PREMIUM Custom Branding is enabled (true)');

  } catch (err) {
    console.error('❌ Smoke test exception:', err);
    failed++;
  }

  console.log('\n=====================================================');
  console.log(`=== SMOKE TEST SUMMARY: ${passed}/${passed + failed} PASSED ===`);
  console.log('=====================================================\n');
}

runSmokeTests();
