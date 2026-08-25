import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadEnv(file) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    }
  }
}

loadEnv('.env.test');
loadEnv('.env.local');

const LOCAL_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

async function verifyLocalUI() {
  console.log('==================================================');
  console.log('STARTING LOCAL BROWSER UI VERIFICATION VIA FORM LOGIN');
  console.log('URL:', `${LOCAL_URL}/login`);
  console.log('==================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    daily_visible: 'FAIL',
    weekly_visible: 'FAIL',
    monthly_visible: 'FAIL',
    custom_visible: 'FAIL',
    custom_controls_visible: 'FAIL',
    exact_range_test: 'FAIL',
    outside_range_test: 'FAIL'
  };

  try {
    await page.goto(`${LOCAL_URL}/login`);
    await page.waitForTimeout(4000);

    await page.fill('input[type="email"]', 'you@gmail.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(4000);

    console.log(`Current URL after enter: ${page.url()}`);
    if (!page.url().includes('/dashboard')) {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(4000);
    }
    console.log(`Current URL after submit click: ${page.url()}`);

    // Navigate to /dashboard/reports
    await page.goto(`${LOCAL_URL}/dashboard/reports`);
    await page.waitForTimeout(4000);

    console.log(`Current Reports URL: ${page.url()}`);
    const buttonTexts = await page.locator('button').allTextContents();
    console.log(`Rendered Local Buttons (${buttonTexts.length}):`, buttonTexts.join(' | '));

    const dailyBtn = page.locator('button').filter({ hasText: /^daily$/i }).first();
    const weeklyBtn = page.locator('button').filter({ hasText: /^weekly$/i }).first();
    const monthlyBtn = page.locator('button').filter({ hasText: /^monthly$/i }).first();
    const customBtn = page.locator('button').filter({ hasText: /^custom$/i }).first();

    if (await dailyBtn.isVisible()) results.daily_visible = 'PASS';
    if (await weeklyBtn.isVisible()) results.weekly_visible = 'PASS';
    if (await monthlyBtn.isVisible()) results.monthly_visible = 'PASS';
    if (await customBtn.isVisible()) results.custom_visible = 'PASS';

    if (await customBtn.isVisible()) {
      await customBtn.click();
      await page.waitForTimeout(1000);

      const dInput1 = page.locator('input[type="date"]').nth(0);
      const dInput2 = page.locator('input[type="date"]').nth(1);
      const applyBtn = page.locator('button:has-text("APPLY")').first();

      if (await dInput1.isVisible() && await dInput2.isVisible() && await applyBtn.isVisible()) {
        results.custom_controls_visible = 'PASS';

        // 10/08/2026 test
        await dInput1.fill('2026-08-10');
        await dInput2.fill('2026-08-10');
        await applyBtn.click();
        await page.waitForTimeout(1500);

        const periodBanner = await page.locator('div:has-text("Report Period:")').first().textContent();
        if (periodBanner?.includes('10/08/2026 – 10/08/2026')) results.exact_range_test = 'PASS';

        // 05/08/2026 test
        await dInput1.fill('2026-08-05');
        await dInput2.fill('2026-08-05');
        await applyBtn.click();
        await page.waitForTimeout(1500);

        const outsideBanner = await page.locator('div:has-text("Report Period:")').first().textContent();
        const outsideRev = await page.locator('p:has-text("Total Sales Revenue") + h3').textContent();

        if (outsideBanner?.includes('05/08/2026 – 05/08/2026') && outsideRev?.includes('0')) {
          results.outside_range_test = 'PASS';
        }
      }
    }

  } catch (err) {
    console.error('❌ Local verification error:', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n==================================================');
  console.log('LOCAL REPORTS VERIFICATION MATRIX');
  console.log('==================================================');
  console.log(`Daily Visible:               ${results.daily_visible}`);
  console.log(`Weekly Visible:              ${results.weekly_visible}`);
  console.log(`Monthly Visible:             ${results.monthly_visible}`);
  console.log(`Custom Visible:              ${results.custom_visible}`);
  console.log(`Custom Controls Visible:     ${results.custom_controls_visible}`);
  console.log(`10/08/2026 → 10/08/2026:     ${results.exact_range_test}`);
  console.log(`05/08/2026 → 05/08/2026:     ${results.outside_range_test}`);
}

verifyLocalUI();
