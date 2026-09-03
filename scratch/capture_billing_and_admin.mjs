import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as Owner
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  // 1. Billing Page fully loaded
  await page.goto('https://www.cleverops.in/dashboard/billing');
  await page.waitForSelector('text=Premium, text=PREMIUM, text=Active Plan, text=Billing', { timeout: 15000 });
  await page.waitForTimeout(3000);

  const billingScr = path.join(SCRATCH_DIR, 'phase9a_task2_billing_plan.png');
  await page.screenshot({ path: billingScr, fullPage: true });
  fs.copyFileSync(billingScr, path.join(ARTIFACTS_DIR, 'phase9a_task2_billing_plan.png'));
  console.log('Saved loaded phase9a_task2_billing_plan.png');

  // 2. Super Admin view (if accessible by admin/owner)
  await page.goto('https://www.cleverops.in/super-admin');
  await page.waitForTimeout(3000);
  const saScr = path.join(SCRATCH_DIR, 'phase9a_task2_super_admin.png');
  await page.screenshot({ path: saScr, fullPage: true });
  fs.copyFileSync(saScr, path.join(ARTIFACTS_DIR, 'phase9a_task2_super_admin.png'));
  console.log('Saved phase9a_task2_super_admin.png');

  await browser.close();
}

main().catch(console.error);
