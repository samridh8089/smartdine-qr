const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b2c2e285-1d6c-4421-9a44-cbed460919e6';
const REST_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const TABLE_ID_MAHARAJA = '7bd76bbf-34cf-4ac5-97af-2fac1efad753';
const REST_SLUG = 'foodyhub';

async function main() {
  console.log('=== [PHASE 1] Verify Production Version on cleverops.in ===');
  const verRes = await fetch('https://cleverops.in/api/version', { cache: 'no-store' });
  const verData = await verRes.json();
  console.log('Production Version Info:', JSON.stringify(verData, null, 2));

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Owner logging in...');
  await page.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => u.pathname.includes('/dashboard'), { timeout: 35000, waitUntil: 'domcontentloaded' });
  console.log('Owner logged in!');

  // Place fresh order on Maharaja table as customer to guarantee active order
  console.log('2. Customer placing a fresh order on Maharaja table...');
  const customerContext = await browser.newContext({ viewport: { width: 420, height: 850 } });
  const customerPage = await customerContext.newPage();
  await customerPage.goto(`https://www.cleverops.in/menu/${REST_SLUG}/table/${TABLE_ID_MAHARAJA}`, { waitUntil: 'domcontentloaded' });
  await customerPage.waitForTimeout(3000);

  const addBtn = customerPage.locator('button').filter({ hasText: /Add|\+/i }).first();
  if (await addBtn.count() > 0) {
    await addBtn.click();
    await customerPage.waitForTimeout(1000);
    const viewCartBtn = customerPage.locator('button:has-text("View Cart"), button:has-text("Checkout"), button:has-text("Proceed"), div:has-text("Item Added")').first();
    if (await viewCartBtn.count() > 0) {
      await viewCartBtn.click();
      await customerPage.waitForTimeout(1500);
    }
    const placeOrderBtn = customerPage.locator('button:has-text("Place Order"), button:has-text("Confirm Order"), button:has-text("Send to Kitchen")').first();
    if (await placeOrderBtn.count() > 0) {
      await placeOrderBtn.click();
      await customerPage.waitForTimeout(3000);
      console.log('Order placed successfully!');
    }
  }

  // Go to Floor Layout
  console.log('3. Opening Floor Layout on cleverops.in/dashboard/tables...');
  await page.goto('https://www.cleverops.in/dashboard/tables', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Take screenshot of canvas
  const canvasScreenshotPath = path.join(ARTIFACT_DIR, 'prod_floor_layout_orders_sync.png');
  await page.screenshot({ path: canvasScreenshotPath, fullPage: true });
  console.log('Saved canvas screenshot:', canvasScreenshotPath);

  // Click Maharaja table to open drawer
  console.log('4. Clicking Maharaja table to inspect Drawer...');
  const maharajaCard = page.locator('text=maharaja').first();
  await maharajaCard.click();
  await page.waitForTimeout(2000);

  // Screenshot of Live Session drawer
  const drawerLiveSessionPath = path.join(ARTIFACT_DIR, 'prod_maharaja_drawer_livesession.png');
  await page.screenshot({ path: drawerLiveSessionPath });
  console.log('Saved drawer Live Session screenshot:', drawerLiveSessionPath);

  // Click "Orders" tab in drawer
  console.log('5. Clicking Orders tab in drawer...');
  const ordersTab = page.locator('button:has-text("Orders")').first();
  if (await ordersTab.count() > 0) {
    await ordersTab.click();
    await page.waitForTimeout(2000);

    // Screenshot of Orders tab
    const drawerOrdersTabPath = path.join(ARTIFACT_DIR, 'prod_maharaja_drawer_orders_tab.png');
    await page.screenshot({ path: drawerOrdersTabPath });
    console.log('Saved drawer Orders tab screenshot:', drawerOrdersTabPath);

    // Extract text content of Orders tab
    const ordersContent = await page.locator('div:has-text("Total Bill")').first().innerText();
    console.log('Orders Tab Content:', ordersContent);
  }

  await browser.close();
  console.log('=== VERIFICATION SCRIPT FINISHED ===');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
