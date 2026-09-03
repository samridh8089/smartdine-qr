import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function replaceKdsStaff() {
  console.log('=== LOGGING IN VIA SUPER ADMIN TO REPLACE KDS ON THE FOODY HUB ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async d => {
    console.log('[Browser Dialog]:', d.message());
    await d.accept();
  });

  // 1. Login as Super Admin
  console.log('Logging in as Super Admin...');
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'admin@cleverops.in');
  await page.fill('input[type="password"]', 'Admin@12345!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/super-admin**');
  await page.waitForSelector('text=Opening Admin Console...', { state: 'detached' });

  // 2. Click "Login as Rest" for The Foody Hub
  console.log('Clicking "Login as Rest" for The Foody Hub...');
  const row = page.locator('tr:has-text("The Foody Hub")');
  await row.locator('button:has-text("Login as Rest")').click();
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  console.log('Navigated into The Foody Hub dashboard!');

  // 3. Go to Settings -> Staff Accounts
  console.log('Navigating to /dashboard/settings -> Staff Accounts...');
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(1500);

  // 4. Delete nakshatra1233@gmail.com if present
  const nakshatraRow = page.locator('tr:has-text("nakshatra1233@gmail.com")');
  if (await nakshatraRow.isVisible()) {
    console.log('Deleting nakshatra1233@gmail.com...');
    await nakshatraRow.locator('button[title="Delete Staff"]').click();
    await page.waitForTimeout(3000);
    console.log('Deleted nakshatra1233@gmail.com.');
  }

  // 5. Register new KDS: newlifeofdeepsssa@gmail.com
  console.log('Registering new KDS: newlifeofdeepsssa@gmail.com...');
  const form = page.locator('form:has-text("Register Staff Login"), form:has-text("Staff Full Name")');
  await form.locator('input[placeholder="e.g. Rahul Sharma"]').fill('KDS Kitchen');
  await form.locator('input[placeholder="rahul@restaurant.com"]').fill('newlifeofdeepsssa@gmail.com');
  await form.locator('input[placeholder="+91 9876543210"]').fill('8949266061');
  await form.locator('input[placeholder="Minimum 6 characters"]').fill('FoodyHub@Kds2026!');
  await form.locator('select').selectOption('kitchen');
  await page.waitForTimeout(500);

  console.log('Clicking Create Staff Profile...');
  await form.locator('button[type="submit"]').click();
  await page.waitForTimeout(6000);

  // 6. Capture screenshot
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(2000);

  const resScreen = path.join(SCRATCH_DIR, 'phase9a_staff_new_kds_registered.png');
  await page.screenshot({ path: resScreen, fullPage: true });
  fs.copyFileSync(resScreen, path.join(ARTIFACTS_DIR, 'phase9a_staff_new_kds_registered.png'));
  console.log('Saved phase9a_staff_new_kds_registered.png');

  await browser.close();
  console.log('=== KDS REPLACED SUCCESSFULLY ===');
}

replaceKdsStaff().catch(console.error);
