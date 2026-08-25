import { createClient } from '@supabase/supabase-js';
import { db } from './db';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runCrossSurfaceVerification() {
  console.log('==================================================');
  console.log('CROSS-SURFACE CANONICAL PRICING AUDIT MATRIX');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function check(condition: boolean, testName: string, details?: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${testName}`);
    } else {
      failed++;
      console.error(`[FAIL] ${testName} - ${details || ''}`);
    }
  }

  // 1. Fetch DB raw rows directly
  const { data: dbRows, error: dbErr } = await supabaseAdmin.from('pricing_plans').select('*');
  check(!dbErr && Boolean(dbRows && dbRows.length >= 3), 'Raw DB pricing_plans table has 3 rows', dbErr?.message);

  // 2. Fetch via normalized helper db.getPricingPlans()
  const helperPlans = await db.getPricingPlans();
  check(helperPlans.length >= 3, 'Normalized helper db.getPricingPlans() returned 3 plans');

  const starter = helperPlans.find(p => p.id === 'starter');
  const pro = helperPlans.find(p => p.id === 'pro');
  const premium = helperPlans.find(p => p.id === 'premium');

  console.log('\n--------------------------------------------------');
  console.log('CANONICAL VALUES FROM NORMALIZED HELPER:');
  console.log('--------------------------------------------------');
  console.log(`STARTER: Monthly ₹${starter?.price_monthly}, Yearly ₹${starter?.price_yearly}, Max Tables ${starter?.max_tables}, Max Items ${starter?.max_items}`);
  console.log(`PRO:     Monthly ₹${pro?.price_monthly}, Yearly ₹${pro?.price_yearly}, Max Tables ${pro?.max_tables}, Max Items ${pro?.max_items}`);
  console.log(`PREMIUM: Monthly ₹${premium?.price_monthly}, Yearly ₹${premium?.price_yearly}, Max Tables ${premium?.max_tables}, Max Items ${premium?.max_items}`);

  // 3. Exact Canonical Assertions
  check(starter?.price_monthly === 299, 'Starter monthly price is exactly 299', `Got ${starter?.price_monthly}`);
  check(starter?.price_yearly === 2500, 'Starter yearly price is exactly 2500', `Got ${starter?.price_yearly}`);
  check(starter?.max_tables === 10, 'Starter max tables is exactly 10', `Got ${starter?.max_tables}`);
  check(starter?.max_items === 20, 'Starter max items is exactly 20', `Got ${starter?.max_items}`);

  check(pro?.price_monthly === 799, 'Pro monthly price is exactly 799', `Got ${pro?.price_monthly}`);
  check(pro?.price_yearly === 6000, 'Pro yearly price is exactly 6000', `Got ${pro?.price_yearly}`);
  check(pro?.max_tables === 20, 'Pro max tables is exactly 20', `Got ${pro?.max_tables}`);
  check(pro?.max_items === 50, 'Pro max items is exactly 50', `Got ${pro?.max_items}`);

  check(premium?.price_monthly === 1499, 'Premium monthly price is exactly 1499', `Got ${premium?.price_monthly}`);
  check(premium?.price_yearly === 10000, 'Premium yearly price is exactly 10000', `Got ${premium?.price_yearly}`);
  check(premium?.max_tables === 9999, 'Premium max tables is exactly 9999', `Got ${premium?.max_tables}`);
  check(premium?.max_items === 9999, 'Premium max items is exactly 9999', `Got ${premium?.max_items}`);

  console.log('\n==================================================');
  console.log(`CROSS-SURFACE VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================');

  if (failed > 0) {
    throw new Error(`Cross-surface verification failed with ${failed} errors.`);
  }
}

runCrossSurfaceVerification().catch(err => {
  console.error('Cross-surface test script crashed:', err);
  process.exit(1);
});
