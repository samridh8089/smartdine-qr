import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://cleverops.in';
const OUTPUT_DIR = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/previews';

async function testRole(email, password, roleName) {
  console.log(`\n========================================`);
  console.log(`TESTING ROLE: ${roleName} (${email})`);
  console.log(`========================================`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();
  await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for login redirect
  console.log('Waiting for post-login navigation...');
  await page.waitForTimeout(5000);
  console.log(`Post-login URL for ${roleName}:`, page.url());

  // Wait until "Loading CleverOps..." disappears
  try {
    await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 15000 });
  } catch (e) {
    console.log('Notice while waiting for loading to finish:', e.message);
  }
  await page.waitForTimeout(2000);

  // Take Main Screen Screenshot
  const mainPath = path.join(OUTPUT_DIR, `${roleName}_01_main.png`);
  await page.screenshot({ path: mainPath });
  console.log(`Captured main screen: ${mainPath}`);

  // Open Drawer by clicking hamburger
  const opened = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Open sidebar"]') ||
                document.querySelector('header button');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  if (opened) {
    console.log('Hamburger clicked, waiting for drawer slide animation...');
    await page.waitForTimeout(1000);
    const drawerPath = path.join(OUTPUT_DIR, `${roleName}_02_drawer.png`);
    await page.screenshot({ path: drawerPath });
    console.log(`Captured drawer screen: ${drawerPath}`);
  } else {
    console.log('Could not find hamburger button!');
  }

  await browser.close();
}

async function main() {
  await testRole('manager@bistro.local', '123456', 'manager');
  await testRole('headchef@bistro.local', '123456', 'kitchen');
  await testRole('waiter@bistro.local', '123456', 'waiter');
  await testRole('cashier@bistro.local', '123456', 'cashier');
}

main().catch(console.error);
