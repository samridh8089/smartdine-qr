const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPricingTables() {
  console.log('=== TESTING SUPABASE PRICING TABLES ===\n');

  // Test inserting into pricing_plans
  const { data: plans, error: pErr } = await supabase.from('pricing_plans').select('*');
  console.log('Current pricing_plans:', pErr ? pErr.message : plans);

  // Test inserting 4 default plans into pricing_plans
  const defaultPlans = [
    {
      id: 'starter',
      name: 'STARTER',
      price_monthly: 499,
      price_yearly: 4990,
      features: ['Digital QR Menu', 'Dine-in Ordering', 'Takeaway', '5 Staff accounts', '25 Tables', '1 Outlet', '15 Menu items', '500 Inventory items', '5 AI Menu analyses/mo', '5 AI Recipe generations/mo', '25 AI Review replies/mo'],
      max_tables: 25,
      max_items: 15,
      allow_waiter: false,
      allow_analytics: false,
      allow_branding: false,
      kds_type: 'standard'
    },
    {
      id: 'growth',
      name: 'GROWTH',
      price_monthly: 999,
      price_yearly: 9990,
      features: ['Digital QR Menu', 'Dine-in Ordering', 'Takeaway', 'KDS', 'Inventory Management', 'Recipe Costing', '15 Staff accounts', 'Unlimited Tables', '1 Outlet', '50 Menu items', 'Unlimited Inventory items', '20 AI Menu analyses/mo', '20 AI Recipe generations/mo', '100 AI Review replies/mo'],
      max_tables: 9999,
      max_items: 50,
      allow_waiter: true,
      allow_analytics: false,
      allow_branding: false,
      kds_type: 'standard'
    },
    {
      id: 'pro',
      name: 'PRO',
      price_monthly: 1999,
      price_yearly: 19990,
      features: ['Digital QR Menu', 'Dine-in Ordering', 'Takeaway', 'KDS', 'Inventory Management', 'Recipe Costing', 'Waste Management', 'Staff Tasks', 'Advanced Analytics', 'CSV Exports', 'Unlimited Staff', 'Unlimited Tables', '1 Outlet', 'Unlimited Menu Items', 'Unlimited Inventory', '100 AI Menu analyses/mo', '100 AI Recipe generations/mo', '500 AI Review replies/mo'],
      max_tables: 9999,
      max_items: 9999,
      allow_waiter: true,
      allow_analytics: true,
      allow_branding: false,
      kds_type: 'premium'
    },
    {
      id: 'business',
      name: 'BUSINESS',
      price_monthly: 3999,
      price_yearly: 39990,
      features: ['Everything in Pro', 'Multi-Outlet Management (2 Outlets)', 'Custom AI Limits', 'Custom Branding', 'Priority 24/7 Support'],
      max_tables: 9999,
      max_items: 9999,
      allow_waiter: true,
      allow_analytics: true,
      allow_branding: true,
      kds_type: 'premium'
    }
  ];

  for (const plan of defaultPlans) {
    const { data: updated, error: uErr } = await supabase.from('pricing_plans').upsert(plan).select();
    if (uErr) console.error(`Error upserting ${plan.id}:`, uErr.message);
    else console.log(`✅ Upserted plan ${plan.name} (${plan.id})`);
  }
}

testPricingTables().catch(console.error);
