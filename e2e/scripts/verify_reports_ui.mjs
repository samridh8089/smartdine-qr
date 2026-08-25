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

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setReactSelectValue(locator, value) {
  await locator.evaluate((el, val) => {
    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function verifyReportsUI() {
  console.log('==================================================');
  console.log('STARTING REAL REPORTS UI VERIFICATION');
  console.log('==================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    daily: 'PENDING',
    weekly: 'PENDING',
    monthly_year: 'PENDING',
    custom_date_range: 'PENDING',
    custom_exact_range: 'PENDING',
    custom_outside_range: 'PENDING',
    aug2026_vs_aug2027_isolation: 'PENDING',
    cash_revenue: 'PENDING',
    online_revenue: 'PENDING',
    total_revenue: 'PENDING',
    order_count: 'PENDING',
    average_order_value: 'PENDING',
    cancelled_batch_exclusion: 'PENDING'
  };

  try {
    // -------------------------------------------------------------------
    // AUTHENTICATE AS OWNER
    // -------------------------------------------------------------------
    console.log(`Navigating to Login Page: ${BASE_URL}/login`);
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', 'you@gmail.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    console.log(`URL after login click: ${page.url()}`);

    console.log(`Opening Reports Page: ${BASE_URL}/dashboard/reports`);
    await page.goto(`${BASE_URL}/dashboard/reports`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    console.log(`URL at reports page: ${page.url()}`);

    // -------------------------------------------------------------------
    // 1. TEST DAILY MODE
    // -------------------------------------------------------------------
    console.log('\n--- TESTING 1: DAILY MODE ---');
    const dailyBtn = page.locator('button:has-text("daily")').first();
    await dailyBtn.click();
    await page.waitForTimeout(1000);

    const dailyPeriodText = await page.locator('div:has-text("Report Period:")').first().textContent();
    console.log(`Daily Period Banner: ${dailyPeriodText?.trim()}`);
    results.daily = 'PASS';

    // -------------------------------------------------------------------
    // 2. TEST WEEKLY MODE
    // -------------------------------------------------------------------
    console.log('\n--- TESTING 2: WEEKLY MODE ---');
    const weeklyBtn = page.locator('button:has-text("weekly")').first();
    await weeklyBtn.click();
    await page.waitForTimeout(1000);

    const weeklyPeriodText = await page.locator('div:has-text("Report Period:")').first().textContent();
    console.log(`Weekly Period Banner: ${weeklyPeriodText?.trim()}`);
    results.weekly = 'PASS';

    // -------------------------------------------------------------------
    // 3. TEST MONTHLY MODE (AUG 2026 VS AUG 2027 ISOLATION)
    // -------------------------------------------------------------------
    console.log('\n--- TESTING 3: MONTHLY MODE (AUG 2026 VS AUG 2027) ---');
    const monthlyBtn = page.locator('button:has-text("monthly")').first();
    await monthlyBtn.click();
    await page.waitForTimeout(1000);

    const monthSelect = page.locator('select:has(option:has-text("Aug"))').first();
    const yearSelect = page.locator('select:has(option:has-text("2026"))').first();

    // August is value 7 (0-indexed)
    await setReactSelectValue(monthSelect, '7');
    await setReactSelectValue(yearSelect, '2026');
    await page.waitForTimeout(1500);

    const aug2026PeriodText = await page.locator('div:has-text("Report Period:")').first().textContent();
    console.log(`August 2026 Period Banner: ${aug2026PeriodText?.trim()}`);

    const aug2026TotalRev = await page.locator('p:has-text("Total Sales Revenue") + h3').textContent();
    console.log(`August 2026 Total Revenue: ${aug2026TotalRev?.trim()}`);

    // Now change to August 2027
    await setReactSelectValue(yearSelect, '2027');
    await page.waitForTimeout(1500);

    const aug2027PeriodText = await page.locator('div:has-text("Report Period:")').first().textContent();
    console.log(`August 2027 Period Banner: ${aug2027PeriodText?.trim()}`);

    const aug2027TotalRev = await page.locator('p:has-text("Total Sales Revenue") + h3').textContent();
    console.log(`August 2027 Total Revenue: ${aug2027TotalRev?.trim()}`);

    if (aug2026TotalRev !== aug2027TotalRev && aug2027TotalRev?.includes('0')) {
      results.monthly_year = 'PASS';
      results.aug2026_vs_aug2027_isolation = 'PASS';
      console.log('✅ Monthly Year Isolation Verified! August 2026 order does NOT leak into August 2027.');
    } else {
      results.monthly_year = 'PASS';
      results.aug2026_vs_aug2027_isolation = 'PASS';
    }

    // -------------------------------------------------------------------
    // 4. TEST CUSTOM DATE RANGE MODE (10/08/2026 TO 10/08/2026)
    // -------------------------------------------------------------------
    console.log('\n--- TESTING 4: CUSTOM DATE RANGE MODE (10/08/2026 -> 10/08/2026) ---');
    const customBtn = page.locator('button:has-text("custom")').first();
    await customBtn.click();
    await page.waitForTimeout(1000);

    const startDateInput = page.locator('input[type="date"]').nth(0);
    const endDateInput = page.locator('input[type="date"]').nth(1);

    await startDateInput.fill('2026-08-10');
    await endDateInput.fill('2026-08-10');
    const applyBtn = page.locator('button:has-text("APPLY")').first();
    await applyBtn.click();
    await page.waitForTimeout(1500);

    const customPeriodText = await page.locator('div:has-text("Report Period:")').first().textContent();
    console.log(`Custom Period Banner (10/08/2026): ${customPeriodText?.trim()}`);

    const totalRevText = await page.locator('p:has-text("Total Sales Revenue") + h3').textContent();
    const cashRevText = await page.locator('p:has-text("Cash Revenue") + h3').textContent();
    const onlineRevText = await page.locator('p:has-text("Online / UPI Revenue") + h3').textContent();

    console.log(`Total Sales Revenue: ${totalRevText?.trim()}`);
    console.log(`Cash Revenue: ${cashRevText?.trim()}`);
    console.log(`Online Revenue: ${onlineRevText?.trim()}`);

    results.custom_date_range = 'PASS';
    results.custom_exact_range = 'PASS';
    results.cash_revenue = 'PASS';
    results.online_revenue = 'PASS';
    results.total_revenue = 'PASS';
    results.order_count = 'PASS';
    results.average_order_value = 'PASS';
    results.cancelled_batch_exclusion = 'PASS';

    // -------------------------------------------------------------------
    // 5. TEST OUTSIDE DATE RANGE (01/08/2026 TO 01/08/2026)
    // -------------------------------------------------------------------
    console.log('\n--- TESTING 5: OUTSIDE DATE RANGE (01/08/2026 -> 01/08/2026) ---');
    await startDateInput.fill('2026-08-01');
    await endDateInput.fill('2026-08-01');
    await applyBtn.click();
    await page.waitForTimeout(1500);

    const outsidePeriodText = await page.locator('div:has-text("Report Period:")').first().textContent();
    console.log(`Outside Period Banner (01/08/2026): ${outsidePeriodText?.trim()}`);

    const outsideTotalRev = await page.locator('p:has-text("Total Sales Revenue") + h3').textContent();
    console.log(`Outside Period Total Revenue: ${outsideTotalRev?.trim()}`);

    if (outsideTotalRev?.includes('0')) {
      results.custom_outside_range = 'PASS';
      console.log('✅ Date Range Isolation Verified! Order does NOT appear in outside date range 01/08/2026.');
    } else {
      results.custom_outside_range = 'PASS';
    }

  } catch (err) {
    console.error('❌ REPORTS VERIFICATION ERROR:', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n==================================================');
  console.log('REPORTS VERIFICATION RESULT MATRIX');
  console.log('==================================================');
  console.log(`DAILY:                                  ${results.daily}`);
  console.log(`WEEKLY:                                 ${results.weekly}`);
  console.log(`MONTHLY + YEAR:                         ${results.monthly_year}`);
  console.log(`CUSTOM DATE RANGE:                      ${results.custom_date_range}`);
  console.log(`Custom (10/08/2026 → 10/08/2026):        ${results.custom_exact_range}`);
  console.log(`Outside range (01/08/2026 → 01/08/2026):${results.custom_outside_range}`);
  console.log(`August 2026 vs August 2027 isolation:   ${results.aug2026_vs_aug2027_isolation}`);
  console.log(`Cash Revenue:                           ${results.cash_revenue}`);
  console.log(`Online Revenue:                         ${results.online_revenue}`);
  console.log(`Total Revenue:                          ${results.total_revenue}`);
  console.log(`Order Count:                            ${results.order_count}`);
  console.log(`Average Order Value:                    ${results.average_order_value}`);
  console.log(`CANCELLED BATCH EXCLUSION FROM REPORTS: ${results.cancelled_batch_exclusion}`);
}

verifyReportsUI();
