import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const PROD_URL = 'https://www.cleverops.in';

const testMatrix = [
  {
    role: 'Customer (Unauthenticated)',
    email: null,
    password: null,
    prohibited_routes: ['/dashboard', '/dashboard/reports', '/dashboard/inventory', '/super-admin']
  },
  {
    role: 'Waiter',
    email: 'samridhtomar8@gmail.com',
    password: 'FoodyHub@W1_2026!',
    prohibited_routes: ['/super-admin', '/dashboard/reports', '/dashboard/inventory']
  },
  {
    role: 'Kitchen (KDS)',
    email: 'newlifeofdeepsssa@gmail.com',
    password: 'FoodyHub@Kds2026!',
    prohibited_routes: ['/super-admin', '/dashboard/reports', '/dashboard/inventory']
  },
  {
    role: 'Cashier',
    email: 'deepak.soni19492@gmail.com',
    password: 'FoodyHub@Cash2026!',
    prohibited_routes: ['/super-admin', '/dashboard/inventory']
  },
  {
    role: 'Owner',
    email: 'dsoni1281@gmail.com',
    password: 'FoodyHub@Owner2026!',
    prohibited_routes: ['/super-admin']
  },
  {
    role: 'Super Admin',
    email: 'admin@cleverops.in',
    password: 'Admin@12345!',
    allowed_routes: ['/super-admin']
  }
];

async function runSecurityBoundaryAudit() {
  console.log('===============================================================');
  console.log('=== PRIORITY 7: ROLE-BASED ACCESS & SECURITY BOUNDARY AUDIT ===');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });
  const auditResults = [];

  for (const item of testMatrix) {
    console.log(`\nTesting boundaries for role: [${item.role}]...`);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    if (item.email) {
      await page.goto(`${PROD_URL}/login`);
      await page.fill('input[type="email"]', item.email);
      await page.fill('input[type="password"]', item.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
      console.log(` - Successfully authenticated as ${item.role}`);
    }

    if (item.prohibited_routes) {
      for (const route of item.prohibited_routes) {
        await page.goto(`${PROD_URL}${route}`);
        await page.waitForTimeout(4000);
        const finalUrl = page.url();
        const bodyText = await page.evaluate(() => document.body.innerText);

        // Security check: Was access denied, redirected to login/dashboard, or blocked?
        const isBlocked = 
          !finalUrl.endsWith(route) || 
          finalUrl.includes('/login') || 
          finalUrl.includes('/dashboard/orders') || 
          finalUrl.includes('/dashboard/kds') || 
          bodyText.includes('Unauthorized') || 
          bodyText.includes('Access Denied') ||
          bodyText.includes('Sign in');

        const outcome = isBlocked ? 'PASS (BLOCKED)' : 'FAIL (PRIVILEGE ESCALATION)';
        console.log(`   Route [${route}]: ${outcome} (Final URL: ${finalUrl})`);
        auditResults.push({
          role: item.role,
          attempted_route: route,
          final_url: finalUrl,
          access_blocked: isBlocked,
          status: isBlocked ? 'PASS' : 'FAIL'
        });
      }
    }

    if (item.allowed_routes) {
      for (const route of item.allowed_routes) {
        await page.goto(`${PROD_URL}${route}`);
        await page.waitForTimeout(2000);
        const finalUrl = page.url();
        const isAllowed = finalUrl.includes(route);
        console.log(`   Legitimate Route [${route}]: ${isAllowed ? 'PASS (AUTHORIZED)' : 'FAIL'} (Final URL: ${finalUrl})`);
        auditResults.push({
          role: item.role,
          attempted_route: route,
          final_url: finalUrl,
          access_blocked: false,
          status: isAllowed ? 'PASS' : 'FAIL'
        });
      }
    }

    await context.close();
  }

  console.log('\n===============================================================');
  console.log('=== SECURITY RBAC AUDIT SUMMARY MATRIX                      ===');
  console.log('===============================================================');
  console.table(auditResults);

  fs.writeFileSync('scratch/phase18/priority7_results.json', JSON.stringify(auditResults, null, 2));
  await browser.close();
}

runSecurityBoundaryAudit().catch(console.error);
