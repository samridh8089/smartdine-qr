import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function captureTables() {
  console.log('Testing Owner login and capturing /dashboard/tables...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://www.cleverops.in/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  console.log('Logged in! Current URL:', page.url());

  await page.goto('https://www.cleverops.in/dashboard/tables');
  console.log('Navigated to /dashboard/tables. Waiting for tables to load...');
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const outPath = path.join(SCRATCH_DIR, 'phase9a_step4_tables_all_20.png');
  await page.screenshot({ path: outPath, fullPage: true });
  fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, 'phase9a_step4_tables_all_20.png'));
  console.log('Saved phase9a_step4_tables_all_20.png successfully!');

  await browser.close();
}

captureTables().catch(console.error);
