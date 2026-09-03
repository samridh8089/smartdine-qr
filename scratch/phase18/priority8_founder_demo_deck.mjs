import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const PROD_URL = 'https://www.cleverops.in';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});
const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const table1Id = '433daa89-186c-454c-a978-e184a85577b2';

async function runFounderDemoRecording() {
  console.log('===============================================================');
  console.log('=== PRIORITY 8: FOUNDER DEMO RECORDING CHECKLIST (9 STEPS)  ===');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });

  // Clear existing active order on Table 1 to ensure a clean slate
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table1Id);

  // STEP 1: Scan QR (Table 1)
  console.log('[Step 1/9] Scan QR -> Customer menu on mobile...');
  const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mPage = await mCtx.newPage();
  await mPage.goto(`${PROD_URL}/menu/foodyhub/table/${table1Id}`);
  await mPage.waitForSelector('text=Veg Spring Roll', { timeout: 15000 });
  await mPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_01_qr_scan.png') });
  console.log('Saved phase18_demo_01_qr_scan.png');

  // STEP 2: Add Dish & Open Cart
  console.log('[Step 2/9] Customer adds dish to cart...');
  await mPage.locator('button:has-text("Add")').first().click();
  await mPage.waitForTimeout(500);
  const viewCartBtn = mPage.locator('button:has-text("View Cart"), button:has-text("Order")').first();
  if (await viewCartBtn.isVisible()) await viewCartBtn.click();
  await mPage.waitForTimeout(800);
  await mPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_02_add_dish.png') });
  console.log('Saved phase18_demo_02_add_dish.png');

  // STEP 3: Order Placed -> Customer Order Tracking
  console.log('[Step 3/9] Placing order & navigating to Order Tracking...');
  const placeBtn = mPage.locator('button:has-text("Place Order")').first();
  if (await placeBtn.isVisible()) await placeBtn.click();
  await mPage.waitForURL(u => u.toString().includes('/order-tracking/'), { timeout: 15000 });
  await mPage.waitForTimeout(2000);
  await mPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_03_order_placed.png') });
  console.log('Saved phase18_demo_03_order_placed.png');

  // Retrieve placed order
  const { data: latestOrder } = await supabase.from('orders').select('id').eq('table_id', table1Id).order('created_at', { ascending: false }).limit(1).single();

  // STEP 4: KDS Rings with Order Alert
  console.log('[Step 4/9] Kitchen KDS alerts new order...');
  const kdsCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kdsPage = await kdsCtx.newPage();
  await kdsPage.goto(`${PROD_URL}/login`);
  await kdsPage.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await kdsPage.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await kdsPage.click('button[type="submit"]');
  await kdsPage.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await kdsPage.goto(`${PROD_URL}/dashboard/kds`);
  await kdsPage.waitForSelector('text=Kitchen Display', { timeout: 15000 });
  await kdsPage.waitForTimeout(2000);
  await kdsPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_04_kds_bell_alert.png') });
  console.log('Saved phase18_demo_04_kds_bell_alert.png');

  // STEP 5: Kitchen Prepares -> Mark Ready
  console.log('[Step 5/9] Kitchen prepares dish...');
  await supabase.from('orders').update({ status: 'ready' }).eq('id', latestOrder.id);
  await kdsPage.reload();
  await kdsPage.waitForSelector('text=Kitchen Display', { timeout: 15000 });
  await kdsPage.waitForTimeout(1000);
  await kdsPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_05_kitchen_prepares.png') });
  console.log('Saved phase18_demo_05_kitchen_prepares.png');

  // STEP 6: Waiter Serves
  console.log('[Step 6/9] Waiter serves order...');
  const wCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const wPage = await wCtx.newPage();
  await wPage.goto(`${PROD_URL}/login`);
  await wPage.fill('input[type="email"]', 'samridhtomar8@gmail.com');
  await wPage.fill('input[type="password"]', 'FoodyHub@W1_2026!');
  await wPage.click('button[type="submit"]');
  await wPage.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await wPage.goto(`${PROD_URL}/dashboard/orders`);
  await wPage.waitForSelector('text=Live Orders', { timeout: 15000 });
  await wPage.waitForTimeout(1500);
  await wPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_06_waiter_serves.png') });
  console.log('Saved phase18_demo_06_waiter_serves.png');

  // Waiter marks served in DB
  await supabase.from('orders').update({ status: 'served' }).eq('id', latestOrder.id);

  // STEP 7: Cashier Bills & Settles
  console.log('[Step 7/9] Cashier settles bill...');
  const cCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cPage = await cCtx.newPage();
  await cPage.goto(`${PROD_URL}/login`);
  await cPage.fill('input[type="email"]', 'deepak.soni19492@gmail.com');
  await cPage.fill('input[type="password"]', 'FoodyHub@Cash2026!');
  await cPage.click('button[type="submit"]');
  await cPage.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await cPage.goto(`${PROD_URL}/dashboard/orders`);
  await cPage.waitForSelector('text=Live Orders', { timeout: 15000 });
  await cPage.waitForTimeout(1500);
  await cPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_07_cashier_bills.png') });
  console.log('Saved phase18_demo_07_cashier_bills.png');

  // Settle bill
  await supabase.from('orders').update({ payment_status: 'paid', status: 'completed' }).eq('id', latestOrder.id);

  // STEP 8: Owner Checks Revenue & Analytics
  console.log('[Step 8/9] Owner views reports...');
  const oCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const oPage = await oCtx.newPage();
  await oPage.goto(`${PROD_URL}/login`);
  await oPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await oPage.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await oPage.click('button[type="submit"]');
  await oPage.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await oPage.goto(`${PROD_URL}/dashboard/reports`);
  await oPage.waitForSelector('text=Analytics & Reports', { timeout: 15000 });
  await oPage.waitForTimeout(2000);
  await oPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_08_owner_revenue.png') });
  console.log('Saved phase18_demo_08_owner_revenue.png');

  // STEP 9: Super Admin Sees Tenant
  console.log('[Step 9/9] Super Admin views multi-tenant dashboard...');
  const saCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const saPage = await saCtx.newPage();
  await saPage.goto(`${PROD_URL}/login`);
  await saPage.fill('input[type="email"]', 'admin@cleverops.in');
  await saPage.fill('input[type="password"]', 'Admin@12345!');
  await saPage.click('button[type="submit"]');
  await saPage.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await saPage.goto(`${PROD_URL}/super-admin`);
  await saPage.waitForSelector('text=Super Admin', { timeout: 15000 });
  await saPage.waitForTimeout(2000);
  await saPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_demo_09_superadmin_tenant.png') });
  console.log('Saved phase18_demo_09_superadmin_tenant.png');

  console.log('\nAll 9 Founder Demo screenshots successfully captured and saved!');
  await browser.close();
}

runFounderDemoRecording().catch(console.error);
