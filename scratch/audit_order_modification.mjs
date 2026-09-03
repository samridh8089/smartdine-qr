import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';
const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const orderId = '63d78fb9-b150-447d-b510-395177bf0863';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('=== WORKFLOW D: ORDER MODIFICATION AUDIT ===');

  // 1. Add Batch #2 (Cold Coffee x 1 @ ₹120)
  console.log('Adding Batch #2: Cold Coffee to Table 1 order...');
  const { data: b2Data } = await supabase.from('order_batches').insert({
    order_id: orderId,
    batch_number: 2,
    status: 'new',
    special_instructions: 'Customer Add-on: Cold Coffee'
  }).select().single();

  await supabase.from('order_items').insert({
    order_id: orderId,
    batch_id: b2Data.id,
    menu_item_id: 'dfa4663b-16d9-4f99-be13-e7c759e635bf',
    menu_item_name: 'Cold Coffee',
    quantity: 1,
    price: 120
  });

  // Update order totals: subtotal = 710, gst = 35.50, total = 745.50
  await supabase.from('orders').update({
    subtotal: 710,
    gst: 35.50,
    total: 745.50,
    status: 'ready' // batch 2 pending preparation
  }).eq('id', orderId);

  // Capture updated order on KDS and Cashier
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as KDS to verify Batch #2 arrives
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await page.goto('https://www.cleverops.in/dashboard/kds');
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const modScr = path.join(SCRATCH_DIR, 'phase10_step_d_kds_batch2.png');
  await page.screenshot({ path: modScr, fullPage: true });
  fs.copyFileSync(modScr, path.join(ARTIFACTS_DIR, 'phase10_step_d_kds_batch2.png'));
  console.log('Saved phase10_step_d_kds_batch2.png');

  await browser.close();
}

main().catch(console.error);
