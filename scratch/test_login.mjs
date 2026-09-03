import { chromium } from 'playwright';

async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', res => {
    if (res.url().includes('auth') || res.status() >= 400) {
      console.log(`[Response] ${res.status()}: ${res.url()}`);
    }
  });

  console.log('Visiting /login...');
  await page.goto('https://www.cleverops.in/login');
  await page.waitForSelector('input[type="email"]');

  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');

  console.log('Submitted. Waiting 6 seconds...');
  await page.waitForTimeout(6000);

  console.log('Current URL:', page.url());
  await page.screenshot({ path: 'scratch/login_test.png' });

  const err = await page.$('.bg-red-50, .text-red-600, .text-red-500, [role="alert"]');
  if (err) console.log('Error text:', await err.innerText());

  await browser.close();
}

testLogin().catch(console.error);
