import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://cleverops.in';
const OUTPUT_DIR = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/previews';

async function captureWaiterLive() {
  console.log('Capturing Waiter Live Orders with loaded state...');
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

  await page.fill('input[type="email"]', 'waiter@bistro.local');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');

  await page.waitForURL(url => url.pathname.includes('/orders'), { timeout: 20000 });
  console.log('Navigated to:', page.url());

  // Wait for orders content to load (wait for "Live Orders" tab or text)
  await page.waitForSelector('h1, h2, div', { state: 'visible' });
  await page.waitForTimeout(4000); // allow Supabase fetch to populate orders

  const ordersPath = path.join(OUTPUT_DIR, 'waiter_01_orders_live.png');
  await page.screenshot({ path: ordersPath });
  console.log('Saved loaded Waiter Live Orders:', ordersPath);

  await browser.close();
}

captureWaiterLive().catch(console.error);
