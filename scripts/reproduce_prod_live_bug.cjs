const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b2c2e285-1d6c-4421-9a44-cbed460919e6';
const REST_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const TABLE_ID = '7bd76bbf-34cf-4ac5-97af-2fac1efad753';
const REST_SLUG = 'foodyhub';
const ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';

async function main() {
  console.log('=== STEP 1: Fetch Version & Build ID from Production ===');
  const verRes = await fetch('https://cleverops.in/api/version');
  const verData = await verRes.json();
  console.log('Production Version Data:', verData);

  console.log('\n=== STEP 2: Launch Browser Contexts (Owner + Customer) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // Owner Context
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage = await ownerContext.newPage();

  const ownerConsoleLogs = [];
  const realtimeEvents = [];

  ownerPage.on('console', msg => {
    const text = `[Console ${msg.type()}]: ${msg.text()}`;
    ownerConsoleLogs.push(text);
  });

  ownerPage.on('websocket', ws => {
    console.log('[WebSocket Opened]:', ws.url());
    ws.on('framereceived', f => {
      if (typeof f.payload === 'string') {
        realtimeEvents.push(f.payload);
        if (f.payload.includes('table') || f.payload.includes('order') || f.payload.includes('floorplan')) {
          console.log('[Realtime Event Received]:', f.payload.slice(0, 200));
        }
      }
    });
  });

  // Login Owner
  console.log('Logging in as owner dsoni1281@gmail.com...');
  await ownerPage.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', '123456');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(u => u.pathname.includes('/dashboard'), { timeout: 30000 });
  console.log('Owner logged in successfully!');

  // Navigate Owner to Floor Layout
  console.log('Navigating Owner to Floor Layout...');
  await ownerPage.goto('https://www.cleverops.in/dashboard/tables', { waitUntil: 'domcontentloaded' });
  await ownerPage.waitForTimeout(3000);

  // Customer Context
  console.log('\n=== STEP 3: Customer Scans Maharaja QR & Opens Menu ===');
  const customerContext = await browser.newContext({ viewport: { width: 420, height: 850 } });
  const customerPage = await customerContext.newPage();

  const customerMenuUrl = `https://www.cleverops.in/menu/${REST_SLUG}/table/${TABLE_ID}`;
  console.log('Customer navigating to:', customerMenuUrl);
  await customerPage.goto(customerMenuUrl, { waitUntil: 'domcontentloaded' });
  await customerPage.waitForTimeout(3000);

  // Take screenshot of Customer Menu
  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_customer_menu.png') });
  console.log('Customer menu loaded.');

  // Find an item and add to cart
  console.log('Customer adding item to cart...');
  const addBtn = customerPage.locator('button:has-text("ADD"), button:has-text("Add")').first();
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await customerPage.waitForTimeout(1000);
  } else {
    console.log('Looking for items on menu...');
    const anyAdd = customerPage.locator('button').filter({ hasText: /Add|\+/i }).first();
    await anyAdd.click();
    await customerPage.waitForTimeout(1000);
  }

  // View Cart / Checkout
  console.log('Opening Cart / Placing Order...');
  const viewCartBtn = customerPage.locator('button:has-text("View Cart"), button:has-text("Checkout"), button:has-text("Proceed"), div:has-text("Item Added")').first();
  if (await viewCartBtn.count() > 0) {
    await viewCartBtn.click();
    await customerPage.waitForTimeout(1500);
  }

  // Look for Place Order button
  const placeOrderBtn = customerPage.locator('button:has-text("Place Order"), button:has-text("Confirm Order"), button:has-text("Send to Kitchen")').first();
  if (await placeOrderBtn.count() > 0) {
    await placeOrderBtn.click();
    await customerPage.waitForTimeout(3000);
  }

  await customerPage.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_customer_order_placed.png') });
  console.log('Customer order placed flow completed.');

  console.log('\n=== STEP 4: Check Owner Live Orders & Floor Layout ===');
  // Navigate Owner to Live Orders
  await ownerPage.goto('https://www.cleverops.in/dashboard/orders', { waitUntil: 'domcontentloaded' });
  await ownerPage.waitForTimeout(3000);
  const liveOrdersPath = path.join(ARTIFACT_DIR, 'prod_live_orders_screenshot.png');
  await ownerPage.screenshot({ path: liveOrdersPath, fullPage: true });
  console.log('Saved Live Orders screenshot to:', liveOrdersPath);

  // Navigate Owner to Floor Layout
  await ownerPage.goto('https://www.cleverops.in/dashboard/tables', { waitUntil: 'domcontentloaded' });
  await ownerPage.waitForTimeout(4000);
  const floorLayoutPath = path.join(ARTIFACT_DIR, 'prod_floor_layout_after_order.png');
  await ownerPage.screenshot({ path: floorLayoutPath, fullPage: true });
  console.log('Saved Floor Layout after order screenshot to:', floorLayoutPath);

  // Check Supabase Row
  console.log('\n=== STEP 5: Query Supabase Table Status & table_states ===');
  const restRowRes = await fetch(`${SUPABASE_URL}/rest/v1/restaurants?id=eq.${REST_ID}&select=settings`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const restRow = await restRowRes.json();
  const maharajaState = restRow[0]?.settings?.table_states?.[TABLE_ID];
  console.log('Supabase table_states for Maharaja:', JSON.stringify(maharajaState, null, 2));

  const tableRowRes = await fetch(`${SUPABASE_URL}/rest/v1/tables?id=eq.${TABLE_ID}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const tableRow = await tableRowRes.json();
  console.log('Supabase tables row for Maharaja:', JSON.stringify(tableRow, null, 2));

  // Save logs and events
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'prod_owner_console.log'), ownerConsoleLogs.join('\n'));
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'prod_realtime_events.log'), realtimeEvents.join('\n'));

  console.log('\n=== Test Finished ===');
  await browser.close();
}

main().catch(err => {
  console.error('Fatal error in reproduction:', err);
  process.exit(1);
});
