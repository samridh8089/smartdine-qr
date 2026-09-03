import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

const accounts = [
  { role: 'kitchen', email: 'newlifeofdeepsssa@gmail.com', pass: 'FoodyHub@Kds2026!', file: 'phase9a_portal_kitchen_kds.png' },
  { role: 'waiter', email: 'samridhtomar8@gmail.com', pass: 'FoodyHub@W1_2026!', file: 'phase9a_portal_waiter.png' },
  { role: 'cashier', email: 'deepak.soni19492@gmail.com', pass: 'FoodyHub@Cash2026!', file: 'phase9a_portal_cashier.png' }
];

async function testPortals() {
  const browser = await chromium.launch({ headless: true });

  for (const acc of accounts) {
    console.log(`\nTesting login for ${acc.role} (${acc.email})...`);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto('https://www.cleverops.in/login');
    await page.waitForSelector('input[type="email"]');
    await page.fill('input[type="email"]', acc.email);
    await page.fill('input[type="password"]', acc.pass);
    await page.click('button[type="submit"]');

    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    console.log(`Successfully logged in as ${acc.role}! Landed on: ${page.url()}`);
    await page.waitForTimeout(2000);

    const outPath = path.join(SCRATCH_DIR, acc.file);
    await page.screenshot({ path: outPath, fullPage: true });
    fs.copyFileSync(outPath, path.join(ARTIFACTS_DIR, acc.file));
    console.log(`Saved screenshot: ${acc.file}`);

    await context.close();
  }

  await browser.close();
}

testPortals().catch(console.error);
