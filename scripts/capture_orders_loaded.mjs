import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const PROD_URL = 'https://cleverops.in';
const OUTPUT_DIR = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/previews';

async function captureOrdersFullyLoaded() {
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

  // Login as manager to have full restaurant loaded
  await page.fill('input[type="email"]', 'manager@bistro.local');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  console.log('Logged in! Navigating to /dashboard/orders...');
  await page.goto(`${PROD_URL}/dashboard/orders`, { waitUntil: 'domcontentloaded' });

  console.log('Waiting for skeleton to detach...');
  try {
    await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 20000 });
  } catch (e) {
    console.log('Skeleton wait note:', e.message);
  }
  await page.waitForTimeout(3000);

  const outPath = path.join(OUTPUT_DIR, 'live_orders_fully_loaded.png');
  await page.screenshot({ path: outPath });
  console.log('Saved loaded Live Orders to:', outPath);

  // Waiter login
  console.log('Logging in as waiter...');
  const waiterPage = await context.newPage();
  await waiterPage.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
  await waiterPage.waitForSelector('input[type="email"]');
  await waiterPage.waitForTimeout(1500);
  await waiterPage.fill('input[type="email"]', 'waiter@bistro.local');
  await waiterPage.fill('input[type="password"]', '123456');
  await waiterPage.click('button[type="submit"]');
  await waiterPage.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  
  if (!waiterPage.url().includes('/orders')) {
    await waiterPage.goto(`${PROD_URL}/dashboard/orders`, { waitUntil: 'domcontentloaded' });
  }

  try {
    await waiterPage.waitForSelector('.animate-pulse', { state: 'detached', timeout: 20000 });
  } catch (e) {}
  await waiterPage.waitForTimeout(3000);

  const waiterOut = path.join(OUTPUT_DIR, 'waiter_orders_fully_loaded.png');
  await waiterPage.screenshot({ path: waiterOut });
  console.log('Saved Waiter loaded orders to:', waiterOut);

  await browser.close();
}

captureOrdersFullyLoaded().catch(console.error);
