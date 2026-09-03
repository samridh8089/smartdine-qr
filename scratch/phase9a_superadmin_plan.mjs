import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function updatePlanViaSuperAdmin() {
  console.log('=== LOGGING IN AS SUPER ADMIN TO UPDATE THE FOODY HUB PLAN TO PRO ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Handle native window.alert dialogs automatically
  page.on('dialog', async dialog => {
    console.log('[SuperAdmin Dialog]:', dialog.message());
    await dialog.accept();
  });

  await page.goto('https://www.cleverops.in/login');
  await page.waitForSelector('input[type="email"]');

  await page.fill('input[type="email"]', 'admin@cleverops.in');
  await page.fill('input[type="password"]', 'Admin@12345!');
  await page.click('button[type="submit"]');

  console.log('Waiting for /super-admin navigation...');
  await page.waitForURL('**/super-admin**', { timeout: 20000 });

  console.log('Waiting for admin data to load...');
  await page.waitForSelector('text=Opening Admin Console...', { state: 'detached', timeout: 20000 });
  await page.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Take screenshot of Super Admin dashboard
  const saScreenPath = path.join(SCRATCH_DIR, 'phase9a_super_admin_foodyhub.png');
  await page.screenshot({ path: saScreenPath, fullPage: true });
  fs.copyFileSync(saScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_super_admin_foodyhub.png'));
  console.log('Saved phase9a_super_admin_foodyhub.png');

  // Find row with "The Foody Hub" and click Modify button
  console.log('Finding Modify button for The Foody Hub...');
  const row = page.locator('tr:has-text("The Foody Hub")');
  await row.locator('button:has-text("Modify")').click();

  console.log('Waiting for Modify Subscription dialog...');
  await page.waitForSelector('text=Modify Subscription: The Foody Hub', { timeout: 10000 });

  // Select "premium"
  console.log('Selecting Premium Plan...');
  await page.locator('select').first().selectOption('premium');
  await page.waitForTimeout(500);

  // Click Update License
  console.log('Clicking Update License...');
  await page.click('button:has-text("Update License")');
  await page.waitForTimeout(3000);

  // Take updated screenshot
  await page.screenshot({ path: saScreenPath, fullPage: true });
  fs.copyFileSync(saScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_super_admin_foodyhub.png'));
  console.log('Updated phase9a_super_admin_foodyhub.png after plan change to PRO!');

  await browser.close();
}

updatePlanViaSuperAdmin().catch(err => {
  console.error('Error updating plan:', err);
  process.exit(1);
});
