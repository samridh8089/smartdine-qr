const p = require('c:/Users/admin/smartdine-qr/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\9720eddb-f290-4494-8524-ae806dff2e86\\screenshots\\phase21';
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

async function navFounder(page, mode = 'live') {
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
  await sleep(300);
  await inject(page);
  await page.evaluate((m) => { sessionStorage.setItem('founder_active_mode', m); }, mode);
  await page.goto(BASE_URL + '/dashboard/founder/control-center', { waitUntil: 'domcontentloaded' });
  await sleep(7000); // wait for events to load
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
    // ─── Founder Live (after order placed by phase21_sql_proof.cjs) ──────
    console.log('[01] Founder Live mode...');
    await navFounder(page, 'live');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-founder-live.png') });
    console.log('✅ 01-founder-live.png');

    // ─── Click Timeline tab ─────────────────────────────────────────────
    console.log('[02] Timeline tab...');
    await clickBtn(page, 'Timeline');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-timeline.png') });
    console.log('✅ 02-timeline.png');

    // ─── Click Debug tab ────────────────────────────────────────────────
    console.log('[03] Debug mode...');
    await navFounder(page, 'live');
    await clickBtn(page, 'Debug');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-debug-counters.png'), fullPage: true });
    console.log('✅ 03-debug-counters.png');

    // ─── Inspector panel ────────────────────────────────────────────────
    console.log('[04] Inspector...');
    await navFounder(page, 'live');
    await clickBtn(page, 'Inspector');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-inspector.png') });
    console.log('✅ 04-inspector.png');

    // ─── Flight Recorder ────────────────────────────────────────────────
    console.log('[05] Flight Recorder...');
    await clickBtn(page, 'Flight');
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-flight-recorder.png') });
    console.log('✅ 05-flight-recorder.png');

    // ─── Live Orders (confirm order visible) ────────────────────────────
    console.log('[06] Live Orders...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await inject(page);
    await page.goto(BASE_URL + '/dashboard/orders', { waitUntil: 'domcontentloaded' });
    await sleep(5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-live-orders.png'), fullPage: true });
    console.log('✅ 06-live-orders.png');

    // ─── KDS (kitchen queue) ────────────────────────────────────────────
    console.log('[07] KDS...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await inject(page);
    await page.goto(BASE_URL + '/dashboard/kds', { waitUntil: 'domcontentloaded' });
    await sleep(5000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-kds.png'), fullPage: true });
    console.log('✅ 07-kds.png');

    // ─── Inventory (stock after order) ──────────────────────────────────
    console.log('[08] Inventory...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await inject(page);
    await page.goto(BASE_URL + '/dashboard/inventory', { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-inventory.png'), fullPage: true });
    console.log('✅ 08-inventory.png');

    console.log('\n===== ALL PHASE 21 SCREENSHOTS DONE =====');
  } catch (err) {
    console.error('Error at URL:', page.url(), '|', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
