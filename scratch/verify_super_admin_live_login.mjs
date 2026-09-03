import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function runLiveVerification() {
  console.log('=== STARTING LIVE BROWSER VERIFICATION ===');
  console.log('Target URL: https://www.cleverops.in/login');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });

  try {
    // 1. Navigate to login
    console.log('Navigating to login page...');
    await page.goto('https://www.cleverops.in/login', { waitUntil: 'networkidle', timeout: 30000 });

    // 2. Fill login form
    console.log('Filling login credentials for admin@cleverops.in...');
    await page.fill('input[type="email"]', 'admin@cleverops.in');
    await page.fill('input[type="password"]', 'Admin@12345!');

    // Take screenshot of login form filled
    await page.screenshot({ path: 'scratch/login_filled.png' });

    // 3. Click Sign In
    console.log('Submitting login form...');
    await Promise.all([
      page.waitForURL('**/super-admin**', { timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);

    console.log('Navigated to:', page.url());

    // 4. Wait for Super Admin Dashboard elements to render
    console.log('Waiting for Super Admin Dashboard components...');
    await page.waitForSelector('text=Global Platform Dashboard', { timeout: 15000 });
    await page.waitForSelector('text=Monthly Revenue', { timeout: 15000 });

    // Wait 2 seconds for all stats & plans to stabilize
    await page.waitForTimeout(2000);

    // 5. Capture final screenshot of Super Admin Dashboard
    const screenshotPath = 'scratch/super_admin_dashboard.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`[SUCCESS] Super Admin Dashboard screenshot saved to: ${screenshotPath}`);

    // Also copy screenshot to artifact dir
    const artifactDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
    const artifactScreenshotPath = path.join(artifactDir, 'super_admin_dashboard.png');
    fs.copyFileSync(screenshotPath, artifactScreenshotPath);
    console.log(`Copied screenshot to: ${artifactScreenshotPath}`);

    // 6. Check errors
    console.log('\n--- VERIFICATION AUDIT ---');
    console.log(`Current URL: ${page.url()}`);
    console.log(`Console errors (${consoleErrors.length}):`, consoleErrors);
    console.log(`Page errors (${pageErrors.length}):`, pageErrors);

    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected: ${pageErrors.join('; ')}`);
    }

    console.log('\n[SUCCESS] LIVE VERIFICATION COMPLETED WITH ZERO ERRORS!');
  } catch (err) {
    console.error('Verification failed:', err);
    await page.screenshot({ path: 'scratch/error_screen.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runLiveVerification();
