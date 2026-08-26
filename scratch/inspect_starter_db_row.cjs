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

async function inspectStarter() {
  console.log('=== EXACT STARTER ROW IN PRICING_PLANS ===');
  const { data: row } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', 'starter').maybeSingle();
  console.log('Raw DB Row:', JSON.stringify(row, null, 2));

  const specsStr = row?.features?.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
  if (specsStr) {
    const parsed = JSON.parse(specsStr.replace('__SPECS__:', ''));
    console.log('\nParsed Embedded Specs:');
    console.log('Inventory:', parsed.features?.inventory);
    console.log('AI Menu:', parsed.features?.ai_menu);
  } else {
    console.log('NO __SPECS__ FOUND IN STARTER ROW!');
  }
}

inspectStarter();
