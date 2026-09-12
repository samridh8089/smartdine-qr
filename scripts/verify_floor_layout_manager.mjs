import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS = 'C:/Users/admin/.gemini/antigravity-ide/brain/63be691e-3623-4138-a70b-1f50b5cb5801';
const BASE_URL = 'http://localhost:3000';
const CHROME = 'C:/Users/admin/.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe';
const EMAIL = 'dsoni1281@gmail.com';
const PASS = '123456';

async function run() {
  console.log('=== VERIFYING FLOOR LAYOUT MANAGER ON LOCALHOST ===');
  console.log(`Connecting to: ${BASE_URL}`);
  console.log(`Owner Account: ${EMAIL}`);

  if (!fs.existsSync(ARTIFACTS)) {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
  }

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1440,900'
    ]
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
  });

  try {
    // 1. Login flow
    console.log('[1/7] Logging in with owner credentials...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]', { noWaitAfter: true });

    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log(`Logged in successfully! Current URL: ${page.url()}`);

    // 2. Navigate to Tables & Floor Layout Manager
    console.log('[2/7] Navigating to Tables Floor Layout Manager...');
    await page.goto(`${BASE_URL}/dashboard/tables`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Verify Floor Layout Manager is mounted
    const titleVisible = await page.locator('text="Floor Layout Manager"').first().isVisible();
    console.log(`Floor Layout Manager Title Visible: ${titleVisible}`);

    // Verify No 3D canvas, No AI layout, No Camera Scan
    const has3DCanvas = await page.locator('canvas').count() > 0;
    const hasAILayoutBtn = await page.locator('button:has-text("Generate AI Layout")').count() > 0;
    console.log(`Has 3D Canvas: ${has3DCanvas} (Expected: false or 0)`);
    console.log(`Has AI Layout Button: ${hasAILayoutBtn} (Expected: false)`);

    // Capture Indoor Floor
    const shot1 = path.join(ARTIFACTS, 'proof_floor_layout_indoor.png');
    await page.screenshot({ path: shot1, timeout: 15000 });
    console.log('Saved screenshot: proof_floor_layout_indoor.png');

    // 3. Test Floor Tabs Switcher: Outdoor, First Floor, Terrace
    console.log('[3/7] Testing Floor Switcher tabs...');
    const outdoorBtn = page.locator('button:has-text("Outdoor")').first();
    if (await outdoorBtn.isVisible()) {
      await outdoorBtn.click({ noWaitAfter: true, force: true });
      await page.waitForTimeout(1000);
      const shot2 = path.join(ARTIFACTS, 'proof_floor_layout_outdoor.png');
      await page.screenshot({ path: shot2, timeout: 15000 });
      console.log('Saved screenshot: proof_floor_layout_outdoor.png');
    }

    const firstFloorBtn = page.locator('button:has-text("First Floor")').first();
    if (await firstFloorBtn.isVisible()) {
      await firstFloorBtn.click({ noWaitAfter: true, force: true });
      await page.waitForTimeout(1000);
      const shot3 = path.join(ARTIFACTS, 'proof_floor_layout_first_floor.png');
      await page.screenshot({ path: shot3, timeout: 15000 });
      console.log('Saved screenshot: proof_floor_layout_first_floor.png');
    }

    const terraceBtn = page.locator('button:has-text("Terrace")').first();
    if (await terraceBtn.isVisible()) {
      await terraceBtn.click({ noWaitAfter: true, force: true });
      await page.waitForTimeout(1000);
      const shot4 = path.join(ARTIFACTS, 'proof_floor_layout_terrace.png');
      await page.screenshot({ path: shot4, timeout: 15000 });
      console.log('Saved screenshot: proof_floor_layout_terrace.png');
    }

    // Switch back to Indoor
    const indoorBtn = page.locator('button:has-text("Indoor")').first();
    await indoorBtn.click({ noWaitAfter: true, force: true });
    await page.waitForTimeout(1000);

    // 4. Test Add Table Modal
    console.log('[4/7] Testing Add Table Modal...');
    // Target Add Table button inside the Floor Layout Manager toolbar
    const addTableBtn = page.locator('div.border-b button:has-text("Add Table")').first();
    if (await addTableBtn.isVisible()) {
      await addTableBtn.click({ noWaitAfter: true, force: true });
      await page.waitForTimeout(1000);

      const modalVisible = await page.locator('text="Add New Table"').first().isVisible();
      console.log(`Add Table Modal Visible: ${modalVisible}`);

      const shot5 = path.join(ARTIFACTS, 'proof_add_table_modal.png');
      await page.screenshot({ path: shot5, timeout: 15000 });
      console.log('Saved screenshot: proof_add_table_modal.png');

      // Close modal
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      await cancelBtn.click({ noWaitAfter: true, force: true });
      await page.waitForTimeout(800);
    }

    // 5. Test Table Selection & Drawer
    console.log('[5/7] Testing Table Details Slide-over Drawer...');
    // Find table card inside the canvas
    const firstTable = page.locator('div.group:has-text("Seats")').first();
    const tableExists = await firstTable.isVisible().catch(() => false);
    console.log(`Interactive table card visible: ${tableExists}`);

    if (tableExists) {
      await firstTable.click({ noWaitAfter: true, force: true });
      await page.waitForTimeout(1500);

      // Drawer Details Tab
      const drawerVisible = await page.locator('text="Live Table Status"').first().isVisible().catch(() => false);
      console.log(`Table Drawer Visible: ${drawerVisible}`);

      const shot6 = path.join(ARTIFACTS, 'proof_table_drawer_details.png');
      await page.screenshot({ path: shot6, timeout: 15000 });
      console.log('Saved screenshot: proof_table_drawer_details.png');

      // Switch to QR Code tab
      console.log('[6/7] Testing Table QR Code tab...');
      const qrTab = page.locator('button:has-text("QR Code")').first();
      if (await qrTab.isVisible()) {
        await qrTab.click({ noWaitAfter: true, force: true });
        await page.waitForTimeout(1000);

        const shot7 = path.join(ARTIFACTS, 'proof_table_drawer_qr.png');
        await page.screenshot({ path: shot7, timeout: 15000 });
        console.log('Saved screenshot: proof_table_drawer_qr.png');
      }

      // Switch to Booking tab
      console.log('[7/7] Testing Table Booking tab...');
      const bookingTab = page.locator('button:has-text("Booking")').first();
      if (await bookingTab.isVisible()) {
        await bookingTab.click({ noWaitAfter: true, force: true });
        await page.waitForTimeout(1000);

        const shot8 = path.join(ARTIFACTS, 'proof_table_drawer_booking.png');
        await page.screenshot({ path: shot8, timeout: 15000 });
        console.log('Saved screenshot: proof_table_drawer_booking.png');
      }
    }

    console.log('=== ALL FLOOR LAYOUT MANAGER VERIFICATIONS COMPLETE ===');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

run();
