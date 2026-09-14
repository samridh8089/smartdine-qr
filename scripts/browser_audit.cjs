const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function runAudit() {
  console.log('=== STARTING RALPH LOOP & GSD BROWSER AUDIT ===');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.toString());
  });

  page.on('requestfailed', req => {
    failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
  });

  const routesToTest = [
    { name: 'Landing Page', url: '/' },
    { name: 'Login Page', url: '/login' },
    { name: 'Signup Page', url: '/signup' },
    { name: 'Forgot Password', url: '/forgot-password' },
    { name: 'Reset Password', url: '/reset-password' },
    { name: 'Customer Menu (Non-existent)', url: '/menu/non-existent-restaurant?table=1' },
    { name: 'Customer Order Tracking (Fake ID)', url: '/order-tracking/fake-order-id-1234' },
    { name: 'Owner Dashboard (Unauthenticated)', url: '/dashboard' },
    { name: 'Floor Layout Manager', url: '/dashboard/tables' },
    { name: 'Menu Management', url: '/dashboard/menu' },
    { name: 'Orders Management', url: '/dashboard/orders' },
    { name: 'Kitchen Display System (KDS)', url: '/dashboard/kds' },
    { name: 'Reports Page', url: '/dashboard/reports' },
    { name: 'Billing Page', url: '/dashboard/billing' },
    { name: 'Settings Page', url: '/dashboard/settings' },
    { name: 'Founder Control Center', url: '/dashboard/founder/control-center' },
    { name: 'Super Admin Portal', url: '/super-admin' },
    { name: 'Checkout Page', url: '/checkout' },
    { name: 'Contact Page', url: '/contact' },
    { name: 'About Page', url: '/about' },
    { name: 'Privacy Policy', url: '/privacy-policy' },
    { name: 'Terms Page', url: '/terms' },
    { name: 'Refund Policy', url: '/refund-policy' },
    { name: 'Debug Build Info', url: '/debug/build-info' }
  ];

  const results = [];

  for (const route of routesToTest) {
    console.log(`\nTesting: ${route.name} (${route.url})`);
    consoleErrors.length = 0;
    pageErrors.length = 0;
    failedRequests.length = 0;

    let status = null;
    let title = '';
    let loadTime = 0;

    try {
      const start = Date.now();
      const response = await page.goto(`${BASE_URL}${route.url}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      loadTime = Date.now() - start;
      status = response ? response.status() : 'NO_RESPONSE';
      title = await page.title();

      // Wait 1s for dynamic effects / hydrates
      await new Promise(r => setTimeout(r, 1000));

      // Test responsive viewports
      // 1. Mobile width: 375px
      await page.setViewport({ width: 375, height: 812 });
      await new Promise(r => setTimeout(r, 300));
      const mobileBodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const mobileHasHorizontalOverflow = mobileBodyWidth > 375;

      // 2. Tablet width: 768px
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise(r => setTimeout(r, 300));
      const tabletBodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const tabletHasHorizontalOverflow = tabletBodyWidth > 768;

      // 3. Desktop width: 1280px
      await page.setViewport({ width: 1280, height: 800 });
      await new Promise(r => setTimeout(r, 300));

      // Check for broken links or empty body
      const bodyTextLength = await page.evaluate(() => document.body.innerText.trim().length);

      results.push({
        name: route.name,
        url: route.url,
        status,
        title,
        loadTime,
        bodyTextLength,
        mobileOverflow: mobileHasHorizontalOverflow,
        tabletOverflow: tabletHasHorizontalOverflow,
        errors: [...pageErrors],
        consoleErrors: [...consoleErrors],
        failedRequests: [...failedRequests]
      });

      console.log(`  -> Status: ${status} | Load: ${loadTime}ms | BodyLen: ${bodyTextLength}`);
      if (mobileHasHorizontalOverflow) console.log(`  [OVERFLOW] Mobile viewport has horizontal scroll (${mobileBodyWidth}px > 375px)`);
      if (pageErrors.length > 0) console.log(`  [PAGE ERROR]`, pageErrors);
      if (consoleErrors.length > 0) console.log(`  [CONSOLE ERRORS] ${consoleErrors.length} errors`);

    } catch (err) {
      console.log(`  [CRASH / TIMEOUT] ${err.message}`);
      results.push({
        name: route.name,
        url: route.url,
        status: 'CRASH',
        error: err.message,
        errors: [...pageErrors, err.message],
        consoleErrors: [...consoleErrors],
        failedRequests: [...failedRequests]
      });
    }
  }

  // Save audit report
  fs.writeFileSync('scripts/browser_audit_results.json', JSON.stringify(results, null, 2));
  console.log('\n=== AUDIT RESULTS SAVED TO scripts/browser_audit_results.json ===');

  await browser.close();
}

runAudit().catch(console.error);
