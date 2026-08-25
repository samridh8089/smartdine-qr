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

async function debugRouteLock() {
  console.log('--- DEBUG ROUTE LOCK ---');
  const { data: rest } = await supabaseAdmin.from('restaurants').select('id').eq('slug', 'bistro').maybeSingle();
  if (!rest) return;

  // Set to starter
  await supabaseAdmin.from('restaurants').update({ subscription_plan: 'starter' }).eq('id', rest.id);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Navigate to dashboard inventory
  await page.goto(`${BASE_URL}/dashboard/inventory`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const content = await page.content();
  console.log('Page Title:', await page.title());
  console.log('Page URL:', page.url());
  console.log('Content snippet:', content.slice(0, 1000));
  const hasLock = content.includes('LockedFeatureView') || content.includes('Upgrade') || content.includes('Plan Required') || content.includes('Locked') || content.includes('not available on your current plan');
  console.log('Is Locked:', hasLock);

  await page.screenshot({ path: path.join(process.cwd(), 'qa-screenshots', 'final_4_plans', 'DEBUG_Inventory_Lock.png') });
  await browser.close();
}

debugRouteLock();
