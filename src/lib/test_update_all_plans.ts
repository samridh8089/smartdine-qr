import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function updateAllPlansCanonical() {
  console.log('==================================================');
  console.log('UPSERTING CANONICAL PLAN SPECIFICATIONS TO SUPABASE DB');
  console.log('==================================================\n');

  // 1. Starter Plan
  const starterSpecs = { max_tables: 10, max_items: 20, allow_waiter: false, allow_analytics: false, allow_branding: false, kds_type: 'standard' };
  const starterFeatures = [
    'Standard KDS',
    'Basic Sales Overview',
    'QR Code Generation & Table Ordering',
    'Real-Time Order Push Alerts',
    `__SPECS__:${JSON.stringify(starterSpecs)}`
  ];
  const { error: errStarter } = await supabaseAdmin.from('pricing_plans').upsert({
    id: 'starter',
    name: 'Starter',
    price_monthly: 299,
    price_yearly: 2500,
    features: starterFeatures,
    updated_at: new Date().toISOString()
  });
  if (errStarter) console.error('Starter Upsert Error:', errStarter);
  else console.log('[PASS] Starter Plan Upserted: ₹299/mo, ₹2500/yr, 10 tables, 20 items');

  // 2. Pro Plan
  const proSpecs = { max_tables: 20, max_items: 50, allow_waiter: true, allow_analytics: true, allow_branding: false, kds_type: 'premium' };
  const proFeatures = [
    'Premium KDS with Sound Alerts',
    'Analytics Dashboard',
    'Waiter Panel & Real-Time Calling',
    'QR Code Generation & Table Ordering',
    'Real-Time Order Push Alerts',
    `__SPECS__:${JSON.stringify(proSpecs)}`
  ];
  const { error: errPro } = await supabaseAdmin.from('pricing_plans').upsert({
    id: 'pro',
    name: 'Pro',
    price_monthly: 799,
    price_yearly: 6000,
    features: proFeatures,
    updated_at: new Date().toISOString()
  });
  if (errPro) console.error('Pro Upsert Error:', errPro);
  else console.log('[PASS] Pro Plan Upserted: ₹799/mo, ₹6000/yr, 20 tables, 50 items');

  // 3. Premium Plan
  const premiumSpecs = { max_tables: 9999, max_items: 9999, allow_waiter: true, allow_analytics: true, allow_branding: true, kds_type: 'premium' };
  const premiumFeatures = [
    'Premium KDS with Sound Alerts',
    'Analytics Dashboard',
    'Waiter Panel & Real-Time Calling',
    'Custom Branding & Logo Upload',
    'QR Code Generation & Table Ordering',
    'Real-Time Order Push Alerts',
    `__SPECS__:${JSON.stringify(premiumSpecs)}`
  ];
  const { error: errPrem } = await supabaseAdmin.from('pricing_plans').upsert({
    id: 'premium',
    name: 'Premium',
    price_monthly: 1499,
    price_yearly: 10000,
    features: premiumFeatures,
    updated_at: new Date().toISOString()
  });
  if (errPrem) console.error('Premium Upsert Error:', errPrem);
  else console.log('[PASS] Premium Plan Upserted: ₹1499/mo, ₹10000/yr, Unlimited tables/items');

  // Re-read DB rows to verify
  console.log('\n--------------------------------------------------');
  console.log('FRESH SELECT AFTER CANONICAL UPSERT:');
  console.log('--------------------------------------------------');
  const { data: verified } = await supabaseAdmin.from('pricing_plans').select('*');
  verified?.forEach(p => {
    let specs: any = {};
    if (Array.isArray(p.features)) {
      const specsTag = p.features.find((f: string) => typeof f === 'string' && f.startsWith('__SPECS__:'));
      if (specsTag) specs = JSON.parse(specsTag.replace('__SPECS__:', ''));
    }
    console.log(`- ${p.id.toUpperCase()}: Monthly ₹${p.price_monthly}, Yearly ₹${p.price_yearly}, Max Tables ${specs.max_tables}, Max Items ${specs.max_items}`);
  });
}

updateAllPlansCanonical().catch(err => console.error(err));
