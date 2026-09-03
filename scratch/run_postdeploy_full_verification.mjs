import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const orderId = 'dd61bc33-dce5-4d00-adeb-ce7849463bd4'; // Fresh Table 2 Order ID

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let serviceRoleKey = '';

envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  }
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

async function main() {
  console.log('=== STARTING POST-DEPLOY MANDATORY LIVE VERIFICATION ===');
  const browser = await chromium.launch({ headless: true });

  // 1. Fresh order receipt screenshot
  console.log('\n[1] Capturing Fresh Table 2 Order Tracking...');
  const customerContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const customerPage = await customerContext.newPage();
  await customerPage.goto(`https://www.cleverops.in/order-tracking/${orderId}`);
  await customerPage.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await customerPage.waitForTimeout(2000);

  const trackingScr = path.join(ARTIFACTS_DIR, 'postdeploy_table2_tracking.png');
  await customerPage.screenshot({ path: trackingScr });
  console.log('Saved postdeploy_table2_tracking.png');

  // 2. KDS screenshot
  console.log('\n[2] Capturing KDS Live Order Reception...');
  const kdsContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kdsPage = await kdsContext.newPage();
  await kdsPage.goto('https://www.cleverops.in/login');
  await kdsPage.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await kdsPage.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await kdsPage.click('button[type="submit"]');
  await kdsPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await kdsPage.goto('https://www.cleverops.in/dashboard/kds');
  await kdsPage.waitForSelector('text=Table 2', { timeout: 15000 });
  await kdsPage.waitForTimeout(2000);

  const kdsScr = path.join(ARTIFACTS_DIR, 'postdeploy_kds_table2.png');
  await kdsPage.screenshot({ path: kdsScr });
  console.log('Saved postdeploy_kds_table2.png');

  // Move ticket to Preparing
  const acceptBtn = await kdsPage.$('button:has-text("Accept")');
  if (acceptBtn) {
    await acceptBtn.click();
    await kdsPage.waitForTimeout(2000);
  }

  // 3. Waiter screenshot
  console.log('\n[3] Capturing Waiter Portal & Serving...');
  const waiterContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const waiterPage = await waiterContext.newPage();
  await waiterPage.goto('https://www.cleverops.in/login');
  await waiterPage.fill('input[type="email"]', 'samridhtomar8@gmail.com');
  await waiterPage.fill('input[type="password"]', 'FoodyHub@W1_2026!');
  await waiterPage.click('button[type="submit"]');
  await waiterPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await waiterPage.goto('https://www.cleverops.in/dashboard/orders');
  await waiterPage.waitForTimeout(3000);

  const waiterScr = path.join(ARTIFACTS_DIR, 'postdeploy_waiter_table2.png');
  await waiterPage.screenshot({ path: waiterScr });
  console.log('Saved postdeploy_waiter_table2.png');

  // 4. Cashier screenshot
  console.log('\n[4] Capturing Cashier Billing...');
  const cashierContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cashierPage = await cashierContext.newPage();
  await cashierPage.goto('https://www.cleverops.in/login');
  await cashierPage.fill('input[type="email"]', 'deepak.soni19492@gmail.com');
  await cashierPage.fill('input[type="password"]', 'FoodyHub@Cash2026!');
  await cashierPage.click('button[type="submit"]');
  await cashierPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await cashierPage.goto('https://www.cleverops.in/dashboard/orders');
  await cashierPage.waitForTimeout(3000);

  const cashierScr = path.join(ARTIFACTS_DIR, 'postdeploy_cashier_table2.png');
  await cashierPage.screenshot({ path: cashierScr });
  console.log('Saved postdeploy_cashier_table2.png');

  // 5. Owner reports screenshot
  console.log('\n[5] Capturing Owner Reports...');
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto('https://www.cleverops.in/login');
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await ownerPage.goto('https://www.cleverops.in/dashboard/reports');
  await ownerPage.waitForTimeout(3000);

  const reportsScr = path.join(ARTIFACTS_DIR, 'postdeploy_owner_reports.png');
  await ownerPage.screenshot({ path: reportsScr });
  console.log('Saved postdeploy_owner_reports.png');

  // 6. Super Admin screenshot
  console.log('\n[6] Capturing Super Admin Dashboard...');
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();
  await adminPage.goto('https://www.cleverops.in/login');
  await adminPage.fill('input[type="email"]', 'admin@cleverops.in');
  await adminPage.fill('input[type="password"]', 'Admin@12345!');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await adminPage.goto('https://www.cleverops.in/super-admin');
  await adminPage.waitForTimeout(3000);

  const superAdminScr = path.join(ARTIFACTS_DIR, 'postdeploy_superadmin.png');
  await adminPage.screenshot({ path: superAdminScr });
  console.log('Saved postdeploy_superadmin.png');

  await browser.close();
  console.log('\n=== ALL POST-DEPLOY SCREENSHOTS CAPTURED! ===');
}

main().catch(console.error);
