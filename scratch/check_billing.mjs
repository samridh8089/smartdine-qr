import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  await page.goto('https://www.cleverops.in/dashboard/billing');
  await page.waitForTimeout(2500);

  const billingPath = path.join(SCRATCH_DIR, 'phase9a_billing_screen.png');
  await page.screenshot({ path: billingPath, fullPage: true });
  fs.copyFileSync(billingPath, path.join(ARTIFACTS_DIR, 'phase9a_billing_screen.png'));
  console.log('Saved phase9a_billing_screen.png');

  await browser.close();
}

main().catch(console.error);
