import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
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

const PROD_URL = 'https://www.cleverops.in';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verifyProdReports() {
  console.log('==================================================');
  console.log('STARTING PRODUCTION BROWSER REPORTS VERIFICATION');
  console.log('URL:', `${PROD_URL}/dashboard/reports`);
  console.log('==================================================');

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'you@gmail.com',
    password: 'Password123!'
  });

  if (authErr || !authData.session) {
    console.error('❌ Supabase Auth failed for production test:', authErr?.message);
    return;
  }

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
    // 1. Inject Session & Open Reports Page
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((session) => {
      localStorage.setItem('sb-tiuwfhkrjvtkshebdwlp-auth-token', JSON.stringify(session));
    }, authData.session);

    await page.goto(`${PROD_URL}/dashboard/reports`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    console.log(`Current Production URL: ${page.url()}`);
    const buttonTexts = await page.locator('button').allTextContents();
    console.log(`Rendered Production Buttons (${buttonTexts.length}):`, buttonTexts.join(' | '));

    const dailyBtn = page.locator('button').filter({ hasText: /^daily$/i }).first();
    const weeklyBtn = page.locator('button').filter({ hasText: /^weekly$/i }).first();
    const monthlyBtn = page.locator('button').filter({ hasText: /^monthly$/i }).first();
    const customBtn = page.locator('button').filter({ hasText: /^custom$/i }).first();

    if (await dailyBtn.isVisible()) results.daily_visible = 'PASS';
    if (await weeklyBtn.isVisible()) results.weekly_visible = 'PASS';
    if (await monthlyBtn.isVisible()) results.monthly_visible = 'PASS';
    if (await customBtn.isVisible()) results.custom_visible = 'PASS';

    console.log(`Daily Visible: ${results.daily_visible}`);
    console.log(`Weekly Visible: ${results.weekly_visible}`);
    console.log(`Monthly Visible: ${results.monthly_visible}`);
    console.log(`Custom Visible: ${results.custom_visible}`);

    // 2. Click Custom Tab & Verify Date Inputs + APPLY Button
    if (await customBtn.isVisible()) {
      await customBtn.click();
      await page.waitForTimeout(1000);

      const startDateInput = page.locator('input[type="date"]').nth(0);
      const endDateInput = page.locator('input[type="date"]').nth(1);
      const applyBtn = page.locator('button:has-text("APPLY")').first();

      if (await startDateInput.isVisible() && await endDateInput.isVisible() && await applyBtn.isVisible()) {
        results.custom_controls_visible = 'PASS';
        console.log('✅ Custom Controls (From Date, To Date, APPLY) VISIBLE in Production UI!');

        // 3. Test From: 10/08/2026 To: 10/08/2026
        const dInput1 = page.locator('input[type="date"]').nth(0);
        const dInput2 = page.locator('input[type="date"]').nth(1);

        await dInput1.focus();
        await dInput1.fill('2026-08-10');
        await dInput1.press('Tab');

        await dInput2.focus();
        await dInput2.fill('2026-08-10');
        await dInput2.press('Tab');

        await page.click('button:has-text("APPLY")');
        await page.waitForTimeout(2000);

        const periodBanner = await page.locator('div:has-text("Report Period:")').first().textContent();
        const totalRev = await page.locator('p:has-text("Total Sales Revenue") + h3').textContent();

        console.log(`Custom Period Banner (10/08/2026): ${periodBanner?.trim()}`);
        console.log(`Total Sales Revenue (10/08/2026): ${totalRev?.trim()}`);

        if (periodBanner?.includes('10/08/2026 – 10/08/2026')) results.exact_range_test = 'PASS';

        // 4. Test Zero Order Date Range (05/08/2026 -> 05/08/2026)
        await dInput1.focus();
        await dInput1.fill('2026-08-05');
        await dInput1.press('Tab');

        await dInput2.focus();
        await dInput2.fill('2026-08-05');
        await dInput2.press('Tab');

        await page.click('button:has-text("APPLY")');
        await page.waitForTimeout(2000);

        const outsideBanner = await page.locator('div:has-text("Report Period:")').first().textContent();
        const outsideRev = await page.locator('p:has-text("Total Sales Revenue") + h3').textContent();

        console.log(`Outside Period Banner (05/08/2026): ${outsideBanner?.trim()}`);
        console.log(`Outside Sales Revenue (05/08/2026): ${outsideRev?.trim()}`);

        if (outsideBanner?.includes('05/08/2026 – 05/08/2026')) results.outside_range_test = 'PASS';
      }
    }

  } catch (err) {
    console.error('❌ Production verification error:', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n==================================================');
  console.log('PRODUCTION REPORTS VERIFICATION MATRIX');
  console.log('==================================================');
  console.log(`Daily Visible:               ${results.daily_visible}`);
  console.log(`Weekly Visible:              ${results.weekly_visible}`);
  console.log(`Monthly Visible:             ${results.monthly_visible}`);
  console.log(`Custom Visible:              ${results.custom_visible}`);
  console.log(`Custom Controls Visible:     ${results.custom_controls_visible}`);
  console.log(`10/08/2026 → 10/08/2026:     ${results.exact_range_test}`);
  console.log(`05/08/2026 → 05/08/2026:     ${results.outside_range_test}`);
}

verifyProdReports();
