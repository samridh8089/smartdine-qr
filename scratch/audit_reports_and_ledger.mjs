import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  console.log('=== WORKFLOW F: REPORTS & INVENTORY LEDGER AUDIT ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();

  // Login as Owner
  console.log('Logging in as Owner...');
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  // 1. Reports & Analytics
  console.log('Navigating to /dashboard/reports...');
  await page.goto('https://www.cleverops.in/dashboard/reports');
  await page.waitForTimeout(3000);

  const reportScr = path.join(SCRATCH_DIR, 'phase10_step_f_sales_report.png');
  await page.screenshot({ path: reportScr, fullPage: true });
  fs.copyFileSync(reportScr, path.join(ARTIFACTS_DIR, 'phase10_step_f_sales_report.png'));
  console.log('Saved phase10_step_f_sales_report.png');

  // 2. Inventory Transaction Ledger
  console.log('Navigating to /dashboard/inventory (Transaction Ledger)...');
  await page.goto('https://www.cleverops.in/dashboard/inventory');
  await page.waitForSelector('text=Transaction Ledger', { timeout: 15000 });
  await page.click('button:has-text("Transaction Ledger"), [role="tab"]:has-text("Transaction Ledger")');
  await page.waitForTimeout(2000);

  const ledgerScr = path.join(SCRATCH_DIR, 'phase10_step_f_inventory_ledger.png');
  await page.screenshot({ path: ledgerScr, fullPage: true });
  fs.copyFileSync(ledgerScr, path.join(ARTIFACTS_DIR, 'phase10_step_f_inventory_ledger.png'));
  console.log('Saved phase10_step_f_inventory_ledger.png');

  await browser.close();
}

main().catch(console.error);
