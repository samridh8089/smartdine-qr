import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', m => console.log('LOGIN CONSOLE:', m.text()));
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');

  // Wait for login to complete
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 15000 });
  console.log('Successfully navigated to:', page.url());

  await page.goto('https://www.cleverops.in/dashboard/reports');
  await page.waitForSelector('text=GROSS SALES', { timeout: 15000 });
  console.log('Reports page loaded successfully!');

  await page.screenshot({ path: 'scratch/owner_reports_success.png' });
  await browser.close();
})();
