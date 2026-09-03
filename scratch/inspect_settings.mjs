import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function inspectSettings() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in as Owner...');
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  console.log('Navigating to /dashboard/settings...');
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.waitForTimeout(1500);

  // Tab 1: Profile
  const profileScreenPath = path.join(SCRATCH_DIR, 'phase9a_settings_profile.png');
  await page.screenshot({ path: profileScreenPath, fullPage: true });
  fs.copyFileSync(profileScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_settings_profile.png'));
  console.log('Saved phase9a_settings_profile.png');

  // Tab 2: Charges / GST
  await page.click('button:has-text("Charges"), [role="tab"]:has-text("Charges"), button:has-text("Taxes")');
  await page.waitForTimeout(1000);
  const chargesScreenPath = path.join(SCRATCH_DIR, 'phase9a_settings_charges.png');
  await page.screenshot({ path: chargesScreenPath, fullPage: true });
  fs.copyFileSync(chargesScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_settings_charges.png'));
  console.log('Saved phase9a_settings_charges.png');

  // Tab 3: Payments / UPI
  await page.click('button:has-text("Payments"), [role="tab"]:has-text("Payments")');
  await page.waitForTimeout(1000);
  const paymentsScreenPath = path.join(SCRATCH_DIR, 'phase9a_settings_payments.png');
  await page.screenshot({ path: paymentsScreenPath, fullPage: true });
  fs.copyFileSync(paymentsScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_settings_payments.png'));
  console.log('Saved phase9a_settings_payments.png');

  // Tab 4: Staff
  await page.click('button:has-text("Staff"), [role="tab"]:has-text("Staff")');
  await page.waitForTimeout(1000);
  const staffScreenPath = path.join(SCRATCH_DIR, 'phase9a_settings_staff.png');
  await page.screenshot({ path: staffScreenPath, fullPage: true });
  fs.copyFileSync(staffScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_settings_staff.png'));
  console.log('Saved phase9a_settings_staff.png');

  await browser.close();
}

inspectSettings().catch(console.error);
