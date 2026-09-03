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

  // Navigate to Billing
  await page.goto('https://www.cleverops.in/dashboard/billing');
  await page.waitForTimeout(5000);

  const billingScr = path.join(SCRATCH_DIR, 'phase9a_task2_billing_plan.png');
  await page.screenshot({ path: billingScr, fullPage: true });
  fs.copyFileSync(billingScr, path.join(ARTIFACTS_DIR, 'phase9a_task2_billing_plan.png'));
  console.log('Saved phase9a_task2_billing_plan.png');

  // Navigate to Settings to see plan info
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForTimeout(3000);

  const settingsScr = path.join(SCRATCH_DIR, 'phase9a_task2_settings_plan.png');
  await page.screenshot({ path: settingsScr, fullPage: true });
  fs.copyFileSync(settingsScr, path.join(ARTIFACTS_DIR, 'phase9a_task2_settings_plan.png'));
  console.log('Saved phase9a_task2_settings_plan.png');

  await browser.close();
}

main().catch(console.error);
