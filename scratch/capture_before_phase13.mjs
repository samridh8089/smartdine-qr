import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const validOrderId = 'dd61bc33-dce5-4d00-adeb-ce7849463bd4';
const fakeOrderId = '00000000-0000-0000-0000-000000000000';

async function captureBefore() {
  console.log('Capturing BEFORE screenshots...');
  const browser = await chromium.launch({ headless: true });

  // 1. Valid Order Desktop Before
  const dPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await dPage.goto(`https://www.cleverops.in/order-tracking/${validOrderId}`);
  await dPage.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await dPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'before_fix1_tracking_desktop.png') });
  console.log('Saved before_fix1_tracking_desktop.png');

  // 2. Fake Order Before
  const fPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fPage.goto(`https://www.cleverops.in/order-tracking/${fakeOrderId}`);
  await fPage.waitForSelector('text=Order Not Found', { timeout: 15000 });
  await fPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'before_fix1_not_found.png') });
  console.log('Saved before_fix1_not_found.png');

  await browser.close();
  console.log('BEFORE capture complete.');
}

captureBefore().catch(console.error);
