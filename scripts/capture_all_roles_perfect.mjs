import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://cleverops.in';
const OUTPUT_DIR = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/previews';

async function captureProfile(email, password, roleKey, roleTitle) {
  console.log(`\n========================================`);
  console.log(`STARTING CAPTURE: ${roleTitle} (${email})`);
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

  // Navigate to login
  await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(2500); // Ensure React hydration

  // Type credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.waitForTimeout(500);

  // Click Sign In
  await page.click('button[type="submit"]');

  // Wait for redirect away from /login
  try {
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  } catch (e) {
    console.log(`Waiting for URL timed out, current URL: ${page.url()}`);
  }

  console.log(`Current URL for ${roleTitle}: ${page.url()}`);

  // Wait for loading spinner to disappear
  try {
    await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 15000 });
  } catch (e) {}

  await page.waitForTimeout(2500);

  // Capture Main Screen
  const mainPath = path.join(OUTPUT_DIR, `${roleKey}_01_main.png`);
  await page.screenshot({ path: mainPath });
  console.log(`[PASS] Saved ${roleKey}_01_main.png`);

  // Open Drawer
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
    await page.waitForTimeout(800);
    const drawerPath = path.join(OUTPUT_DIR, `${roleKey}_02_drawer.png`);
    await page.screenshot({ path: drawerPath });
    console.log(`[PASS] Saved ${roleKey}_02_drawer.png`);
  } else {
    console.warn(`[WARN] Could not open drawer for ${roleTitle}`);
  }

  await browser.close();
}

async function runAll() {
  // Waiter
  await captureProfile('waiter@bistro.local', '123456', 'waiter', 'Waiter Profile');
  await new Promise(r => setTimeout(r, 2000));

  // Kitchen / Chef
  await captureProfile('headchef@bistro.local', '123456', 'kitchen', 'Kitchen / KDS Profile');
  await new Promise(r => setTimeout(r, 2000));

  // Cashier
  await captureProfile('cashier@bistro.local', '123456', 'cashier', 'Cashier Profile');
}

runAll().catch(console.error);
