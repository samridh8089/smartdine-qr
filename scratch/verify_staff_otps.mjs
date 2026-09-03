import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

const verifications = [
  { email: 'samridhtomar8@gmail.com', otp: '20806523', name: 'Waiter 1' },
  { email: 'poojagarg0885@gmail.com', otp: '11628566', name: 'Waiter 2' },
  { email: 'deepak.soni19492@gmail.com', otp: '64796633', name: 'Cashier' }
];

async function verifyAllOtps() {
  console.log('=== VERIFYING STAFF OTPS ON LIVE PRODUCTION ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async d => {
    console.log('[Alert Dialog]:', d.message());
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
  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(1500);

  for (const item of verifications) {
    console.log(`\nVerifying ${item.name} (${item.email}) with OTP: ${item.otp}...`);

    // Find row for this email
    const row = page.locator(`tr:has-text("${item.email}")`);
    const verifyBtn = row.locator('button:has-text("Verify OTP →")');

    if (await verifyBtn.isVisible()) {
      await verifyBtn.click();
      await page.waitForSelector('text=Verify Staff Account', { timeout: 10000 });

      // Fill OTP input
      console.log(`Filling OTP ${item.otp}...`);
      await page.fill('input[placeholder="8-digit OTP"]', item.otp);
      await page.waitForTimeout(500);

      // Click submit
      await page.click('button:has-text("Verify & Activate Account")');
      await page.waitForTimeout(3000);

      console.log(`Submitted OTP for ${item.name}.`);
    } else {
      console.log(`Verify button not visible for ${item.email}. Already verified?`);
    }
  }

  // Reload settings staff page to verify final statuses
  console.log('\nReloading Settings -> Staff Accounts to confirm active statuses...');
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(2000);

  const updatedStaffScreen = path.join(SCRATCH_DIR, 'phase9a_staff_verified_roster.png');
  await page.screenshot({ path: updatedStaffScreen, fullPage: true });
  fs.copyFileSync(updatedStaffScreen, path.join(ARTIFACTS_DIR, 'phase9a_staff_verified_roster.png'));
  console.log('Saved phase9a_staff_verified_roster.png');

  await browser.close();
}

verifyAllOtps().catch(console.error);
