const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b2c2e285-1d6c-4421-9a44-cbed460919e6';
const REST_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const TABLE_ID_MAHARAJA = '7bd76bbf-34cf-4ac5-97af-2fac1efad753';
const REST_SLUG = 'foodyhub';
const ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';

async function safeFetch(url, opts = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, opts);
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
  console.log('=== [PHASE 1] Verify Production Version on cleverops.in ===');
  const verRes = await safeFetch('https://cleverops.in/api/version');
  const verData = await verRes.json();
  console.log('Production Version Info:', JSON.stringify(verData, null, 2));

  if (!verData.commit.startsWith('f7f626a')) {
    console.warn(`WARNING: Production commit is ${verData.commit}, expected f7f626a`);
  }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  // ==========================================
  // RUN 1: TABLE MAHARAJA VERIFICATION
  // ==========================================
  console.log('\n======================================================');
  console.log('=== [RUN 1] Production Test: Table Maharaja ===');
  console.log('======================================================');

  const ownerContext1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage1 = await ownerContext1.newPage();
  const ownerConsoleLogs1 = [];
  const realtimeEvents1 = [];

  ownerPage1.on('console', msg => {
    const text = `[Owner Console ${msg.type()}]: ${msg.text()}`;
    ownerConsoleLogs1.push(text);
    if (msg.text().includes('Realtime') || msg.text().includes('floorplan') || msg.text().includes('table-status') || msg.text().includes('order')) {
      console.log(text);
    }
  });

  ownerPage1.on('websocket', ws => {
    console.log('[Owner WS Opened]:', ws.url());
    ws.on('framereceived', f => {
      if (typeof f.payload === 'string') {
        realtimeEvents1.push(f.payload);
        if (f.payload.includes('table-status-updated') || f.payload.includes('floorplan') || f.payload.includes('order')) {
          console.log('[WS MATCH EVENT]:', f.payload.slice(0, 250));
        }
      }
    });
  });

  // Login Owner
  console.log('1. Owner logging in on www.cleverops.in...');
  await ownerPage1.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await ownerPage1.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage1.fill('input[type="password"]', '123456');
  await ownerPage1.click('button[type="submit"]');
  try {
    await ownerPage1.waitForURL(u => u.pathname.includes('/dashboard'), { timeout: 35000, waitUntil: 'domcontentloaded' });
  } catch (err) {
    console.error('Login wait failed, current URL:', ownerPage1.url());
    await ownerPage1.screenshot({ path: path.join(ARTIFACT_DIR, 'prod_login_fail.png') });
    throw err;
  }
  console.log('Owner logged in! URL:', ownerPage1.url());

  // Navigate to Tables & QRs -> Floor Layout
  console.log('2. Owner opening Floor Layout...');
  await ownerPage1.goto('https://www.cleverops.in/dashboard/tables', { waitUntil: 'domcontentloaded' });
  await ownerPage1.waitForTimeout(3500);

  // Customer Context for Maharaja Table
  console.log('3. Customer scanning Maharaja QR & opening menu...');
  const customerContext1 = await browser.newContext({ viewport: { width: 420, height: 850 } });
  const customerPage1 = await customerContext1.newPage();

  const maharajaMenuUrl = `https://www.cleverops.in/menu/${REST_SLUG}/table/${TABLE_ID_MAHARAJA}`;
  await customerPage1.goto(maharajaMenuUrl, { waitUntil: 'domcontentloaded' });
  await customerPage1.waitForTimeout(3000);

  // Add Item to cart
  console.log('4. Customer adding item to cart...');
  const addBtn1 = customerPage1.locator('button').filter({ hasText: /Add|\+/i }).first();
  await addBtn1.click();
  await customerPage1.waitForTimeout(1000);

  // Checkout / Place Order
  console.log('5. Customer placing dine-in order...');
  const viewCartBtn1 = customerPage1.locator('button:has-text("View Cart"), button:has-text("Checkout"), button:has-text("Proceed"), div:has-text("Item Added")').first();
  if (await viewCartBtn1.count() > 0) {
    await viewCartBtn1.click();
    await customerPage1.waitForTimeout(1500);
  }

  const placeOrderBtn1 = customerPage1.locator('button:has-text("Place Order"), button:has-text("Confirm Order"), button:has-text("Send to Kitchen")').first();
  if (await placeOrderBtn1.count() > 0) {
    await placeOrderBtn1.click();
    await customerPage1.waitForTimeout(3000);
    console.log('Customer order placed successfully on Maharaja table!');
  }

  // Check Floor Layout state for Maharaja
  console.log('6. Checking Owner Floor Layout for immediate table occupancy...');
  await ownerPage1.waitForTimeout(3000);

  const maharajaCardText1 = await ownerPage1.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText && e.innerText.includes('maharaja') && e.innerText.includes('Seats'));
    return el ? el.innerText : 'NOT_FOUND';
  });
  console.log('Floor Layout Maharaja Card Text:', JSON.stringify(maharajaCardText1));

  // Take screenshot of Floor Layout
  const floorLayoutPath1 = path.join(ARTIFACT_DIR, 'prod_run1_floor_layout.png');
  await ownerPage1.screenshot({ path: floorLayoutPath1, fullPage: true });
  console.log('Saved Floor Layout Screenshot (Run 1):', floorLayoutPath1);

  // Navigate to Live Orders
  console.log('7. Owner checking Live Orders...');
  await ownerPage1.goto('https://www.cleverops.in/dashboard/orders', { waitUntil: 'domcontentloaded' });
  await ownerPage1.waitForTimeout(3000);
  const liveOrdersPath1 = path.join(ARTIFACT_DIR, 'prod_run1_live_orders.png');
  await ownerPage1.screenshot({ path: liveOrdersPath1, fullPage: true });
  console.log('Saved Live Orders Screenshot (Run 1):', liveOrdersPath1);

  // Query Supabase for Table Maharaja status
  const sbRestRes1 = await safeFetch(`${SUPABASE_URL}/rest/v1/restaurants?id=eq.${REST_ID}&select=settings`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const sbRestData1 = await sbRestRes1.json();
  const maharajaStateDb1 = sbRestData1[0]?.settings?.table_states?.[TABLE_ID_MAHARAJA];
  console.log('Supabase table_states for Maharaja (Run 1):', JSON.stringify(maharajaStateDb1, null, 2));

  // Close Context 1
  await customerContext1.close();
  await ownerContext1.close();

  // ==========================================
  // RUN 2: REPEAT / REFRESH VERIFICATION
  // ==========================================
  console.log('\n======================================================');
  console.log('=== [RUN 2] Production Test: Reopen Dashboard & Verify Persisted Occupancy ===');
  console.log('======================================================');

  const ownerContext2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage2 = await ownerContext2.newPage();

  console.log('1. Fresh Owner login and reopen Tables & QRs...');
  await ownerPage2.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await ownerPage2.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage2.fill('input[type="password"]', '123456');
  await ownerPage2.click('button[type="submit"]');
  await ownerPage2.waitForURL(u => u.pathname.includes('/dashboard'), { timeout: 30000 });

  await ownerPage2.goto('https://www.cleverops.in/dashboard/tables', { waitUntil: 'domcontentloaded' });
  await ownerPage2.waitForTimeout(3500);

  const maharajaCardText2 = await ownerPage2.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find(e => e.innerText && e.innerText.includes('maharaja') && e.innerText.includes('Seats'));
    return el ? el.innerText : 'NOT_FOUND';
  });
  console.log('Floor Layout Maharaja Card Text (Run 2):', JSON.stringify(maharajaCardText2));

  const floorLayoutPath2 = path.join(ARTIFACT_DIR, 'prod_run2_floor_layout.png');
  await ownerPage2.screenshot({ path: floorLayoutPath2, fullPage: true });
  console.log('Saved Floor Layout Screenshot (Run 2):', floorLayoutPath2);

  // Click on maharaja table to check Drawer details
  const maharajaCardEl = ownerPage2.locator('text=maharaja').first();
  await maharajaCardEl.click();
  await ownerPage2.waitForTimeout(1500);
  const drawerPath2 = path.join(ARTIFACT_DIR, 'prod_run2_maharaja_drawer.png');
  await ownerPage2.screenshot({ path: drawerPath2 });
  console.log('Saved Maharaja Drawer Screenshot (Run 2):', drawerPath2);

  await ownerContext2.close();
  await browser.close();

  // Save logs
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'prod_run1_console.log'), ownerConsoleLogs1.join('\n'));
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'prod_run1_realtime.log'), realtimeEvents1.join('\n'));

  console.log('\n=== DOUBLE VERIFICATION COMPLETED ===');
}

main().catch(err => {
  console.error('Fatal error in double verification:', err);
  process.exit(1);
});
