import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

const staffMembers = [
  { name: 'Samridh Waiter 1', email: 'samridhtomar8@gmail.com', phone: '8949266062', password: 'FoodyHub@W1_2026!', role: 'waiter' },
  { name: 'Pooja Waiter 2', email: 'poojagarg0885@gmail.com', phone: '8949266063', password: 'FoodyHub@W2_2026!', role: 'waiter' },
  { name: 'Deepak Cashier', email: 'deepak.soni19492@gmail.com', phone: '8949266064', password: 'FoodyHub@Cash2026!', role: 'cashier' }
];

async function registerRemainingStaff() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async d => {
    console.log('[Browser Dialog]:', d.message());
    await d.accept();
  });

  // Login as Owner
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(1000);

  for (const staff of staffMembers) {
    console.log(`Registering ${staff.name} (${staff.email}) - ${staff.role}...`);
    const form = page.locator('form:has-text("Register Staff Login"), form:has-text("Staff Full Name")');
    await form.locator('input[placeholder="e.g. Rahul Sharma"]').fill(staff.name);
    await form.locator('input[placeholder="rahul@restaurant.com"]').fill(staff.email);
    await form.locator('input[placeholder="+91 9876543210"]').fill(staff.phone);
    await form.locator('input[placeholder="Minimum 6 characters"]').fill(staff.password);
    await form.locator('select').selectOption(staff.role);
    await page.waitForTimeout(300);

    await form.locator('button[type="submit"]').click();
    console.log(`Submitted invite for ${staff.email}. Waiting 5s...`);
    await page.waitForTimeout(5000);

    // If modal opened, close it so we can register next staff
    const closeBtn = page.locator('button:has-text("Cancel"), button[aria-label="Close"], button:has-text("✕")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Final screenshot of staff accounts table with all 4 staff profiles
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(2000);

  const finalScreen = path.join(SCRATCH_DIR, 'phase9a_staff_all_registered.png');
  await page.screenshot({ path: finalScreen, fullPage: true });
  fs.copyFileSync(finalScreen, path.join(ARTIFACTS_DIR, 'phase9a_staff_all_registered.png'));
  console.log('Saved phase9a_staff_all_registered.png');

  await browser.close();
}

registerRemainingStaff().catch(console.error);
