import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function openStaffOtpModal() {
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
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(1500);

  // Take screenshot of staff accounts list showing Nakshatra Kitchen
  const listScreen = path.join(SCRATCH_DIR, 'phase9a_staff_list_with_kitchen.png');
  await page.screenshot({ path: listScreen, fullPage: true });
  fs.copyFileSync(listScreen, path.join(ARTIFACTS_DIR, 'phase9a_staff_list_with_kitchen.png'));
  console.log('Saved phase9a_staff_list_with_kitchen.png');

  // Click "Verify OTP →"
  console.log('Clicking "Verify OTP →" button...');
  const verifyBtn = page.locator('button:has-text("Verify OTP →")').first();
  await verifyBtn.click();
  await page.waitForTimeout(1500);

  // Take screenshot of OTP modal
  const otpModalScreen = path.join(SCRATCH_DIR, 'phase9a_staff_otp_modal.png');
  await page.screenshot({ path: otpModalScreen, fullPage: true });
  fs.copyFileSync(otpModalScreen, path.join(ARTIFACTS_DIR, 'phase9a_staff_otp_modal.png'));
  console.log('Saved phase9a_staff_otp_modal.png');

  await browser.close();
}

openStaffOtpModal().catch(console.error);
