import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'));
  console.log('Logged in as KDS. Attempting direct navigation to /super-admin...');
  await page.goto('https://www.cleverops.in/super-admin');
  await page.waitForTimeout(6000);
  console.log('Final URL after security check:', page.url());
  await browser.close();
}

test().catch(console.error);
