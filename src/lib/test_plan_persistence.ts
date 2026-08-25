import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function testPlanUpdate() {
  console.log('Testing plan specs update persistence via admin client...');

  const specs = {
    max_tables: 10,
    max_items: 20,
    allow_waiter: false,
    allow_analytics: false,
    allow_branding: false,
    kds_type: 'standard'
  };

  const dynamicFeatures = [
    'Standard KDS',
    'Basic Sales Overview',
    'QR Code Generation & Table Ordering',
    'Real-Time Order Push Alerts',
    `__SPECS__:${JSON.stringify(specs)}`
  ];

  // 1. Update starter plan in Supabase DB using admin client
  const { data: updated, error } = await supabaseAdmin
    .from('pricing_plans')
    .upsert({
      id: 'starter',
      name: 'Starter',
      price_monthly: 299,
      price_yearly: 2500,
      features: dynamicFeatures,
      updated_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error('DB Upsert Error:', error);
    return;
  }

  console.log('Upsert Succeeded. Returned Row:');
  console.log(updated);

  // 2. Re-read starter plan from DB
  const { data: readData, error: readErr } = await supabaseAdmin
    .from('pricing_plans')
    .select('*')
    .eq('id', 'starter')
    .single();

  if (readErr || !readData) {
    console.error('DB Read Error:', readErr);
    return;
  }

  console.log('Read Succeeded. Data:');
  console.log(readData);

  const specsObjStr = readData.features.find((f: string) => f.startsWith('__SPECS__:'));
  if (specsObjStr) {
    const parsedSpecs = JSON.parse(specsObjStr.replace('__SPECS__:', ''));
    console.log('PARSED SPECS FROM DB:', parsedSpecs);
    console.log('Max Tables from DB:', parsedSpecs.max_tables);
    console.log('Max Items from DB:', parsedSpecs.max_items);
    if (parsedSpecs.max_tables === 10 && parsedSpecs.max_items === 20) {
      console.log('SUCCESS 100%: Plan specs persisted and read back from database!');
    }
  }
}

testPlanUpdate();
