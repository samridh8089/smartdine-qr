import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function auditPricingDb() {
  console.log('==================================================');
  console.log('PRODUCTION PRICING_PLANS DATABASE AUDIT');
  console.log('==================================================\n');

  const { data: plans, error } = await supabaseAdmin
    .from('pricing_plans')
    .select('*');

  if (error) {
    console.error('Error reading pricing_plans table:', error);
    return;
  }

  console.log('Raw DB Rows Count:', plans?.length || 0);
  console.log(JSON.stringify(plans, null, 2));

  console.log('\n--------------------------------------------------');
  console.log('DIAGNOSTIC TABLE:');
  console.log('--------------------------------------------------');
  console.log('PLAN\t| MONTHLY\t| YEARLY\t| MAX_TABLES\t| MAX_ITEMS\t| SPECS');

  plans?.forEach(p => {
    let specs: any = {};
    if (Array.isArray(p.features)) {
      const specsTag = p.features.find((f: string) => typeof f === 'string' && f.startsWith('__SPECS__:'));
      if (specsTag) {
        try {
          specs = JSON.parse(specsTag.replace('__SPECS__:', ''));
        } catch (e) {}
      }
    }
    console.log(`${p.id.toUpperCase()}\t| ₹${p.price_monthly}\t| ₹${p.price_yearly}\t| ${specs.max_tables ?? p.max_tables ?? 'N/A'}\t\t| ${specs.max_items ?? p.max_items ?? 'N/A'}\t\t| ${JSON.stringify(specs)}`);
  });
}

auditPricingDb().catch(err => console.error(err));
