import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';
const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const supabase = createClient(supabaseUrl, serviceRoleKey);
const restId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

async function main() {
  console.log('====================================================');
  console.log('=== PHASE-9A PRE-FIX VERIFICATION (100% LIVE)    ===');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // ----------------------------------------------------
  // TASK 1: STAFF ROLE VERIFICATION (RBAC)
  // ----------------------------------------------------
  console.log('\n--- TASK 1: STAFF ROLE VERIFICATION ---');

  // 1. Owner
  console.log('1. Verifying Owner (dsoni1281@gmail.com)...');
  const ownerPage = await context.newPage();
  await ownerPage.goto('https://www.cleverops.in/login');
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  await ownerPage.goto('https://www.cleverops.in/dashboard');
  await ownerPage.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await ownerPage.waitForTimeout(2000);

  const ownerScr = path.join(SCRATCH_DIR, 'phase9a_task1_owner_dashboard.png');
  await ownerPage.screenshot({ path: ownerScr, fullPage: true });
  fs.copyFileSync(ownerScr, path.join(ARTIFACTS_DIR, 'phase9a_task1_owner_dashboard.png'));
  console.log('Saved phase9a_task1_owner_dashboard.png');

  // 2. KDS
  console.log('2. Verifying KDS (newlifeofdeepsssa@gmail.com)...');
  const kdsContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kdsPage = await kdsContext.newPage();
  await kdsPage.goto('https://www.cleverops.in/login');
  await kdsPage.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await kdsPage.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await kdsPage.click('button[type="submit"]');
  await kdsPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  await kdsPage.waitForTimeout(2000);

  const kdsScr = path.join(SCRATCH_DIR, 'phase9a_task1_kds_portal.png');
  await kdsPage.screenshot({ path: kdsScr, fullPage: true });
  fs.copyFileSync(kdsScr, path.join(ARTIFACTS_DIR, 'phase9a_task1_kds_portal.png'));
  console.log('Saved phase9a_task1_kds_portal.png (URL: ' + kdsPage.url() + ')');

  // KDS Unauthorized Test: Navigate to /dashboard/reports
  console.log('Testing KDS unauthorized access to /dashboard/reports...');
  await kdsPage.goto('https://www.cleverops.in/dashboard/reports');
  await kdsPage.waitForTimeout(3000);
  const kdsBlockedUrl = kdsPage.url();
  console.log('KDS redirected to:', kdsBlockedUrl);

  const kdsUnauthScr = path.join(SCRATCH_DIR, 'phase9a_task1_kds_unauthorized_redirect.png');
  await kdsPage.screenshot({ path: kdsUnauthScr, fullPage: true });
  fs.copyFileSync(kdsUnauthScr, path.join(ARTIFACTS_DIR, 'phase9a_task1_kds_unauthorized_redirect.png'));
  console.log('Saved phase9a_task1_kds_unauthorized_redirect.png');

  // 3. Waiter 1
  console.log('3. Verifying Waiter 1 (samridhtomar8@gmail.com)...');
  const w1Context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const w1Page = await w1Context.newPage();
  await w1Page.goto('https://www.cleverops.in/login');
  await w1Page.fill('input[type="email"]', 'samridhtomar8@gmail.com');
  await w1Page.fill('input[type="password"]', 'FoodyHub@W1_2026!');
  await w1Page.click('button[type="submit"]');
  await w1Page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  await w1Page.waitForTimeout(2000);

  const w1Scr = path.join(SCRATCH_DIR, 'phase9a_task1_waiter1_portal.png');
  await w1Page.screenshot({ path: w1Scr, fullPage: true });
  fs.copyFileSync(w1Scr, path.join(ARTIFACTS_DIR, 'phase9a_task1_waiter1_portal.png'));
  console.log('Saved phase9a_task1_waiter1_portal.png (URL: ' + w1Page.url() + ')');

  // Waiter 1 Unauthorized Test: Navigate to /dashboard/inventory
  console.log('Testing Waiter 1 unauthorized access to /dashboard/inventory...');
  await w1Page.goto('https://www.cleverops.in/dashboard/inventory');
  await w1Page.waitForTimeout(3000);
  console.log('Waiter 1 redirected to:', w1Page.url());

  const w1UnauthScr = path.join(SCRATCH_DIR, 'phase9a_task1_waiter1_unauthorized_redirect.png');
  await w1Page.screenshot({ path: w1UnauthScr, fullPage: true });
  fs.copyFileSync(w1UnauthScr, path.join(ARTIFACTS_DIR, 'phase9a_task1_waiter1_unauthorized_redirect.png'));
  console.log('Saved phase9a_task1_waiter1_unauthorized_redirect.png');

  // 4. Waiter 2
  console.log('4. Verifying Waiter 2 (poojagarg0885@gmail.com)...');
  const w2Context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const w2Page = await w2Context.newPage();
  await w2Page.goto('https://www.cleverops.in/login');
  await w2Page.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await w2Page.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await w2Page.click('button[type="submit"]');
  await w2Page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  await w2Page.waitForTimeout(2000);

  const w2Scr = path.join(SCRATCH_DIR, 'phase9a_task1_waiter2_portal.png');
  await w2Page.screenshot({ path: w2Scr, fullPage: true });
  fs.copyFileSync(w2Scr, path.join(ARTIFACTS_DIR, 'phase9a_task1_waiter2_portal.png'));
  console.log('Saved phase9a_task1_waiter2_portal.png (URL: ' + w2Page.url() + ')');

  // 5. Cashier
  console.log('5. Verifying Cashier (deepak.soni19492@gmail.com)...');
  const cashContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cashPage = await cashContext.newPage();
  await cashPage.goto('https://www.cleverops.in/login');
  await cashPage.fill('input[type="email"]', 'deepak.soni19492@gmail.com');
  await cashPage.fill('input[type="password"]', 'FoodyHub@Cash2026!');
  await cashPage.click('button[type="submit"]');
  await cashPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  await cashPage.waitForTimeout(2000);

  const cashScr = path.join(SCRATCH_DIR, 'phase9a_task1_cashier_portal.png');
  await cashPage.screenshot({ path: cashScr, fullPage: true });
  fs.copyFileSync(cashScr, path.join(ARTIFACTS_DIR, 'phase9a_task1_cashier_portal.png'));
  console.log('Saved phase9a_task1_cashier_portal.png (URL: ' + cashPage.url() + ')');

  // Cashier Unauthorized Test: Navigate to /dashboard/settings
  console.log('Testing Cashier unauthorized access to /dashboard/settings...');
  await cashPage.goto('https://www.cleverops.in/dashboard/settings');
  await cashPage.waitForTimeout(3000);
  console.log('Cashier redirected to:', cashPage.url());

  const cashUnauthScr = path.join(SCRATCH_DIR, 'phase9a_task1_cashier_unauthorized_redirect.png');
  await cashPage.screenshot({ path: cashUnauthScr, fullPage: true });
  fs.copyFileSync(cashUnauthScr, path.join(ARTIFACTS_DIR, 'phase9a_task1_cashier_unauthorized_redirect.png'));
  console.log('Saved phase9a_task1_cashier_unauthorized_redirect.png');

  // ----------------------------------------------------
  // TASK 2: PREMIUM PLAN VERIFICATION
  // ----------------------------------------------------
  console.log('\n--- TASK 2: PREMIUM PLAN VERIFICATION ---');
  await ownerPage.goto('https://www.cleverops.in/dashboard/billing');
  await ownerPage.waitForTimeout(3000);

  const billingScr = path.join(SCRATCH_DIR, 'phase9a_task2_billing_plan.png');
  await ownerPage.screenshot({ path: billingScr, fullPage: true });
  fs.copyFileSync(billingScr, path.join(ARTIFACTS_DIR, 'phase9a_task2_billing_plan.png'));
  console.log('Saved phase9a_task2_billing_plan.png');

  // ----------------------------------------------------
  // TASK 3: QR VERIFICATION (ALL 20 TABLES)
  // ----------------------------------------------------
  console.log('\n--- TASK 3: QR VERIFICATION (20 TABLES) ---');
  const { data: allTables } = await supabase.from('tables').select('*').eq('restaurant_id', restId);
  console.log('Total tables fetched from DB:', allTables.length);

  allTables.sort((a, b) => {
    const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  const table1 = allTables[0];
  const table20 = allTables[allTables.length - 1];

  console.log(`Table 1: ID=${table1.id}, Name=${table1.name}`);
  console.log(`Table 20: ID=${table20.id}, Name=${table20.name}`);

  // Test HTTP 200 for all 20 tables via fetch
  let all20Pass = true;
  for (const t of allTables) {
    const tableUrl = `https://www.cleverops.in/menu/foodyhub/table/${t.id}`;
    const res = await fetch(tableUrl);
    if (res.status !== 200) {
      console.error(`FAILED QR for ${t.name}: Status ${res.status}`);
      all20Pass = false;
    }
  }
  console.log('All 20 table QR URLs HTTP 200 check result:', all20Pass ? 'ALL 20 PASS (200 OK)' : 'SOME FAILED');

  // Capture Table 1 Mobile View
  const qrContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const qrPage = await qrContext.newPage();
  await qrPage.goto(`https://www.cleverops.in/menu/foodyhub/table/${table1.id}`);
  await qrPage.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await qrPage.waitForTimeout(2000);

  const t1Scr = path.join(SCRATCH_DIR, 'phase9a_task3_table1_qr.png');
  await qrPage.screenshot({ path: t1Scr, fullPage: true });
  fs.copyFileSync(t1Scr, path.join(ARTIFACTS_DIR, 'phase9a_task3_table1_qr.png'));
  console.log('Saved phase9a_task3_table1_qr.png');

  // Capture Table 20 Mobile View
  await qrPage.goto(`https://www.cleverops.in/menu/foodyhub/table/${table20.id}`);
  await qrPage.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await qrPage.waitForTimeout(2000);

  const t20Scr = path.join(SCRATCH_DIR, 'phase9a_task3_table20_qr.png');
  await qrPage.screenshot({ path: t20Scr, fullPage: true });
  fs.copyFileSync(t20Scr, path.join(ARTIFACTS_DIR, 'phase9a_task3_table20_qr.png'));
  console.log('Saved phase9a_task3_table20_qr.png');

  // Capture Invalid Table QR
  const invalidUrl = 'https://www.cleverops.in/menu/foodyhub/table/00000000-0000-0000-0000-000000000000';
  await qrPage.goto(invalidUrl);
  await qrPage.waitForTimeout(3000);

  const invScr = path.join(SCRATCH_DIR, 'phase9a_task3_invalid_table_qr.png');
  await qrPage.screenshot({ path: invScr, fullPage: true });
  fs.copyFileSync(invScr, path.join(ARTIFACTS_DIR, 'phase9a_task3_invalid_table_qr.png'));
  console.log('Saved phase9a_task3_invalid_table_qr.png');

  await browser.close();
  console.log('\n=== ALL PHASE-9A VERIFICATIONS COMPLETE ===');
}

main().catch(console.error);
