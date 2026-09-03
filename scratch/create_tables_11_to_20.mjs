import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function createTables() {
  console.log('=== CREATING TABLES 11 TO 20 ON THE FOODY HUB ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async d => {
    console.log('[Dialog]:', d.message());
    await d.accept();
  });

  // Login as Owner
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  await page.goto('https://www.cleverops.in/dashboard/tables');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.waitForTimeout(1000);

  for (let i = 11; i <= 20; i++) {
    console.log(`Creating Table ${i}...`);

    // Click "Add Table" in header
    await page.click('button:has-text("Add Table")');
    await page.waitForSelector('text=Add New Table', { timeout: 5000 });

    // Press Enter to submit the modal form
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1200);
  }

  // Refresh and capture screenshot of all 20 tables
  console.log('Reloading tables page to capture full 20 tables view...');
  await page.goto('https://www.cleverops.in/dashboard/tables');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.waitForTimeout(2500);

  const outScreen = path.join(SCRATCH_DIR, 'phase9a_step4_tables_all_20.png');
  await page.screenshot({ path: outScreen, fullPage: true });
  fs.copyFileSync(outScreen, path.join(ARTIFACTS_DIR, 'phase9a_step4_tables_all_20.png'));
  console.log('Saved phase9a_step4_tables_all_20.png');

  await browser.close();
}

createTables().catch(console.error);
