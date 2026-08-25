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

const LOCAL_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';
const PROD_URL = 'https://cleverops.in';

async function testEnvironment(baseUrl, envName) {
  console.log(`\n==================================================`);
  console.log(`TESTING OWNER DASHBOARD ON ${envName} (${baseUrl})`);
  console.log(`==================================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const envResults = {
    login_page: 'PENDING',
    login_submit: 'PENDING',
    dashboard_overview: 'PENDING',
    orders_page: 'PENDING',
    reports_page: 'PENDING',
    menu_page: 'PENDING',
    tables_page: 'PENDING',
    settings_page: 'PENDING'
  };

  try {
    // 1. Login Page
    const loginResp = await page.goto(`${baseUrl}/login`);
    if (loginResp && loginResp.status() === 200) envResults.login_page = 'PASS';

    // 2. Perform Login
    await page.fill('input[type="email"]', 'you@gmail.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    if (page.url().includes('/dashboard')) envResults.login_submit = 'PASS';

    // 3. Overview Dashboard
    await page.goto(`${baseUrl}/dashboard`);
    await page.waitForTimeout(2000);
    const bodyText = await page.innerText('body');
    if (bodyText.includes('Overview Dashboard') || bodyText.includes('Revenue') || bodyText.includes('Orders')) {
      envResults.dashboard_overview = 'PASS';
    }

    // 4. Orders Page
    await page.goto(`${baseUrl}/dashboard/orders`);
    await page.waitForTimeout(2000);
    const ordersText = await page.innerText('body');
    if (ordersText.includes('Live Orders') || ordersText.includes('Order') || ordersText.includes('Table')) {
      envResults.orders_page = 'PASS';
    }

    // 5. Reports Page
    await page.goto(`${baseUrl}/dashboard/reports`);
    await page.waitForTimeout(2000);
    const reportsText = await page.innerText('body');
    if (reportsText.includes('Reports & Analytics') || reportsText.includes('Revenue')) {
      envResults.reports_page = 'PASS';
    }

    // 6. Menu Page
    await page.goto(`${baseUrl}/dashboard/menu`);
    await page.waitForTimeout(2000);
    const menuText = await page.innerText('body');
    if (menuText.includes('Menu') || menuText.includes('Category') || menuText.includes('Dishes')) {
      envResults.menu_page = 'PASS';
    }

    // 7. Tables Page
    await page.goto(`${baseUrl}/dashboard/tables`);
    await page.waitForTimeout(2000);
    const tablesText = await page.innerText('body');
    if (tablesText.includes('Table') || tablesText.includes('QR')) {
      envResults.tables_page = 'PASS';
    }

    // 8. Settings Page
    await page.goto(`${baseUrl}/dashboard/settings`);
    await page.waitForTimeout(2000);
    const settingsText = await page.innerText('body');
    if (settingsText.includes('Settings') || settingsText.includes('Staff') || settingsText.includes('Restaurant')) {
      envResults.settings_page = 'PASS';
    }

  } catch (err) {
    console.error(`❌ Error on ${envName}:`, err.message);
  } finally {
    await browser.close();
  }

  console.log(`--- ${envName} RESULTS ---`);
  Object.entries(envResults).forEach(([k, v]) => console.log(`${k}: ${v}`));
  return envResults;
}

async function runFullRegression() {
  const localRes = await testEnvironment(LOCAL_URL, 'LOCAL WEB (localhost:3000)');
  const prodRes = await testEnvironment(PROD_URL, 'PRODUCTION (cleverops.in)');
}

runFullRegression();
