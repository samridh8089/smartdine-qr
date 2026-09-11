import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS = 'C:/Users/admin/.gemini/antigravity/brain/ae77057e-5d8c-4a8f-bb99-144b6e792b0e';
const BASE_URL = 'https://www.cleverops.in';
const CHROME = 'C:/Users/admin/.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe';
const EMAIL = 'dsoni1281@gmail.com';
const PASS  = '123456';

async function main() {
  console.log('=== VERIFYING NEW BROADCAST BANNER ===');

  const vr = await fetch(`${BASE_URL}/api/version`);
  const vj = await vr.json();
  console.log('Production commit:', vj.commit);

  // Dispatch "Hello" broadcast (testing user's exact message)
  console.log('Dispatching "Hello" broadcast...');
  const bRes = await fetch(`${BASE_URL}/api/admin/bulk-operations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'broadcast',
      restaurantIds: ['81fa8201-51d7-4da5-98f5-a52dbff4e6ae'],
      payload: {
        message: 'Hello'
      }
    })
  });
  const bJson = await bRes.json();
  console.log('Broadcast API response:', bJson);

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  console.log('Logging in as owner...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  console.log('After login URL:', page.url());


  // Capture Owner Dashboard in Light Mode
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  const shotLight = path.join(ARTIFACTS, 'proof_broadcast_clean_light.png');
  await page.screenshot({ path: shotLight, fullPage: false });
  console.log('Captured proof_broadcast_clean_light.png');

  await browser.close();
  console.log('=== TEST FINISHED SUCCESSFULLY ===');
}

main().catch(e => { console.error(e); process.exit(1); });


