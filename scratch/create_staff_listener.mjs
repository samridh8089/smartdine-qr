import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function createStaffWithListener() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('response', async res => {
    if (res.url().includes('/api/staff')) {
      console.log(`[STAFF API RESPONSE] ${res.status()}: ${res.url()}`);
      try {
        const json = await res.json();
        console.log('Response body:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Response text:', await res.text());
      }
    }
  });

  page.on('dialog', async d => {
    console.log('[Browser Alert Dialog]:', d.message());
    await d.accept();
  });

  // Login as Owner
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  // Go to Settings -> Staff
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(1000);

  // Fill staff form
  console.log('Filling staff form for Kitchen...');
  const form = page.locator('form:has-text("Register Staff Login"), form:has-text("Staff Full Name")');
  await form.locator('input[placeholder="e.g. Rahul Sharma"]').fill('Nakshatra Kitchen');
  await form.locator('input[placeholder="rahul@restaurant.com"]').fill('nakshatra1233@gmail.com');
  await form.locator('input[placeholder="+91 9876543210"]').fill('8949266061');
  await form.locator('input[placeholder="Minimum 6 characters"]').fill('FoodyHub@Kds2026!');
  await form.locator('select').selectOption('kitchen');
  await page.waitForTimeout(500);

  console.log('Clicking Create Staff Profile...');
  await form.locator('button[type="submit"]').click();

  console.log('Waiting for response / OTP dialog (up to 25s)...');
  try {
    await page.waitForSelector('text=Verify Staff Account, [role="dialog"], text=Enter the 8-digit OTP', { timeout: 20000 });
    console.log('OTP DIALOG OPENED!');
  } catch (e) {
    console.log('Dialog did not open in 20s. Checking page state...');
  }

  await page.waitForTimeout(2000);

  const resultScreen = path.join(SCRATCH_DIR, 'phase9a_staff_kitchen_result.png');
  await page.screenshot({ path: resultScreen, fullPage: true });
  fs.copyFileSync(resultScreen, path.join(ARTIFACTS_DIR, 'phase9a_staff_kitchen_result.png'));
  console.log('Saved updated phase9a_staff_kitchen_result.png');

  await browser.close();
}

createStaffWithListener().catch(console.error);
