import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const PROD_URL = 'https://www.cleverops.in';

async function verifyLiveOwnerReports() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Logging in as Super Admin on live production...');
  await page.goto(`${PROD_URL}/login`);
  await page.fill('input[type="email"]', 'admin@cleverops.in');
  await page.fill('input[type="password"]', 'Admin@12345!');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/super-admin**', { timeout: 25000 });
  console.log('Super Admin dashboard loaded.');

  // Click "Login as Rest" for The Foody Hub
  const row = page.locator('tr:has-text("The Foody Hub")');
  await row.locator('button:has-text("Login as Rest")').click();
  await page.waitForTimeout(4000);

  // Directly navigate to /dashboard/reports
  console.log('Navigating to /dashboard/reports on live production...');
  await page.goto(`${PROD_URL}/dashboard/reports`);
  await page.waitForTimeout(5000);
  console.log('Current URL is:', page.url());
  console.log('Page Title is:', await page.title());
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase17_live_owner_reports_proof.png') });
  console.log('Saved phase17_live_owner_reports_proof.png');

  await browser.close();
}

verifyLiveOwnerReports().catch(console.error);
