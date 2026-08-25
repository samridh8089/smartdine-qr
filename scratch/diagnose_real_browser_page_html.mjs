import puppeteer from 'puppeteer';
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

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function serializePlanSpec(specPayload) {
  const displayBullets = [
    `${specPayload.name} Plan Entitlements Matrix`
  ];
  return {
    id: specPayload.id.toLowerCase(),
    name: specPayload.name.toUpperCase(),
    price_monthly: Number(specPayload.price_monthly || 499),
    price_yearly: Number(specPayload.price_yearly || 4990),
    features: [
      ...displayBullets,
      `__SPECS__:${JSON.stringify(specPayload)}`
    ],
    updated_at: new Date().toISOString()
  };
}

async function diagnose() {
  const { data: rest } = await supabaseAdmin.from('restaurants').select('*').eq('slug', 'bistro').maybeSingle();
  const restaurantId = rest.id;
  await supabaseAdmin.from('restaurants').update({ subscription_plan: 'starter' }).eq('id', restaurantId);

  const { data: planRow } = await supabaseAdmin.from('pricing_plans').select('*').eq('id', 'starter').maybeSingle();
  let specsStr = planRow?.features?.find(f => typeof f === 'string' && f.startsWith('__SPECS__:'));
  let baseSpec = JSON.parse(specsStr.replace('__SPECS__:', ''));

  baseSpec.features.inventory = false;
  baseSpec.features.ai_menu = false;
  await supabaseAdmin.from('pricing_plans').upsert(serializePlanSpec(baseSpec));

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'bistro@smartdine.com');
  await page.type('input[type="password"]', 'bistro123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  await page.goto(`${BASE_URL}/dashboard/inventory`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const content = await page.content();
  console.log('--- HTML CONTENT PREVIEW OF /dashboard/inventory ---');
  console.log('Includes "Feature Locked":', content.includes('Feature Locked'));
  console.log('Includes "Upgrade Plan":', content.includes('Upgrade Plan'));
  console.log('Includes "Inventory Management":', content.includes('Inventory Management'));
  console.log('Includes "Raw Material":', content.includes('Raw Material'));

  // Save screenshot to inspect visually
  await page.screenshot({ path: 'scratch/diagnose_inv.png', fullPage: true });

  await browser.close();
}

diagnose();
