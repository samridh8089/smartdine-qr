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

async function runDepletionTest() {
  console.log('=== TEST 3: PANEER DEPLETION & LOW STOCK ALERT TEST ===\n');

  // 1. Deplete Paneer stock below minimum (minimum_stock = 2kg, set to 1.2kg)
  console.log('Depleting Paneer stock to 1.2 kg (below threshold 2 kg)...');
  await supabase
    .from('inventory_items')
    .update({ current_stock: 1.2, updated_at: new Date().toISOString() })
    .eq('restaurant_id', restaurantId)
    .eq('name', 'Paneer');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();

  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await page.goto('https://www.cleverops.in/dashboard/inventory');
  await page.waitForSelector('text=Low Stock', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const lowStockPath = path.join(SCRATCH_DIR, 'phase9b_inventory_low_stock.png');
  await page.screenshot({ path: lowStockPath, fullPage: true });
  fs.copyFileSync(lowStockPath, path.join(ARTIFACTS_DIR, 'phase9b_inventory_low_stock.png'));
  console.log('Saved phase9b_inventory_low_stock.png (Low Stock Alert active)!');

  // 2. Refill Paneer stock back to 10 kg
  console.log('Refilling Paneer stock back to 10 kg...');
  await supabase
    .from('inventory_items')
    .update({ current_stock: 10, updated_at: new Date().toISOString() })
    .eq('restaurant_id', restaurantId)
    .eq('name', 'Paneer');

  await page.reload();
  await page.waitForSelector('text=Paneer', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const refilledPath = path.join(SCRATCH_DIR, 'phase9b_inventory_refilled.png');
  await page.screenshot({ path: refilledPath, fullPage: true });
  fs.copyFileSync(refilledPath, path.join(ARTIFACTS_DIR, 'phase9b_inventory_refilled.png'));
  console.log('Saved phase9b_inventory_refilled.png (Stock normalized)!');

  await browser.close();
}

runDepletionTest().catch(console.error);
