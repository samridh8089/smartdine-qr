import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const BASE_URL = 'http://localhost:3000';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const table2Id = '5ec916c5-da1a-4f01-9257-25e24c5bb964'; // Table 2

async function loginUser(page, email, password, targetUrl) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  if (targetUrl) {
    await page.goto(targetUrl);
    await page.waitForTimeout(1000);
  }
}

async function testPriorityFixes() {
  console.log('================================================================');
  console.log('=== TESTING PRIORITY FIX 1 & 2 (WAITER CONFLICT & IMAGE FALLBACK) ===');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });

  // -------------------------------------------------------------
  // PRIORITY TEST 1: WAITER CONFLICT SIMULTANEOUS SERVE
  // -------------------------------------------------------------
  console.log('\n[Priority Test 1] Testing Waiter 1 vs Waiter 2 Simultaneous Serve...');
  
  // Clean Table 2
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table2Id);

  // Place fresh order on Table 2
  const orderRes = await fetch(`${BASE_URL}/api/customer/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table2Id,
      orderType: 'dine_in',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
    })
  });
  const orderData = await orderRes.json();
  const orderId = orderData.order?.id;
  console.log(` - Placed order on Table 2: ${orderId}`);

  // Set order to READY
  await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
  console.log(' - Order marked as READY.');

  // Open Waiter 1
  const w1Ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const w1Page = await w1Ctx.newPage();
  await loginUser(w1Page, 'samridhtomar8@gmail.com', 'FoodyHub@W1_2026!', `${BASE_URL}/dashboard/orders`);
  await w1Page.waitForSelector('text=Table 2', { timeout: 15000 });
  await w1Page.click('text=Table 2');
  console.log(' - Waiter 1 opened Table 2 order.');

  // Open Waiter 2
  const w2Ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const w2Page = await w2Ctx.newPage();
  await loginUser(w2Page, 'poojagarg0885@gmail.com', 'FoodyHub@W2_2026!', `${BASE_URL}/dashboard/orders`);
  await w2Page.waitForSelector('text=Table 2', { timeout: 15000 });
  await w2Page.click('text=Table 2');
  console.log(' - Waiter 2 opened Table 2 order.');

  await w1Page.waitForTimeout(1000);
  await w2Page.waitForTimeout(1000);

  // Locate Serve buttons on both pages
  const w1ServeBtn = w1Page.locator('button:has-text("Serve Order"), button:has-text("Serve")').first();
  const w2ServeBtn = w2Page.locator('button:has-text("Serve Order"), button:has-text("Serve")').first();

  console.log(' - Executing simultaneous clicks on Serve Order...');
  // Trigger both clicks
  const [click1, click2] = await Promise.allSettled([
    w1ServeBtn.click({ timeout: 5000 }),
    w2ServeBtn.click({ timeout: 5000 })
  ]);

  await w1Page.waitForTimeout(1500);
  await w2Page.waitForTimeout(1500);

  // Check toast messages on both pages
  const w1Text = await w1Page.innerText('body');
  const w2Text = await w2Page.innerText('body');
  const w2HasToast = w2Text.includes('already served') || w2Text.includes('served by another');

  console.log(` - Waiter 2 received "Order already served" toast?: ${w2HasToast}`);

  await w1Page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase14_waiter1_conflict.png') });
  await w2Page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase14_waiter2_conflict.png') });
  console.log('Saved phase14_waiter1_conflict.png & phase14_waiter2_conflict.png');

  await w1Ctx.close();
  await w2Ctx.close();

  // -------------------------------------------------------------
  // PRIORITY TEST 2: DISH IMAGE FALLBACK
  // -------------------------------------------------------------
  console.log('\n[Priority Test 2] Testing Dish Image Fallback...');
  const imgCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const imgPage = await imgCtx.newPage();

  // Route mock image failures to simulate 404 broken image
  await imgPage.route('**/*.{png,jpg,jpeg,webp}', route => {
    if (route.request().url().includes('menu_item') || route.request().url().includes('dishes') || route.request().url().includes('unsplash')) {
      route.abort('failed');
    } else {
      route.continue();
    }
  });

  await imgPage.goto(`${BASE_URL}/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2`);
  await imgPage.waitForSelector('text=Veg Spring Roll', { timeout: 15000 });
  await imgPage.waitForTimeout(2000);

  await imgPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase14_dish_image_fallback_mobile.png') });
  console.log('Saved phase14_dish_image_fallback_mobile.png');

  await imgCtx.close();
  await browser.close();

  console.log('\n=== PRIORITY TESTS COMPLETED ===');
}

testPriorityFixes().catch(console.error);
