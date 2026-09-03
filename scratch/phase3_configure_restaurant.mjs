import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function configureRestaurant() {
  console.log('=== PHASE 3: RESTAURANT CONFIGURATION (GST, UPI, PROFILE) ===\n');
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
  await page.waitForTimeout(1000);

  // 1. Configure Profile: Address & Details
  console.log('Configuring Profile details...');
  const addrInput = page.locator('input[placeholder="India"], textarea[placeholder*="address"], input[value="India"]').first();
  if (await addrInput.isVisible()) {
    await addrInput.fill('214B Riddhi Siddhi Complex, Madhuban, Udaipur, Rajasthan');
  }
  const gstNoInput = page.locator('input[placeholder="e.g. 07AAAAA1111A1Z1"]');
  if (await gstNoInput.isVisible()) {
    await gstNoInput.fill('08AABCT1234Z1ZP');
  }
  const saveBrandBtn = page.locator('button:has-text("Save Brand Customizations")');
  if (await saveBrandBtn.isVisible()) {
    await saveBrandBtn.click();
    await page.waitForTimeout(2000);
    console.log('Saved Brand Customizations.');
  }

  // 2. Configure Taxes & Charges (GST 5%)
  console.log('Configuring Taxes & Charges (GST)...');
  await page.click('button:has-text("Taxes & Charges"), [role="tab"]:has-text("Taxes & Charges")');
  await page.waitForTimeout(1000);

  // Enable GST toggle if not already enabled
  const gstToggle = page.locator('button[role="switch"]').first();
  if (await gstToggle.isVisible()) {
    const isChecked = await gstToggle.getAttribute('aria-checked');
    if (isChecked !== 'true') {
      await gstToggle.click();
      await page.waitForTimeout(500);
    }
  }

  // Click Save Taxes & Charges
  await page.click('button:has-text("Save Taxes & Charges")');
  await page.waitForTimeout(2000);
  console.log('Saved Taxes & Charges.');

  const chargesScreen = path.join(SCRATCH_DIR, 'phase9a_step3_gst_configured.png');
  await page.screenshot({ path: chargesScreen, fullPage: true });
  fs.copyFileSync(chargesScreen, path.join(ARTIFACTS_DIR, 'phase9a_step3_gst_configured.png'));
  console.log('Saved phase9a_step3_gst_configured.png');

  // 3. Configure Payments (UPI)
  console.log('Configuring Payments (UPI)...');
  await page.click('button:has-text("Payments Settings"), [role="tab"]:has-text("Payments Settings")');
  await page.waitForTimeout(1000);

  const upiIdInput = page.locator('input[placeholder="e.g. a2zitems@paytm, businessname@okaxis"]');
  await upiIdInput.fill('thefoodyhub@upi');

  const upiNameInput = page.locator('input[placeholder="e.g. A2Z Items Restaurant"]');
  await upiNameInput.fill('The Foody Hub');

  await page.click('button:has-text("Save Configuration")');
  await page.waitForTimeout(2000);
  console.log('Saved Payments Configuration.');

  const paymentsScreen = path.join(SCRATCH_DIR, 'phase9a_step3_upi_configured.png');
  await page.screenshot({ path: paymentsScreen, fullPage: true });
  fs.copyFileSync(paymentsScreen, path.join(ARTIFACTS_DIR, 'phase9a_step3_upi_configured.png'));
  console.log('Saved phase9a_step3_upi_configured.png');

  await browser.close();
  console.log('=== PHASE 3 COMPLETE ===');
}

configureRestaurant().catch(console.error);
