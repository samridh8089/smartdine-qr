import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runSpikeTest2() {
  console.log('=== TEST 2: TOMATO MARKET PRICE SPIKE (₹30 -> ₹70/kg) ===\n');

  // Update Tomato cost_per_unit to 70
  const { data, error } = await supabase
    .from('inventory_items')
    .update({ cost_per_unit: 70, updated_at: new Date().toISOString() })
    .eq('restaurant_id', restaurantId)
    .eq('name', 'Tomato')
    .select();

  if (error) throw error;
  console.log('Updated Tomato cost_per_unit to ₹70/kg in DB!');

  // Launch browser to capture real-time updated recipes table
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();

  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await page.goto('https://www.cleverops.in/dashboard/inventory');
  await page.waitForSelector('text=Tomato', { timeout: 15000 });
  await page.click('button:has-text("Recipes & Costing"), button:has-text("Recipes"), [role="tab"]:has-text("Recipes")');
  await page.waitForSelector('text=Paneer Butter Masala', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const outPath = path.join(SCRATCH_DIR, 'phase9b_spike_test2_tomato.png');
  await page.screenshot({ path: outPath, fullPage: true });
  fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'phase9b_spike_test2_tomato.png'));
  console.log('Saved phase9b_spike_test2_tomato.png');

  await browser.close();
}

runSpikeTest2().catch(console.error);
