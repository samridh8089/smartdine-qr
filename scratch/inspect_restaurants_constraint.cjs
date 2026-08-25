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

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data: rest } = await supabaseAdmin.from('restaurants').select('id, name, subscription_plan').limit(5);
  console.log('Sample Restaurants:', rest);

  // Test setting starter, pro, premium, growth, business
  for (const p of ['starter', 'pro', 'premium', 'growth', 'business']) {
    const { error } = await supabaseAdmin.from('restaurants').update({ subscription_plan: p }).eq('id', rest[0].id);
    console.log(`Update to "${p}":`, error ? `ERROR: ${error.message}` : 'SUCCESS');
  }

  // Restore original
  await supabaseAdmin.from('restaurants').update({ subscription_plan: rest[0].subscription_plan }).eq('id', rest[0].id);
}

inspect();
