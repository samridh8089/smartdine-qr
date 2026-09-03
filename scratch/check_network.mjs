import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log('HTTP ERROR:', res.status(), res.url());
    }
  });

  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'admin@cleverops.in');
  await page.fill('input[type="password"]', 'Admin@12345!');
  await Promise.all([
    page.waitForURL('**/super-admin**'),
    page.click('button[type="submit"]')
  ]);
  await page.waitForTimeout(3000);
  await browser.close();
}

check();
