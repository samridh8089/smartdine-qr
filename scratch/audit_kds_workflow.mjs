import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';
const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const supabase = createClient(supabaseUrl, serviceRoleKey);
const orderId = '63d78fb9-b150-447d-b510-395177bf0863';

async function main() {
  console.log('=== WORKFLOW B: KDS AUDIT ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as KDS
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await page.goto('https://www.cleverops.in/dashboard/kds');
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // 1. Pending Screenshot
  const pendingScr = path.join(SCRATCH_DIR, 'phase10_step_b_kds_pending.png');
  await page.screenshot({ path: pendingScr, fullPage: true });
  fs.copyFileSync(pendingScr, path.join(ARTIFACTS_DIR, 'phase10_step_b_kds_pending.png'));
  console.log('Saved phase10_step_b_kds_pending.png');

  // 2. Transition to Preparing
  console.log('Updating status to preparing in DB...');
  await supabase.from('orders').update({
    status: 'preparing',
    status_updated_at: new Date().toISOString(),
    status_updated_by: 'Chef Kitchen'
  }).eq('id', orderId);
  await supabase.from('order_batches').update({
    status: 'preparing',
    preparing_at: new Date().toISOString(),
    preparing_by: 'Chef Kitchen'
  }).eq('order_id', orderId);

  await page.reload();
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const prepScr = path.join(SCRATCH_DIR, 'phase10_step_b_kds_preparing.png');
  await page.screenshot({ path: prepScr, fullPage: true });
  fs.copyFileSync(prepScr, path.join(ARTIFACTS_DIR, 'phase10_step_b_kds_preparing.png'));
  console.log('Saved phase10_step_b_kds_preparing.png');

  // 3. Transition to Ready
  console.log('Updating status to ready in DB...');
  await supabase.from('orders').update({
    status: 'ready',
    status_updated_at: new Date().toISOString(),
    status_updated_by: 'Chef Kitchen'
  }).eq('id', orderId);
  await supabase.from('order_batches').update({
    status: 'ready',
    ready_at: new Date().toISOString(),
    ready_by: 'Chef Kitchen'
  }).eq('order_id', orderId);

  await page.reload();
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const readyScr = path.join(SCRATCH_DIR, 'phase10_step_b_kds_ready.png');
  await page.screenshot({ path: readyScr, fullPage: true });
  fs.copyFileSync(readyScr, path.join(ARTIFACTS_DIR, 'phase10_step_b_kds_ready.png'));
  console.log('Saved phase10_step_b_kds_ready.png');

  await browser.close();
}

main().catch(console.error);
