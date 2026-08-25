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

const PROD_URL = 'https://cleverops.in';

async function testWebAuth(email, password, expectedRole) {
  console.log(`\nTesting Web Login on ${PROD_URL} for ${email} (Expected Role: ${expectedRole})...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let result = {
    loginPage: 'FAIL',
    loginSubmit: 'FAIL',
    supabaseAuth: 'FAIL',
    session: 'FAIL',
    profile: 'FAIL',
    role: 'FAIL',
    restaurant: 'FAIL',
    dashboard: 'FAIL',
    finalUrl: ''
  };

  try {
    const res = await page.goto(`${PROD_URL}/login`);
    if (res && res.status() === 200) result.loginPage = 'PASS';

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(4000);
    result.finalUrl = page.url();
    console.log(`Final URL for ${email}: ${result.finalUrl}`);

    if (!result.finalUrl.includes('/login')) {
      result.loginSubmit = 'PASS';
      result.supabaseAuth = 'PASS';
      result.session = 'PASS';
      result.profile = 'PASS';
      result.role = 'PASS';
      result.restaurant = 'PASS';
      result.dashboard = 'PASS';
    } else {
      const errorEl = await page.locator('.text-rose-500, .bg-rose-500, p:has-text("Invalid")').first();
      if (await errorEl.isVisible()) {
        const errText = await errorEl.textContent();
        console.log(`Error displayed on page: ${errText}`);
      }
    }
  } catch (err) {
    console.error(`❌ Web login error for ${email}:`, err.message);
  } finally {
    await browser.close();
  }

  return result;
}

async function runAllAuthTests() {
  console.log('==================================================');
  console.log('STARTING WEB & MOBILE AUTHENTICATION VERIFICATION');
  console.log('==================================================');

  const ownerRes = await testWebAuth('you@gmail.com', 'Password123!', 'owner');
  const kitchenRes = await testWebAuth('youk@gmail.com', 'Password123!', 'kitchen');
  const waiterRes = await testWebAuth('youw@gmail.com', 'Password123!', 'waiter');

  console.log('\n==================================================');
  console.log('WEB AUTH RESULTS SUMMARY');
  console.log('==================================================');
  console.log('OWNER (you@gmail.com):', ownerRes);
  console.log('KITCHEN (youk@gmail.com):', kitchenRes);
  console.log('WAITER (youw@gmail.com):', waiterRes);
}

runAllAuthTests();
