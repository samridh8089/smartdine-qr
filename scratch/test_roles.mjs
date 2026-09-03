import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'samridhtomar8@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@W1_2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'));
  console.log('Logged in as Waiter. Current URL:', page.url());

  // Let's inspect active profile and role from React / LocalStorage
  const authInfo = await page.evaluate(() => {
    return {
      sessionUser: localStorage.getItem('smartdine_auth_token_v2'),
      bodyText: document.body.innerText.slice(0, 300)
    };
  });
  console.log('Auth info on orders:', authInfo);

  // Now try going to /dashboard/reports
  await page.goto('https://www.cleverops.in/dashboard/reports');
  await page.waitForTimeout(5000);
  console.log('URL after goto reports:', page.url());
  const reportsBody = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('Body on reports:', reportsBody);

  await browser.close();
})();
