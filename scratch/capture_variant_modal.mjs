import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  await page.goto('https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2');
  await page.click('button:has-text("Main Course"), [role="tab"]:has-text("Main Course")');
  await page.waitForSelector('text=Paneer Butter Masala', { timeout: 10000 });

  // Click Customize button
  await page.click('button:has-text("Customize")');
  await page.waitForSelector('text=Half', { timeout: 5000 });
  await page.waitForTimeout(1000);

  const screenPath = path.join(SCRATCH_DIR, 'phase9b_customer_variant_modal.png');
  await page.screenshot({ path: screenPath, fullPage: false });
  fs.copyFileSync(screenPath, path.join(ARTIFACTS_DIR, 'phase9b_customer_variant_modal.png'));
  console.log('Saved phase9b_customer_variant_modal.png');

  await browser.close();
}

main().catch(console.error);
