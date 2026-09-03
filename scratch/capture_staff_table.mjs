import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function captureStaffTable() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(2000);

  const staffTableScreen = path.join(SCRATCH_DIR, 'phase9a_staff_all_registered.png');
  await page.screenshot({ path: staffTableScreen, fullPage: true });
  fs.copyFileSync(staffTableScreen, path.join(ARTIFACTS_DIR, 'phase9a_staff_all_registered.png'));
  console.log('Saved phase9a_staff_all_registered.png');

  await browser.close();
}

captureStaffTable().catch(console.error);
