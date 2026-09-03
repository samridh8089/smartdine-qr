import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  await page.goto('https://www.cleverops.in/menu/nonexistent-invalid-restaurant/table/invalid-table');
  await page.waitForSelector('text=Restaurant Not Found', { timeout: 15000 });
  await page.waitForTimeout(1000);

  const out = path.join(SCRATCH_DIR, 'phase9a_task3_invalid_table_qr.png');
  await page.screenshot({ path: out, fullPage: true });
  fs.copyFileSync(out, path.join(ARTIFACTS_DIR, 'phase9a_task3_invalid_table_qr.png'));
  console.log('Saved phase9a_task3_invalid_table_qr.png');

  await browser.close();
}

main().catch(console.error);
