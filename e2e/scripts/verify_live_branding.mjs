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

async function runLiveBrandingVerification() {
  console.log('==================================================');
  console.log('VERIFYING LIVE PRODUCTION BRANDING & FAVICONS');
  console.log('URL:', PROD_URL);
  console.log('==================================================\n');

  const assetUrls = [
    '/favicon.ico',
    '/favicon.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/icon-192.png',
    '/icon-512.png',
    '/logo.png'
  ];

  console.log('--- 1. TESTING DIRECT ASSET HTTP RESPONSES ---');
  let assetFailures = 0;
  for (const urlPath of assetUrls) {
    const fullUrl = `${PROD_URL}${urlPath}?v=20260811`;
    try {
      const res = await fetch(fullUrl);
      const contentType = res.headers.get('content-type') || '';
      const size = (await res.arrayBuffer()).byteLength;
      
      const isOK = res.status === 200 && size > 100 && !contentType.includes('text/html');
      if (isOK) {
        console.log(`✅ ${urlPath} → HTTP ${res.status} | ${contentType} | ${size} bytes (PASS)`);
      } else {
        console.error(`❌ ${urlPath} → HTTP ${res.status} | ${contentType} | ${size} bytes (FAIL)`);
        assetFailures++;
      }
    } catch (e) {
      console.error(`❌ ${urlPath} → Exception: ${e.message}`);
      assetFailures++;
    }
  }

  // 2. PLAYWRIGHT BROWSER VISUAL VERIFICATION
  console.log('\n--- 2. TESTING PLAYWRIGHT BROWSER VISIBILITY ---');
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'you@gmail.com',
    password: 'Password123!'
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const report = {
    favicon_http_test: assetFailures === 0 ? 'PASS' : 'FAIL',
    logo_http_test: assetFailures === 0 ? 'PASS' : 'FAIL',
    login_logo: 'FAIL',
    dashboard_logo: 'FAIL',
    orders_logo: 'FAIL',
    reports_logo: 'FAIL',
    menu_logo: 'FAIL',
    tables_logo: 'FAIL',
    settings_logo: 'FAIL',
    customer_page_logo: 'FAIL',
    fresh_browser_favicon: 'FAIL',
    no_404_logo_assets: assetFailures === 0 ? 'PASS' : 'FAIL'
  };

  try {
    // A. Login Page
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const loginImgNaturalWidth = await page.locator('img[alt="CleverOps Logo"]').evaluate((img) => img.naturalWidth).catch(() => 0);
    if (loginImgNaturalWidth > 0) {
      report.login_logo = 'PASS';
      console.log('✅ Login logo visible & loaded (naturalWidth:', loginImgNaturalWidth, ')');
    }

    const faviconHref = await page.locator('link[rel*="icon"]').first().getAttribute('href').catch(() => null);
    if (faviconHref && faviconHref.includes('/favicon')) {
      report.fresh_browser_favicon = 'PASS';
      console.log('✅ Fresh browser favicon link element present:', faviconHref);
    }

    // Authenticate Session
    if (authData?.session) {
      await page.evaluate((session) => {
        localStorage.setItem('sb-tiuwfhkrjvtkshebdwlp-auth-token', JSON.stringify(session));
      }, authData.session);
    }

    // B. Dashboard Pages
    const routes = [
      { path: '/dashboard', key: 'dashboard_logo' },
      { path: '/dashboard/orders', key: 'orders_logo' },
      { path: '/dashboard/reports', key: 'reports_logo' },
      { path: '/dashboard/menu', key: 'menu_logo' },
      { path: '/dashboard/tables', key: 'tables_logo' },
      { path: '/dashboard/settings', key: 'settings_logo' }
    ];

    for (const r of routes) {
      await page.goto(`${PROD_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const w = await page.locator('aside img[alt="CleverOps Logo"]').evaluate((img) => img.naturalWidth).catch(() => 0);
      if (w > 0) {
        report[r.key] = 'PASS';
        console.log(`✅ ${r.path} sidebar logo loaded (naturalWidth: ${w})`);
      } else {
        console.error(`❌ ${r.path} sidebar logo failed to load`);
      }
    }

    // C. Customer Order Tracking Page
    const { data: latestOrder } = await supabase.from('orders').select('id').order('created_at', { ascending: false }).limit(1).single();
    if (latestOrder) {
      await page.goto(`${PROD_URL}/order-tracking/${latestOrder.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const custW = await page.locator('img[alt="CleverOps Logo"]').evaluate((img) => img.naturalWidth).catch(() => 0);
      if (custW > 0) {
        report.customer_page_logo = 'PASS';
        console.log('✅ Customer order tracking logo loaded (naturalWidth:', custW, ')');
      }
    }

  } catch (err) {
    console.error('❌ Browser verification error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n==================================================');
  console.log('FINAL BRANDING & FAVICON PRODUCTION MATRIX');
  console.log('==================================================');
  console.table(report);

  console.log('\nEXACT PRODUCTION ASSET PATHS USED:');
  console.log('1. Main logo: /logo.png');
  console.log('2. Favicon: /favicon.ico?v=20260811');
  console.log('3. Apple icon: /apple-touch-icon.png?v=20260811');
  console.log('4. PWA 192: /icon-192.png');
  console.log('5. PWA 512: /icon-512.png');
}

runLiveBrandingVerification();
