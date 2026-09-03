import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@cleverops.in');
  await page.fill('input[type="password"]', 'Admin@12345!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/super-admin**');

  await page.goto('http://localhost:3000/dashboard/reports', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Analytics & Reports', { timeout: 20000 });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'after_fix2_owner_reports.png') });
  console.log('Saved after_fix2_owner_reports.png');
  await browser.close();
}

main().catch(console.error);
