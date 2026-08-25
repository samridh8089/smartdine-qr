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

async function diagnoseOwnerDashboard() {
  console.log('==================================================');
  console.log('DIAGNOSING OWNER DASHBOARD ISSUE');
  console.log('==================================================');

  // 1. Inspect DB profile for you@gmail.com
  const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('email', 'you@gmail.com').single();
  console.log('DB Profile fetch:', profErr ? `ERROR: ${profErr.message}` : 'SUCCESS');
  if (profile) {
    console.log(`Profile ID: ${profile.id}`);
    console.log(`Profile Role: ${profile.role}`);
    console.log(`Restaurant ID: ${profile.restaurant_id}`);

    const { data: restaurant, error: restErr } = await supabase.from('restaurants').select('*').eq('id', profile.restaurant_id).single();
    console.log('DB Restaurant fetch:', restErr ? `ERROR: ${restErr.message}` : 'SUCCESS');
    if (restaurant) {
      console.log(`Restaurant Name: ${restaurant.name}`);
      console.log(`Restaurant Slug: ${restaurant.slug}`);
    }
  }

  // 2. Launch browser and listen to console/network/page errors
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const networkErrors = [];

  page.on('console', msg => consoleLogs.push(`[CONSOLE ${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(`[PAGE ERROR] ${err.message}`));
  page.on('response', resp => {
    if (resp.status() >= 400) {
      networkErrors.push(`[HTTP ${resp.status()}] ${resp.url()}`);
    }
  });

  try {
    console.log(`\nStep 1: Navigating to ${BASE_URL}/login`);
    const loginResp = await page.goto(`${BASE_URL}/login`);
    console.log(`Login page load status: ${loginResp.status()}`);

    console.log('Step 2: Filling credentials you@gmail.com / Password123!');
    await page.fill('input[type="email"]', 'you@gmail.com');
    await page.fill('input[type="password"]', 'Password123!');

    console.log('Step 3: Submitting login form');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(4000);
    console.log(`URL after login: ${page.url()}`);

    console.log('Step 4: Attempting navigation to /dashboard');
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(4000);
    console.log(`Final Dashboard URL: ${page.url()}`);

    const title = await page.title();
    console.log(`Page Title: ${title}`);

    const bodyText = await page.innerText('body');
    console.log(`Page body snippet: ${bodyText.slice(0, 500)}`);

  } catch (err) {
    console.error('❌ Automation error during diagnosis:', err.message);
  } finally {
    await browser.close();
  }

  console.log('\n--- BROWSER CONSOLE LOGS ---');
  consoleLogs.forEach(l => console.log(l));

  console.log('\n--- PAGE ERRORS ---');
  pageErrors.forEach(e => console.log(e));

  console.log('\n--- NETWORK ERRORS ---');
  networkErrors.forEach(n => console.log(n));
}

diagnoseOwnerDashboard();
