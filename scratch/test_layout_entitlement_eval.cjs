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

const { DEFAULT_PLAN_SPECS, parsePlanSpec } = require('../src/lib/entitlements');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function testEval() {
  console.log('=== TESTING LAYOUT ENTITLEMENT EVALUATION FOR STARTER RESTAURANT ===');
  
  // Fetch Bistro restaurant (slug bistro)
  const { data: rest } = await supabaseAdmin.from('restaurants').select('*').eq('slug', 'bistro').maybeSingle();
  console.log('Restaurant bistro subscription_plan:', rest?.subscription_plan);

  const planId = (rest?.subscription_plan || 'starter').toLowerCase();
  const { data: row } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', planId).maybeSingle();
  const planSpec = parsePlanSpec(row || { id: planId });

  console.log('Parsed planSpec.id:', planSpec.id);
  console.log('Parsed planSpec.features.inventory:', planSpec.features.inventory);
  console.log('Parsed planSpec.features.ai_menu:', planSpec.features.ai_menu);

  const ROUTE_FEATURE_KEYS = {
    '/dashboard/ai-menu': { key: 'ai_menu', name: 'Smart Menu by CleverOps', desc: 'AI Menu Analysis & OCR is not available on your current plan.' },
    '/dashboard/inventory': { key: 'inventory', name: 'Inventory & Recipes', desc: 'Inventory Management & Recipe Costing is not available on your current plan.' }
  };

  for (const pathName of ['/dashboard/inventory', '/dashboard/ai-menu']) {
    const routeLockInfo = ROUTE_FEATURE_KEYS[pathName];
    const isCurrentRouteLocked = Boolean(routeLockInfo && planSpec.features[routeLockInfo.key] === false);
    console.log(`Path ${pathName}: routeLockInfo.key = ${routeLockInfo?.key}, featureVal = ${planSpec.features[routeLockInfo?.key]}, isCurrentRouteLocked = ${isCurrentRouteLocked}`);
  }
}

testEval();
