import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';

async function captureOwnerReports() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in as Owner...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
  console.log('Logged in successfully. Navigating to Reports & Analytics...');

  await page.goto('http://localhost:3000/dashboard/reports');
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'after_fix2_owner_reports.png') });
  console.log('Saved after_fix2_owner_reports.png');

  await browser.close();
}

captureOwnerReports().catch(console.error);
