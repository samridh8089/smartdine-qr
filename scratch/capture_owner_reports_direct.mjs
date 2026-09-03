import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // First navigate to set sessionStorage
  await page.goto('http://localhost:3000/login');
  await page.evaluate(() => {
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify({
      id: '311a8235-14ea-400e-9188-3b6b54edd31f',
      role: 'owner',
      restaurant_id: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae',
      full_name: 'Deepak Soni',
      email: 'dsoni1281@gmail.com'
    }));
  });

  console.log('Navigating to /dashboard/reports with owner profile in sessionStorage...');
  await page.goto('http://localhost:3000/dashboard/reports');
  await page.waitForSelector('text=Analytics & Reports', { timeout: 15000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'after_fix2_owner_reports.png') });
  console.log('Successfully saved after_fix2_owner_reports.png');

  await browser.close();
}

main().catch(console.error);
