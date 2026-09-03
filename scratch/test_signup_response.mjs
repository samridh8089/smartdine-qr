import { chromium } from 'playwright';

async function testSignupResponse() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('response', async res => {
    if (res.url().includes('/api/auth/onboarding-provision')) {
      console.log('--- ONBOARDING PROVISION RESPONSE ---');
      console.log('Status:', res.status());
      try {
        const json = await res.json();
        console.log('Response JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Response text:', await res.text());
      }
    }
  });

  await page.goto('https://www.cleverops.in/signup?plan=trial', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[placeholder="John Doe"]');

  await page.fill('input[placeholder="John Doe"]', 'Deepak Soni');
  await page.fill('input[placeholder="you@example.com"]', 'dsoni1281@gmail.com');
  await page.fill('input[placeholder="e.g. +91 99999 88888"]', '8949266064');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.fill('input[placeholder="The Bistro Cafe"]', 'The Foody Hub');
  await page.fill('input[placeholder="bistro-cafe"]', 'foodyhub');

  console.log('Clicking Submit button...');
  await page.click('button[type="submit"]');

  console.log('Waiting for network or navigation (up to 30s)...');
  try {
    await page.waitForURL('**/dashboard**', { timeout: 25000 });
    console.log('SUCCESS! Navigated to:', page.url());
  } catch (err) {
    console.log('Timed out waiting for dashboard. Current URL:', page.url());
    const errorEl = await page.$('.bg-red-50, .text-red-600, .text-red-500');
    if (errorEl) {
      console.log('Error banner text:', await errorEl.innerText());
    }
  }

  await browser.close();
}

testSignupResponse();
