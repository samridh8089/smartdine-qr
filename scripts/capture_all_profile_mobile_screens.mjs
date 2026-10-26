import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://cleverops.in';
const OUTPUT_DIR = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/previews';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('=== STARTING MOBILE PREVIEWS CAPTURE ===');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  
  const mobileOptions = {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  };

  // Helper to open hamburger menu
  async function openDrawer(page) {
    try {
      const clicked = await page.evaluate(() => {
        // Look for header button with svg or hamburger icon
        const btns = Array.from(document.querySelectorAll('header button, nav button, button'));
        for (const b of btns) {
          const svg = b.querySelector('svg');
          if (svg || b.getAttribute('aria-label')?.includes('menu') || b.getAttribute('aria-label')?.includes('sidebar')) {
            b.click();
            return true;
          }
        }
        return false;
      });
      await page.waitForTimeout(1000);
      return clicked;
    } catch (e) {
      console.log('Open drawer error:', e.message);
      return false;
    }
  }

  // -------------------------------------------------------------
  // 1. OWNER PROFILE (via direct login as manager or super admin switch)
  // -------------------------------------------------------------
  console.log('\n--- 1. CAPTURING OWNER SCREENS ---');
  const ownerCtx = await browser.newContext(mobileOptions);
  const ownerPage = await ownerCtx.newPage();
  
  await ownerPage.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await ownerPage.waitForTimeout(2000);
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', '123456');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForTimeout(4000);
  console.log('After login URL:', ownerPage.url());

  if (ownerPage.url().includes('/super-admin')) {
    console.log('Super admin detected, clicking Open Owner Portal...');
    await ownerPage.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ownerBtn = btns.find(b => b.textContent.includes('Open Owner Portal') || b.textContent.includes('Impersonate'));
      if (ownerBtn) ownerBtn.click();
    });
    await ownerPage.waitForTimeout(4000);
    console.log('Current URL after impersonation:', ownerPage.url());
  }

  console.log('Capturing Owner Dashboard...');
  await ownerPage.screenshot({ path: path.join(OUTPUT_DIR, '02_owner_dashboard.png') });
  
  console.log('Opening Owner Drawer...');
  await openDrawer(ownerPage);
  await ownerPage.screenshot({ path: path.join(OUTPUT_DIR, '03_owner_drawer.png') });

  // Close drawer
  await ownerPage.keyboard.press('Escape');
  await ownerPage.waitForTimeout(600);

  // Capture Owner Menu Management
  console.log('Capturing Owner Menu Management...');
  await ownerPage.goto(`${PROD_URL}/dashboard/menu`, { waitUntil: 'domcontentloaded' });
  await ownerPage.waitForTimeout(2500);
  await ownerPage.screenshot({ path: path.join(OUTPUT_DIR, '04_owner_menu.png') });

  // Capture Owner Inventory
  console.log('Capturing Owner Inventory & Recipes...');
  await ownerPage.goto(`${PROD_URL}/dashboard/inventory`, { waitUntil: 'domcontentloaded' });
  await ownerPage.waitForTimeout(2500);
  await ownerPage.screenshot({ path: path.join(OUTPUT_DIR, '05_owner_inventory.png') });

  await ownerCtx.close();

  // -------------------------------------------------------------
  // 2. KITCHEN / HEAD CHEF PROFILE
  // -------------------------------------------------------------
  console.log('\n--- 2. CAPTURING KITCHEN / KDS SCREENS ---');
  const kitchenCtx = await browser.newContext(mobileOptions);
  const kitchenPage = await kitchenCtx.newPage();

  await kitchenPage.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await kitchenPage.waitForTimeout(2000);
  await kitchenPage.fill('input[type="email"]', 'headchef@bistro.local');
  await kitchenPage.fill('input[type="password"]', '123456');
  await kitchenPage.click('button[type="submit"]');
  await kitchenPage.waitForTimeout(4000);
  console.log('Kitchen URL:', kitchenPage.url());

  if (!kitchenPage.url().includes('/kds')) {
    await kitchenPage.goto(`${PROD_URL}/dashboard/kds`, { waitUntil: 'domcontentloaded' });
    await kitchenPage.waitForTimeout(3000);
  }

  console.log('Capturing Kitchen KDS Display...');
  await kitchenPage.screenshot({ path: path.join(OUTPUT_DIR, '06_kitchen_kds.png') });

  console.log('Opening Kitchen Drawer...');
  await openDrawer(kitchenPage);
  await kitchenPage.screenshot({ path: path.join(OUTPUT_DIR, '07_kitchen_drawer.png') });

  await kitchenCtx.close();

  // -------------------------------------------------------------
  // 3. WAITER PROFILE
  // -------------------------------------------------------------
  console.log('\n--- 3. CAPTURING WAITER SCREENS ---');
  const waiterCtx = await browser.newContext(mobileOptions);
  const waiterPage = await waiterCtx.newPage();

  await waiterPage.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await waiterPage.waitForTimeout(2000);
  await waiterPage.fill('input[type="email"]', 'waiter@bistro.local');
  await waiterPage.fill('input[type="password"]', '123456');
  await waiterPage.click('button[type="submit"]');
  await waiterPage.waitForTimeout(4000);
  console.log('Waiter URL:', waiterPage.url());

  if (!waiterPage.url().includes('/orders')) {
    await waiterPage.goto(`${PROD_URL}/dashboard/orders`, { waitUntil: 'domcontentloaded' });
    await waiterPage.waitForTimeout(3000);
  }

  console.log('Capturing Waiter Live Orders...');
  await waiterPage.screenshot({ path: path.join(OUTPUT_DIR, '08_waiter_orders.png') });

  console.log('Opening Waiter Drawer...');
  await openDrawer(waiterPage);
  await waiterPage.screenshot({ path: path.join(OUTPUT_DIR, '09_waiter_drawer.png') });

  await waiterCtx.close();

  // -------------------------------------------------------------
  // 4. CASHIER PROFILE
  // -------------------------------------------------------------
  console.log('\n--- 4. CAPTURING CASHIER SCREENS ---');
  const cashierCtx = await browser.newContext(mobileOptions);
  const cashierPage = await cashierCtx.newPage();

  await cashierPage.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await cashierPage.waitForTimeout(2000);
  await cashierPage.fill('input[type="email"]', 'cashier@bistro.local');
  await cashierPage.fill('input[type="password"]', '123456');
  await cashierPage.click('button[type="submit"]');
  await cashierPage.waitForTimeout(4000);
  console.log('Cashier URL:', cashierPage.url());

  if (!cashierPage.url().includes('/orders')) {
    await cashierPage.goto(`${PROD_URL}/dashboard/orders`, { waitUntil: 'domcontentloaded' });
    await cashierPage.waitForTimeout(3000);
  }

  console.log('Capturing Cashier Billing & Orders...');
  await cashierPage.screenshot({ path: path.join(OUTPUT_DIR, '10_cashier_orders.png') });

  console.log('Opening Cashier Drawer...');
  await openDrawer(cashierPage);
  await cashierPage.screenshot({ path: path.join(OUTPUT_DIR, '11_cashier_drawer.png') });

  await cashierCtx.close();

  // -------------------------------------------------------------
  // 5. MANAGER PROFILE
  // -------------------------------------------------------------
  console.log('\n--- 5. CAPTURING MANAGER SCREENS ---');
  const managerCtx = await browser.newContext(mobileOptions);
  const managerPage = await managerCtx.newPage();

  await managerPage.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await managerPage.waitForTimeout(2000);
  await managerPage.fill('input[type="email"]', 'manager@bistro.local');
  await managerPage.fill('input[type="password"]', '123456');
  await managerPage.click('button[type="submit"]');
  await managerPage.waitForTimeout(4000);
  console.log('Manager URL:', managerPage.url());

  if (!managerPage.url().includes('/dashboard')) {
    await managerPage.goto(`${PROD_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await managerPage.waitForTimeout(3000);
  }

  console.log('Capturing Manager Dashboard...');
  await managerPage.screenshot({ path: path.join(OUTPUT_DIR, '12_manager_dashboard.png') });

  console.log('Opening Manager Drawer...');
  await openDrawer(managerPage);
  await managerPage.screenshot({ path: path.join(OUTPUT_DIR, '13_manager_drawer.png') });

  await managerCtx.close();

  await browser.close();
  console.log('\n=== ALL SCREENS CAPTURED SUCCESSFULLY! ===');
}

run().catch(err => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
