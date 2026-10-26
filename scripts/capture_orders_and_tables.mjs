import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://cleverops.in';
const OUTPUT_DIR = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/previews';

async function captureOrders() {
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
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(2000);

  // Login as manager
  await page.fill('input[type="email"]', 'manager@bistro.local');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');

  await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 15000 });
  
  // Wait until dashboard is completely loaded
  await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 20000 });
  await page.waitForTimeout(2000);

  // Open Live Orders via click
  console.log('Navigating to Live Orders via in-app click...');
  // Open drawer
  const burger = await page.$('button[aria-label="Open sidebar"]');
  if (burger) await burger.click();
  await page.waitForTimeout(800);

  // Click Live Orders in drawer
  await page.click('a[href="/dashboard/orders"]');
  await page.waitForTimeout(1000);

  console.log('Waiting for Live Orders content to load...');
  await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 20000 });
  await page.waitForTimeout(3000);

  const ordersImg = path.join(OUTPUT_DIR, '14_live_orders_view.png');
  await page.screenshot({ path: ordersImg });
  console.log('[PASS] Saved 14_live_orders_view.png');

  // Navigate to Tables & QRs
  console.log('Navigating to Tables...');
  const burger2 = await page.$('button[aria-label="Open sidebar"]');
  if (burger2) await burger2.click();
  await page.waitForTimeout(800);

  await page.click('a[href="/dashboard/tables"]');
  await page.waitForTimeout(1000);
  await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 20000 });
  await page.waitForTimeout(3000);

  const tablesImg = path.join(OUTPUT_DIR, '15_tables_view.png');
  await page.screenshot({ path: tablesImg });
  console.log('[PASS] Saved 15_tables_view.png');

  await browser.close();
}

captureOrders().catch(console.error);
