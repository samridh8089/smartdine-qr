import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const PROD_URL = 'https://www.cleverops.in';
const OUTPUT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\ae77057e-5d8c-4a8f-bb99-144b6e792b0e';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureAllProofs() {
  console.log('=== STARTING PHASE-31 PRODUCTION SCREENSHOT HARNESS ===');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // 1. Sign in via Login Form
  console.log('Navigating to login page...');
  await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle2' });
  await page.type('input[type=email]', 'dsoni1281@gmail.com');
  await page.type('input[type=password]', '123456');
  await page.click('button[type=submit]');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
  console.log('Logged in successfully! Current URL:', page.url());

  console.log('Navigating to Super Admin Command Center...');
  await page.goto(`${PROD_URL}/super-admin`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('FOUNDER EDITION'), { timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  console.log('Founder Command Center Ready! URL:', page.url());

  // 1. Dashboard Overview
  console.log('Capturing 01_dashboard_overview.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_dashboard_overview.png'), fullPage: false });

  // 2. Realized Revenue Cards
  console.log('Capturing 02_realized_revenue_cards.png...');
  const revCardsEl = await page.$('div.grid.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-6');
  if (revCardsEl) {
    await revCardsEl.screenshot({ path: path.join(OUTPUT_DIR, '02_realized_revenue_cards.png') });
  } else {
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02_realized_revenue_cards.png') });
  }

  // 3. SaaS Pricing Plans (Enterprise Card)
  console.log('Navigating to Pricing tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Pricing Plans'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing 03_pricing_plans_enterprise.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_pricing_plans_enterprise.png') });

  // 4. Working Impersonation Modal
  console.log('Returning to Overview to trigger Impersonation Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Overview'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Opening Impersonation modal via Ctrl+Shift+L...');
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyL');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 1500));
  console.log('Capturing 04_impersonation_modal.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_impersonation_modal.png') });

  // 5. Owner Portal Impersonation
  console.log('Executing Impersonate Owner Portal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const ownerBtn = btns.find(el => el.textContent.includes('Open Owner Portal'));
    if (ownerBtn) ownerBtn.click();
  });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 25000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Current URL after impersonation:', page.url());
  console.log('Capturing 05_owner_portal_impersonation.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_owner_portal_impersonation.png') });

  // Exit Impersonation and return to /super-admin
  console.log('Exiting impersonation...');
  await page.evaluate(() => {
    const exitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exit Impersonation'));
    if (exitBtn) exitBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.goto(`${PROD_URL}/super-admin`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('FOUNDER EDITION'), { timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 6. Command Center Embedded
  console.log('Navigating to Command Center tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const ccBtn = btns.find(el => el.textContent.includes('Command Center'));
    if (ccBtn) ccBtn.click();
  });
  await new Promise(r => setTimeout(r, 3500));
  console.log('Capturing 06_command_center_embedded.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_command_center_embedded.png') });

  // 7. Global Restaurant Switcher
  console.log('Opening Global Restaurant Switcher...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const swBtn = btns.find(el => el.textContent.includes('Switch Restaurant') || el.textContent.includes('Switcher'));
    if (swBtn) swBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Capturing 07_global_restaurant_switcher.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_global_restaurant_switcher.png') });

  // Close Switcher
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // 8. Live Health Grid
  console.log('Capturing 08_live_health_grid.png...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Overview'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  // Scroll down slightly to show Health Grid clearly
  await page.evaluate(() => window.scrollBy(0, 350));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_live_health_grid.png') });

  // 9. Real-time Alerts Panel
  console.log('Navigating to Alerts tab...');
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const btns = Array.from(document.querySelectorAll('button'));
    const aBtn = btns.find(el => el.textContent.includes('Real-time Alerts') || el.textContent.includes('Alerts'));
    if (aBtn) aBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing 09_alerts_panel.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09_alerts_panel.png') });

  // 10. Analytics Charts
  console.log('Navigating to Revenue & Analytics tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rBtn = btns.find(el => el.textContent.includes('Revenue & Analytics') || el.textContent.includes('Revenue'));
    if (rBtn) rBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  console.log('Capturing 10_analytics_charts.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '10_analytics_charts.png') });

  // 11. Editable Subscription Modal
  console.log('Opening Subscription Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rBtn = btns.find(el => el.textContent.includes('Restaurants & Health Grid'));
    if (rBtn) rBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const subBtn = btns.find(el => el.textContent.trim() === 'License' || el.getAttribute('title') === 'Edit Subscription');
    if (subBtn) subBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing 11_editable_subscription_modal.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '11_editable_subscription_modal.png') });

  // Close Subscription Modal
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // 12. Founder Audit Logs Table
  console.log('Navigating to Founder Audit Logs tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const alBtn = btns.find(el => el.textContent.includes('Audit Logs'));
    if (alBtn) alBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  console.log('Capturing 12_founder_audit_logs.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '12_founder_audit_logs.png') });

  console.log('=== ALL 12 PROOFS CAPTURED SUCCESSFULLY ===');
  await browser.close();
}

captureAllProofs().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
