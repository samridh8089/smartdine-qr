import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  const url = 'https://www.cleverops.in/order-tracking/63d78fb9-b150-447d-b510-395177bf0863';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const out = path.join(SCRATCH_DIR, 'phase10_step_a_order_tracking.png');
  await page.screenshot({ path: out, fullPage: true });
  fs.copyFileSync(out, path.join(ARTIFACTS_DIR, 'phase10_step_a_order_tracking.png'));
  console.log('Saved phase10_step_a_order_tracking.png');

  await browser.close();
}

main().catch(console.error);
