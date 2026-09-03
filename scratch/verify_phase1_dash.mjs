import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function verifyPhase1() {
  console.log('=== VERIFYING PHASE 1: OWNER DASHBOARD ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('[Console Error]:', msg.text());
      consoleErrors.push(msg.text());
    }
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[Network Error ${res.status()}]:`, res.url());
      networkErrors.push(`${res.status()} ${res.url()}`);
    }
  });

  // Login as Owner
  console.log('Logging in at /login as dsoni1281@gmail.com...');
  await page.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="email"]');

  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');

  console.log('Waiting for dashboard navigation...');
  await page.waitForURL('**/dashboard**', { timeout: 20000 });

  // Wait until loading spinner disappears
  console.log('Waiting for dashboard content to load...');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached', timeout: 20000 });
  await page.waitForTimeout(1500);

  const dashUrl = page.url();
  console.log('Current Dashboard URL:', dashUrl);

  const dashScreenPath = path.join(SCRATCH_DIR, 'phase9a_step1_owner_dashboard.png');
  await page.screenshot({ path: dashScreenPath });
  fs.copyFileSync(dashScreenPath, path.join(ARTIFACTS_DIR, 'phase9a_step1_owner_dashboard.png'));
  console.log('Saved phase9a_step1_owner_dashboard.png');

  console.log('Console Errors:', consoleErrors);
  console.log('Network Errors:', networkErrors);

  await browser.close();
}

verifyPhase1().catch(err => {
  console.error('Error verifying Phase 1:', err);
  process.exit(1);
});
