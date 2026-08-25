import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

// Import specs dynamically
import { DEFAULT_PLAN_SPECS, serializePlanSpec } from '../src/lib/entitlements.js';

async function syncPlans() {
  console.log('--- SEEDING & SYNCHRONIZING FINAL 4 SAAS PLANS (STARTER, PRO, PREMIUM, CUSTOM) ---');

  for (const planId of ['starter', 'pro', 'premium', 'custom']) {
    const spec = DEFAULT_PLAN_SPECS[planId];
    if (!spec) continue;

    const payload = serializePlanSpec(spec);

    const { data, error } = await supabaseAdmin
      .from('pricing_plans')
      .upsert(payload)
      .select();

    if (error) {
      console.error(`❌ Error syncing plan ${planId}:`, error.message);
    } else {
      console.log(`✓ Plan ${spec.name} synchronized successfully! Price: ₹${spec.price_monthly}`);
    }
  }

  // Update target restaurant to starter
  const { data: rest } = await supabaseAdmin.from('restaurants').select('id').eq('slug', 'bistro').maybeSingle();
  if (rest) {
    await supabaseAdmin.from('restaurants').update({ subscription_plan: 'starter' }).eq('id', rest.id);
    console.log(`✓ Restaurant "bistro" set to STARTER plan.`);
  }

  console.log('✅ DATABASE SEED COMPLETE!');
}

syncPlans();
