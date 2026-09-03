import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';

async function captureOwnerViaSuperAdmin() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in as Super Admin...');
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@cleverops.in');
  await page.fill('input[type="password"]', 'Admin@12345!');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/super-admin**', { timeout: 15000 });
  console.log('Super Admin dashboard loaded.');

  // Click "Login as Rest" for The Foody Hub
  const row = page.locator('tr:has-text("The Foody Hub")');
  await row.locator('button:has-text("Login as Rest")').click();
  await page.waitForTimeout(4000);

  // Directly navigate to /dashboard/reports
  console.log('Navigating to /dashboard/reports...');
  await page.goto('http://localhost:3000/dashboard/reports');
  await page.waitForSelector('text=Analytics & Reports', { timeout: 15000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'after_fix2_owner_reports.png') });
  console.log('Saved after_fix2_owner_reports.png');

  await browser.close();
}

captureOwnerViaSuperAdmin().catch(console.error);
