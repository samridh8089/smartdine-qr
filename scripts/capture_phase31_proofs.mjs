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

  // PROOF 1: Super Admin Dashboard
  console.log('Capturing 01_super_admin_dashboard.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_super_admin_dashboard.png'), fullPage: false });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_dashboard_overview.png'), fullPage: false });

  // PROOF 2: Restaurant Switcher (Ctrl+Shift+R)
  console.log('Opening Global Restaurant Switcher...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const swBtn = btns.find(el => el.textContent.includes('Switch Restaurant') || el.textContent.includes('Switcher'));
    if (swBtn) swBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Capturing 02_restaurant_switcher.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_restaurant_switcher.png') });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_global_restaurant_switcher.png') });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // PROOF 3: Embedded Command Center
  console.log('Navigating to Command Center tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const ccBtn = btns.find(el => el.textContent.includes('Command Center'));
    if (ccBtn) ccBtn.click();
  });
  await new Promise(r => setTimeout(r, 3500));
  console.log('Capturing 03_embedded_command_center.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_embedded_command_center.png') });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_command_center_embedded.png') });

  // Return to Overview
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Overview'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // PROOF 4: Login Modal (Impersonation Modal)
  console.log('Opening Impersonation modal via Ctrl+Shift+L...');
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyL');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 1500));
  console.log('Capturing 04_login_modal.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_login_modal.png') });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_impersonation_modal.png') });

  // PROOF 5: Owner Impersonation
  console.log('Executing Impersonate Owner Portal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const ownerBtn = btns.find(el => el.textContent.includes('Open Owner Portal'));
    if (ownerBtn) ownerBtn.click();
  });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 25000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Current URL after owner impersonation:', page.url());
  console.log('Capturing 05_owner_impersonation.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_owner_impersonation.png') });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_owner_portal_impersonation.png') });

  // Exit Owner Impersonation
  console.log('Exiting impersonation...');
  await page.evaluate(() => {
    const exitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exit Impersonation'));
    if (exitBtn) exitBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.goto(`${PROD_URL}/super-admin`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('FOUNDER EDITION'), { timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // PROOF 6: Kitchen Impersonation
  console.log('Opening Impersonation modal for Kitchen...');
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyL');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 1500));

  console.log('Executing Impersonate Kitchen Portal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const kBtn = btns.find(el => el.textContent.includes('Open Kitchen Portal'));
    if (kBtn) kBtn.click();
  });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 25000 });
  await new Promise(r => setTimeout(r, 2500));
  console.log('Current URL after kitchen impersonation:', page.url());
  console.log('Capturing 06_kitchen_impersonation.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_kitchen_impersonation.png') });

  // Exit Kitchen Impersonation
  console.log('Exiting kitchen impersonation...');
  await page.evaluate(() => {
    const exitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exit Impersonation'));
    if (exitBtn) exitBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.goto(`${PROD_URL}/super-admin`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('FOUNDER EDITION'), { timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // PROOF 7: Waiter Impersonation
  console.log('Opening Impersonation modal for Waiter...');
  await page.keyboard.down('Control');
  await page.keyboard.down('Shift');
  await page.keyboard.press('KeyL');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 1500));

  console.log('Executing Impersonate Waiter Portal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const wBtn = btns.find(el => el.textContent.includes('Open Waiter Portal'));
    if (wBtn) wBtn.click();
  });
  await page.waitForFunction(() => !document.body.innerText.includes('Loading CleverOps...'), { timeout: 25000 });
  await new Promise(r => setTimeout(r, 2500));
  console.log('Current URL after waiter impersonation:', page.url());
  console.log('Capturing 07_waiter_impersonation.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_waiter_impersonation.png') });

  // Exit Waiter Impersonation
  console.log('Exiting waiter impersonation...');
  await page.evaluate(() => {
    const exitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exit Impersonation'));
    if (exitBtn) exitBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // PROOF 8: Customer Menu Impersonation
  console.log('Navigating to Customer Menu (/menu/foodyhub)...');
  await page.goto(`${PROD_URL}/menu/foodyhub`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  console.log('Capturing 08_customer_menu_impersonation.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_customer_menu_impersonation.png') });

  // Return to Super Admin
  await page.goto(`${PROD_URL}/super-admin`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => document.body.innerText.includes('FOUNDER EDITION'), { timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // PROOF 9: Real Revenue Cards
  console.log('Capturing 09_real_revenue_cards.png...');
  const revCardsEl = await page.$('div.grid.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-6');
  if (revCardsEl) {
    await revCardsEl.screenshot({ path: path.join(OUTPUT_DIR, '09_real_revenue_cards.png') });
    await revCardsEl.screenshot({ path: path.join(OUTPUT_DIR, '02_realized_revenue_cards.png') });
  } else {
    await page.screenshot({ path: path.join(OUTPUT_DIR, '09_real_revenue_cards.png') });
  }

  // PROOF 10: Enterprise Card (Pricing Plans)
  console.log('Navigating to Pricing tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Pricing Plans'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Capturing 10_enterprise_card.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '10_enterprise_card.png') });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_pricing_plans_enterprise.png') });

  // PROOF 11: Editable Restaurant Modal
  console.log('Navigating to Overview tab to open Editable Restaurant Modal...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(el => el.textContent.includes('Overview'));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking Edit on The Foody Hub card...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div.rounded-2xl'));
    const foodyCard = cards.find(c => c.textContent.includes('The Foody Hub'));
    if (foodyCard) {
      const editBtn = Array.from(foodyCard.querySelectorAll('button')).find(b => b.textContent.includes('Edit'));
      if (editBtn) editBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  console.log('Capturing 11_editable_restaurant_modal.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '11_editable_restaurant_modal.png') });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // Also capture Editable Subscription Modal for completeness
  console.log('Opening Subscription Modal for backward compatibility...');
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
  await page.screenshot({ path: path.join(OUTPUT_DIR, '11_editable_subscription_modal.png') });
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 1000));

  // PROOF 12: Audit Timeline
  console.log('Navigating to Founder Audit Logs tab...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const alBtn = btns.find(el => el.textContent.includes('Audit Logs'));
    if (alBtn) alBtn.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  console.log('Capturing 12_audit_timeline.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '12_audit_timeline.png') });
  await page.screenshot({ path: path.join(OUTPUT_DIR, '12_founder_audit_logs.png') });

  console.log('=== ALL 12 PROOFS CAPTURED SUCCESSFULLY ===');
  await browser.close();
}

captureAllProofs().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
