import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();

  // Login as Owner
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  // 1. Dashboard Overview
  await page.goto('https://www.cleverops.in/dashboard');
  await page.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await page.waitForTimeout(3000);

  const overviewScr = path.join(SCRATCH_DIR, 'phase10_step_f_owner_overview.png');
  await page.screenshot({ path: overviewScr, fullPage: true });
  fs.copyFileSync(overviewScr, path.join(ARTIFACTS_DIR, 'phase10_step_f_owner_overview.png'));
  console.log('Saved phase10_step_f_owner_overview.png');

  // 2. Reports & Analytics
  await page.goto('https://www.cleverops.in/dashboard/reports');
  await page.waitForSelector('text=Revenue, text=Sales, text=Average Order', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const reportScr = path.join(SCRATCH_DIR, 'phase10_step_f_sales_report.png');
  await page.screenshot({ path: reportScr, fullPage: true });
  fs.copyFileSync(reportScr, path.join(ARTIFACTS_DIR, 'phase10_step_f_sales_report.png'));
  console.log('Saved phase10_step_f_sales_report.png');

  await browser.close();
}

main().catch(console.error);
