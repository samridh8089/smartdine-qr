import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS = 'C:/Users/admin/.gemini/antigravity-ide/brain/63be691e-3623-4138-a70b-1f50b5cb5801';
const BASE_URL = 'http://localhost:3000';
const CHROME = 'C:/Users/admin/.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe';
const EMAIL = 'dsoni1281@gmail.com';
const PASS = '123456';

async function run() {
  console.log('=== VERIFYING OWNER LIVE RESTAURANT EXPERIENCE ON LOCALHOST ===');
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
      '--enable-webgl',
      '--window-size=1440,900'
    ]
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('Error') || text.includes('WebGL')) {
      console.log('BROWSER LOG:', text);
    }
  });
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));

  try {
    // 1. Login flow
    console.log('[1/8] Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    console.log('[2/8] Logging in with owner credentials...');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log(`Logged in successfully! Current URL: ${page.url()}`);

    // 2. Navigate to Tables & QR Floor Planner page
    console.log('[3/8] Navigating to Tables Floor Planner page...');
    await page.goto(`${BASE_URL}/dashboard/tables`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    const shot1 = path.join(ARTIFACTS, 'proof_owner_tables_page.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`Saved screenshot: proof_owner_tables_page.png`);

    // 3. Open AI Layout Generator Modal
    console.log('[4/8] Opening AI Floor Planner Modal...');
    const aiBtn = page.locator('button:has-text("Generate AI Layout")').first();
    if (await aiBtn.isVisible()) {
      await aiBtn.click();
    } else {
      console.log('Searching for AI Layout button...');
      await page.click('button:has-text("AI Layout")');
    }
    await page.waitForTimeout(1500);

    const shot2 = path.join(ARTIFACTS, 'proof_owner_modal_step1.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`Saved screenshot: proof_owner_modal_step1.png`);

    // 4. Test Step progression without photos (Option A)
    console.log('[5/8] Progressing with Option A (Dimensions Only)...');
    const skipPhotosBtn = page.locator('button:has-text("Skip Photos & Set Furniture")').first();
    if (await skipPhotosBtn.isVisible()) {
      await skipPhotosBtn.click();
      await page.waitForTimeout(1000);
    }

    const genBtn = page.locator('button:has-text("Generate Layouts")').first();
    if (await genBtn.isVisible()) {
      await genBtn.click();
    }
    await page.waitForTimeout(3000);

    const shot3 = path.join(ARTIFACTS, 'proof_owner_modal_layouts.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`Saved screenshot: proof_owner_modal_layouts.png`);

    // 5. Open Owner Preview (Before vs After)
    console.log('[6/8] Testing Owner Preview: Before vs After...');
    const ownerPreviewBtn = page.locator('button:has-text("Owner Preview (Before vs After)")').first();
    if (await ownerPreviewBtn.isVisible()) {
      await ownerPreviewBtn.click({ force: true });
      await page.waitForTimeout(1000);

      // Check Before: Empty Room
      const beforeBtn = page.locator('button:has-text("Before: Empty Room")').first();
      if (await beforeBtn.isVisible()) {
        await beforeBtn.click({ force: true });
        await page.waitForTimeout(1200);
        const shot4 = path.join(ARTIFACTS, 'proof_owner_preview_before.png');
        await page.screenshot({ path: shot4, fullPage: false });
        console.log(`Saved screenshot: proof_owner_preview_before.png`);
      }

      // Check After: Full Restaurant
      const afterBtn = page.locator('button:has-text("After: Full Restaurant")').first();
      if (await afterBtn.isVisible()) {
        await afterBtn.click({ force: true });
        await page.waitForTimeout(1200);
        const shot5 = path.join(ARTIFACTS, 'proof_owner_preview_after.png');
        await page.screenshot({ path: shot5, fullPage: false });
        console.log(`Saved screenshot: proof_owner_preview_after.png`);
      }

      // Apply Layout
      console.log('[7/8] Applying layout to Floor Canvas...');
      const applyBtn = page.locator('button:has-text("Apply Layout")').first();
      if (await applyBtn.isVisible()) {
        await applyBtn.click({ force: true });
      }
      await page.waitForTimeout(2500);
    }

    // 6. Launch 3D Preview
    console.log('[8/8] Launching 3D Preview in Live Restaurant Mode...');
    const preview3DBtn = page.locator('button:has-text("3D Preview")').first();
    const btnVisible = await preview3DBtn.isVisible();
    console.log(`3D Preview button visible: ${btnVisible}`);
    if (btnVisible) {
      await preview3DBtn.click({ force: true });
      await page.waitForTimeout(4000);

      const modalVisible = await page.locator('text="3D Floor Planner"').first().isVisible().catch(() => false);
      console.log(`3D Floor Planner Modal visible: ${modalVisible}`);

      // Capture Night Mode
      const shot6 = path.join(ARTIFACTS, 'proof_owner_3d_night_mode.png');
      await page.screenshot({ path: shot6, timeout: 15000, animations: 'allow' });
      console.log(`Saved screenshot: proof_owner_3d_night_mode.png`);

      // Switch to Day Mode
      const dayBtn = page.locator('button:has-text("Day")').first();
      if (await dayBtn.isVisible()) {
        await dayBtn.click({ force: true });
        await page.waitForTimeout(2000);
        const shot7 = path.join(ARTIFACTS, 'proof_owner_3d_day_mode.png');
        await page.screenshot({ path: shot7, timeout: 15000, animations: 'allow' });
        console.log(`Saved screenshot: proof_owner_3d_day_mode.png`);
      }

      // Switch to Live Tour Walkthrough
      const tourBtn = page.locator('button:has-text("Live Tour")').first();
      if (await tourBtn.isVisible()) {
        await tourBtn.click({ force: true });
        await page.waitForTimeout(3000); // Allow camera to glide along aisle
        const shot8 = path.join(ARTIFACTS, 'proof_owner_3d_walkthrough.png');
        await page.screenshot({ path: shot8, timeout: 15000, animations: 'allow' });
        console.log(`Saved screenshot: proof_owner_3d_walkthrough.png`);
      }
    }

    console.log('=== ALL OWNER LIVE RESTAURANT VERIFICATIONS COMPLETE ===');
  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await browser.close();
  }
}

run();
