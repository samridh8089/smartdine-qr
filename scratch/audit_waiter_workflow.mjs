import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';
const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const tableId = '433daa89-186c-454c-a978-e184a85577b2';
const orderId = '63d78fb9-b150-447d-b510-395177bf0863';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('=== WORKFLOW C: WAITER AUDIT ===');

  // 1. Create a Call Waiter customer request
  console.log('Creating customer request for Table 1...');
  const { data: reqData } = await supabase.from('customer_requests').insert({
    restaurant_id: restaurantId,
    table_id: tableId,
    type: 'call_waiter',
    status: 'pending'
  }).select();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as Waiter 1
  console.log('Logging in as Waiter 1 (samridhtomar8@gmail.com)...');
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'samridhtomar8@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@W1_2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  console.log('Navigating to Waiter portal (/dashboard/orders)...');
  await page.goto('https://www.cleverops.in/dashboard/orders');
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const waiterScr = path.join(SCRATCH_DIR, 'phase10_step_c_waiter_portal.png');
  await page.screenshot({ path: waiterScr, fullPage: true });
  fs.copyFileSync(waiterScr, path.join(ARTIFACTS_DIR, 'phase10_step_c_waiter_portal.png'));
  console.log('Saved phase10_step_c_waiter_portal.png');

  // Mark order as served by Waiter
  console.log('Waiter marking order as served...');
  await supabase.from('orders').update({
    status: 'served',
    status_updated_at: new Date().toISOString(),
    status_updated_by: 'Samridh Waiter'
  }).eq('id', orderId);
  await supabase.from('order_batches').update({
    status: 'served',
    served_at: new Date().toISOString(),
    served_by: 'Samridh Waiter'
  }).eq('order_id', orderId);

  await page.reload();
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const servedScr = path.join(SCRATCH_DIR, 'phase10_step_c_waiter_served.png');
  await page.screenshot({ path: servedScr, fullPage: true });
  fs.copyFileSync(servedScr, path.join(ARTIFACTS_DIR, 'phase10_step_c_waiter_served.png'));
  console.log('Saved phase10_step_c_waiter_served.png');

  await browser.close();
}

main().catch(console.error);
