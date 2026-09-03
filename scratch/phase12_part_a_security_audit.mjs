import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';

async function gotoWithRetry(page, url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      return;
    } catch (e) {
      if (attempt === retries) throw e;
      console.log(`[Retry ${attempt}/${retries}] Retrying goto ${url}...`);
      await page.waitForTimeout(2000);
    }
  }
}

async function runSecurityAudit() {
  console.log('===============================================================');
  console.log('=== PHASE 12: PART A — SECURITY & RBAC URL AUDIT             ===');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });
  const securityResults = [];

  const roles = [
    { role: 'anonymous', email: null, password: null },
    { role: 'waiter', email: 'samridhtomar8@gmail.com', password: 'FoodyHub@W1_2026!' },
    { role: 'kds', email: 'newlifeofdeepsssa@gmail.com', password: 'FoodyHub@Kds2026!' },
    { role: 'cashier', email: 'deepak.soni19492@gmail.com', password: 'FoodyHub@Cash2026!' },
    { role: 'owner', email: 'dsoni1281@gmail.com', password: 'FoodyHub@Owner2026!' },
    { role: 'super_admin', email: 'admin@cleverops.in', password: 'Admin@12345!' }
  ];

  const testUrls = [
    { path: '/dashboard', allowedRoles: ['owner', 'super_admin'] },
    { path: '/dashboard/inventory', allowedRoles: ['owner', 'super_admin'] },
    { path: '/dashboard/reports', allowedRoles: ['owner', 'super_admin'] },
    { path: '/dashboard/kds', allowedRoles: ['kds', 'owner', 'super_admin'] },
    { path: '/dashboard/settings', allowedRoles: ['owner', 'super_admin'] },
    { path: '/super-admin', allowedRoles: ['super_admin'] }
  ];

  for (const user of roles) {
    console.log(`\nTesting Role: [${user.role.toUpperCase()}]`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    if (user.email) {
      await gotoWithRetry(page, 'https://www.cleverops.in/login');
      await page.fill('input[type="email"]', user.email);
      await page.fill('input[type="password"]', user.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
      console.log(` - Logged in as ${user.email} -> Landing: ${page.url()}`);
    }

    for (const target of testUrls) {
      const fullUrl = `https://www.cleverops.in${target.path}`;
      try {
        await gotoWithRetry(page, fullUrl);
        await page.waitForTimeout(1500);

        const finalUrl = page.url();
        const isAllowed = target.allowedRoles.includes(user.role);

        let isBlocked = false;
        if (!isAllowed) {
          if (!finalUrl.endsWith(target.path) || finalUrl.includes('/login') || finalUrl.includes('/orders') || finalUrl.includes('/kds')) {
            isBlocked = true;
          }
        }

        const pass = isAllowed ? finalUrl.includes(target.path) : isBlocked;
        console.log(`   * Path: ${target.path} | Allowed: ${isAllowed} | Final URL: ${finalUrl} | Protected: ${pass ? 'PASS' : 'FAIL'}`);

        securityResults.push({
          role: user.role,
          targetPath: target.path,
          allowed: isAllowed,
          finalUrl,
          pass
        });
      } catch (err) {
        console.error(`Error navigating to ${fullUrl}:`, err.message);
      }
    }

    if (user.role === 'waiter') {
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase12_security_waiter_blocked.png') });
      console.log('Saved phase12_security_waiter_blocked.png');
    }

    await context.close();
  }

  await browser.close();

  const totalTests = securityResults.length;
  const passedTests = securityResults.filter(r => r.pass).length;
  console.log(`\n=== SECURITY AUDIT RESULT: ${passedTests}/${totalTests} PASSED ===`);

  fs.writeFileSync('scratch/phase12_security_results.json', JSON.stringify({
    passedTests,
    totalTests,
    rate: `${((passedTests / totalTests) * 100).toFixed(1)}%`,
    securityResults
  }, null, 2));
}

runSecurityAudit().catch(console.error);
