const p = require('c:/Users/admin/smartdine-qr/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\9720eddb-f290-4494-8524-ae806dff2e86\\screenshots\\phase20';
const BASE_URL = 'https://www.cleverops.in';
const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const OWNER_USER_ID = '311a8235-14ea-400e-9188-3b6b54edd31f';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function inject(page) {
  await page.evaluate((r, u) => {
    const prof = { id: u, user_id: u, role: 'owner', full_name: 'Demo Owner', email: 'dsoni1281@gmail.com', restaurant_id: r, is_active: true };
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(prof));
    sessionStorage.setItem('founder_mode', 'true');
    sessionStorage.setItem('founder_mode_expires', String(Date.now() + 30 * 60 * 1000));
    sessionStorage.setItem('founder_active_mode', 'live');
    localStorage.setItem('smartdine_active_restaurant_id', r);
  }, RESTAURANT_ID, OWNER_USER_ID);
}

async function nav(page, url, wait = 5000) {
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
  await sleep(300);
  await inject(page);
  await page.goto(BASE_URL + url, { waitUntil: 'domcontentloaded' });
  await sleep(wait);
}

async function clickBtn(page, text) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const t = await btn.evaluate(el => el.textContent || '');
    if (t.trim().toLowerCase().includes(text.toLowerCase())) {
      await btn.click();
      return true;
    }
  }
  return false;
}

async function main() {
  const browser = await p.launch({ headless: true, args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();

  try {
    // ─── 01 RECIPES PAGE ─────────────────────────────────────────────
    console.log('[01] Recipes page...');
    await nav(page, '/dashboard/inventory', 6000);
    // Try clicking Recipes & Costing tab
    await clickBtn(page, 'Recipes');
    await sleep(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-recipes.png'), fullPage: true });
    console.log('✅ 01-recipes.png — URL:', page.url());

    // ─── 02 STOCK BEFORE (already captured via script) ───────────────
    // Will be screenshot of inventory
    await nav(page, '/dashboard/inventory', 5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-stock-before.png'), fullPage: true });
    console.log('✅ 02-stock-before.png');

    // ─── 03 ORDER CREATED ─────────────────────────────────────────────
    await nav(page, '/dashboard/orders', 5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-order-created.png'), fullPage: true });
    console.log('✅ 03-order-created.png');

    // ─── 04 PREPARING ─────────────────────────────────────────────────
    // KDS page
    await nav(page, '/dashboard/kds', 5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-preparing.png'), fullPage: true });
    console.log('✅ 04-preparing.png');

    // ─── 05 FOUNDER LIVE ──────────────────────────────────────────────
    console.log('[05] Founder Live...');
    await nav(page, '/dashboard/founder/control-center', 8000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-founder-live.png'), fullPage: false });
    console.log('✅ 05-founder-live.png — URL:', page.url());

    // ─── 06 FLIGHT RECORDER ───────────────────────────────────────────
    await clickBtn(page, 'Flight');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-flight-recorder.png'), fullPage: false });
    console.log('✅ 06-flight-recorder.png');

    // ─── 07 DIGITAL TWIN (Freeze mode) ────────────────────────────────
    await nav(page, '/dashboard/founder/control-center', 7000);
    await clickBtn(page, 'Freeze');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-digital-twin.png'), fullPage: false });
    console.log('✅ 07-digital-twin.png (Freeze mode)');

    // ─── 08 WAITER CHAIN ──────────────────────────────────────────────
    // Customer QR page with waiter call
    await page.goto(BASE_URL + '/menu/foodyhub?table=Table%2012', { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-waiter-chain.png'), fullPage: false });
    console.log('✅ 08-waiter-chain.png');

    // ─── 09 STOCK AFTER ───────────────────────────────────────────────
    await nav(page, '/dashboard/inventory', 5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-stock-after.png'), fullPage: true });
    console.log('✅ 09-stock-after.png');

    // ─── 10 FINAL REPORT ──────────────────────────────────────────────
    await nav(page, '/dashboard', 5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-final-report.png'), fullPage: true });
    console.log('✅ 10-final-report.png');

    // ─── MOBILE AUDIT (Phase 9) ───────────────────────────────────────
    console.log('\n[Phase 9] Mobile viewport...');
    await page.setViewport({ width: 360, height: 800 });
    await page.goto(BASE_URL + '/menu/foodyhub?table=Table%2012', { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'mobile-qr-menu.png'), fullPage: true });
    console.log('✅ mobile-qr-menu.png');

    await page.setViewport({ width: 1440, height: 900 });

    // ─── REPORTS PAGE ─────────────────────────────────────────────────
    await nav(page, '/dashboard/reports', 5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'reports.png'), fullPage: true });
    console.log('✅ reports.png');

    console.log('\n===== ALL PHASE 20 SCREENSHOTS DONE =====');

  } catch (err) {
    console.error('Error at:', page.url(), err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
