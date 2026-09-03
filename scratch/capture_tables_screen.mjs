import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function captureTables() {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await context.newPage();

  console.log('Navigating to /login...');
  await page.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  console.log('Submitted login. Waiting for dashboard navigation...');

  await page.waitForURL('**/dashboard**', { timeout: 20000 });
  console.log('Navigated to dashboard. Going to /dashboard/tables...');

  await page.goto('https://www.cleverops.in/dashboard/tables', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Total Tables', { timeout: 20000 });
  await page.waitForSelector('text=Table 1', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const outPath = path.join(SCRATCH_DIR, 'phase9a_step4_tables_all_20.png');
  await page.screenshot({ path: outPath, fullPage: true });
  fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'phase9a_step4_tables_all_20.png'));
  console.log('Saved phase9a_step4_tables_all_20.png');

  await browser.close();
}

captureTables().catch(console.error);
