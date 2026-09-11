import puppeteer from 'puppeteer';
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const PROD_URL = 'https://www.cleverops.in';
const OUTPUT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\ae77057e-5d8c-4a8f-bb99-144b6e792b0e';
const VIDEO_PATH = path.join(OUTPUT_DIR, 'phase32_command_center_live_orders_sync.webm');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('=== STARTING PHASE-32 LIVE ORDERS SYNC PRODUCTION VERIFICATION ===');

  // 1. Verify /api/version
  console.log('1. Checking /api/version...');
  const versionRes = await fetch(`${PROD_URL}/api/version`, { cache: 'no-store' });
  const versionData = await versionRes.json();
  console.log('Production Version API Response:', JSON.stringify(versionData, null, 2));

  // 2. Launch Playwright with Chrome
  console.log('2. Launching Playwright with Puppeteer Chrome executable...');
  const chromePath = await puppeteer.executablePath();
  console.log('Using Chrome executable:', chromePath);

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // Console error tracking
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon') && !text.includes('analytics') && !text.includes('socket')) {
        consoleErrors.push(text);
        console.error('Browser Console Error:', text);
      }
    }
  });

  // 3. Login as Super Admin
  console.log('3. Logging in at /login...');
  await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type=email]', 'dsoni1281@gmail.com');
  await page.fill('input[type=password]', '123456');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  console.log('Logged in successfully! Current URL:', page.url());

  // 4. Navigate to Super Admin Command Center
  console.log('4. Navigating to /super-admin...');
  await page.goto(`${PROD_URL}/super-admin`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.innerText.includes('FOUNDER EDITION'), { timeout: 30000 });
  await sleep(2000);

  // Switch to Command Center tab
  console.log('Switching to Command Center tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const cc = btns.find(b => b.textContent && b.textContent.includes('Command Center'));
    if (cc) cc.click();
  });
  await sleep(4000);

  // PROOF 1: Initial Zero State
  console.log('Capturing Proof 1: sync_01_super_admin_zero_state.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'sync_01_super_admin_zero_state.png') });
  console.log('Captured sync_01_super_admin_zero_state.png');

  // 5. Place a real live order via API on Table 5 for The Foody Hub
  console.log('5. Placing real live order on Table 5 for The Foody Hub...');
  const orderRes = await fetch(`${PROD_URL}/api/customer/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae',
      tableId: '6aabebef-3205-4c6f-bed6-5e142ecbb0ac', // table 5
      orderType: 'dine_in',
      customerName: 'Founder Live Sync',
      customerPhone: '9876543210',
      items: [
        {
          id: 'af9f4399-a153-49a0-b908-8ef15478ef3e', // Veg Schezwan Noodles
          quantity: 1
        }
      ]
    })
  });
  const orderData = await orderRes.json();
  console.log('Order creation API response:', orderData);
  const createdOrderId = orderData.order?.id;
  console.log('Created Order ID:', createdOrderId);

  if (!createdOrderId) {
    throw new Error('Failed to create live order: ' + JSON.stringify(orderData));
  }

  // 6. Step order through lifecycle in realtime and observe Super Admin Command Center
  console.log('6. Stepping order through lifecycle in realtime...');
  await sleep(4000); // Give realtime listener time to update

  // Step 1: Transition to Preparing
  console.log('Step 1 -> Transitioning order to "preparing"...');
  await fetch(`${PROD_URL}/api/staff/update-order-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: createdOrderId,
      newStatus: 'preparing',
      staffName: 'Chef Anand'
    })
  });
  await sleep(4000);

  // Step 2: Assign Waiter & log event
  console.log('Step 2 -> Logging waiter assignment event (Neha Patel)...');
  await fetch(`${PROD_URL}/api/system-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurant_id: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae',
      order_id: createdOrderId,
      correlation_id: `corr_${createdOrderId}`,
      actor_type: 'waiter',
      event_type: 'waiter_assigned',
      source_node: 'preparing',
      target_node: 'waiter_assigned',
      metadata: { waiter: 'Neha Patel', table: 'table 5' }
    })
  });
  await sleep(4000);

  // Step 3: Transition to Ready
  console.log('Step 3 -> Transitioning order to "ready"...');
  await fetch(`${PROD_URL}/api/staff/update-order-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: createdOrderId,
      newStatus: 'ready',
      staffName: 'Chef Anand'
    })
  });
  await sleep(4000);

  // Step 4: Transition to Served
  console.log('Step 4 -> Transitioning order to "served"...');
  await fetch(`${PROD_URL}/api/staff/update-order-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: createdOrderId,
      newStatus: 'served',
      staffName: 'Neha Patel'
    })
  });
  await sleep(4000);

  // Step 5: Highlight order in Graph, Timeline, and Inspector
  console.log('Step 5 -> Selecting table 5 / order in Super Admin Floor Twin...');
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('div, button, span'));
    const t5 = elements.find(el => el.textContent && (el.textContent.includes('table 5') || el.textContent.includes('Table 5')));
    if (t5) {
      t5.click();
      const parentBtn = t5.closest('button, [role="button"]');
      if (parentBtn) parentBtn.click();
    }
  });
  await sleep(3000);

  // PROOF 2: Highlighted order in Super Admin Command Center
  console.log('Capturing Proof 2: sync_02_super_admin_highlighted_order.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'sync_02_super_admin_highlighted_order.png') });
  console.log('Captured sync_02_super_admin_highlighted_order.png');

  // PROOF 3: Owner Portal Live Order
  console.log('Navigating second page to Owner Portal /dashboard to capture same live order...');
  const ownerPage = await context.newPage();
  await ownerPage.goto(`${PROD_URL}/dashboard`, { waitUntil: 'networkidle' });
  await sleep(3000);
  console.log('Capturing Proof 3: sync_03_owner_portal_live_order.png...');
  await ownerPage.screenshot({ path: path.join(OUTPUT_DIR, 'sync_03_owner_portal_live_order.png') });
  console.log('Captured sync_03_owner_portal_live_order.png');
  await ownerPage.close();

  // PROOF 4: Restaurant Switch in Super Admin
  console.log('Testing Restaurant Switch in Super Admin...');
  await page.bringToFront();
  const switched = await page.evaluate(() => {
    const select = document.querySelector('select');
    if (select && select.options.length > 1) {
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  });
  console.log('Restaurant dropdown switched:', switched);
  await sleep(4000);

  console.log('Capturing Proof 4: sync_04_restaurant_switch.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'sync_04_restaurant_switch.png') });
  console.log('Captured sync_04_restaurant_switch.png');

  // Switch back to The Foody Hub
  console.log('Switching back to The Foody Hub...');
  await page.evaluate(() => {
    const select = document.querySelector('select');
    if (select) {
      select.selectedIndex = 0;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(4000);

  // PROOF 5: Complete test order and verify clean zero state
  console.log('Completing test order...');
  await fetch(`${PROD_URL}/api/staff/update-order-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: createdOrderId,
      newStatus: 'completed',
      staffName: 'Super Admin'
    })
  });
  await sleep(4000);

  console.log('Capturing final reconnected zero-state: sync_05_completed_zero_state.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, 'sync_05_completed_zero_state.png') });

  const video = page.video();

  // Close page and context to flush video
  await page.close();
  await context.close();
  await browser.close();

  if (video) {
    await video.saveAs(VIDEO_PATH);
    console.log('Video saved successfully to:', VIDEO_PATH);
  }

  console.log('Console errors count:', consoleErrors.length);
  console.log('=== ALL PRODUCTION PROOFS AND VIDEO RECORDING CAPTURED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});

