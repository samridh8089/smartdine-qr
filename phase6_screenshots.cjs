const puppeteer = require('c:/Users/admin/smartdine-qr/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\9720eddb-f290-4494-8524-ae806dff2e86\\screenshots';
const BASE_URL = 'https://www.cleverops.in';
const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const OWNER_USER_ID = '311a8235-14ea-400e-9188-3b6b54edd31f';

if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Inject impersonated owner session into browser storage
async function injectSession(page) {
  await page.evaluate((restId, userId) => {
    const profile = {
      id: userId,
      user_id: userId,
      role: 'owner',
      full_name: 'Demo Owner',
      email: 'dsoni1281@gmail.com',
      restaurant_id: restId,
      is_active: true,
    };
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(profile));
    sessionStorage.setItem('founder_mode', 'true');
    sessionStorage.setItem('founder_mode_expires', String(Date.now() + 30 * 60 * 1000));
    sessionStorage.setItem('founder_active_mode', 'live');
    localStorage.setItem('smartdine_active_restaurant_id', restId);
    localStorage.setItem('smartdine_current_restaurant_id', restId);
  }, RESTAURANT_ID, OWNER_USER_ID);
}

async function goTo(page, url, label) {
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
  await sleep(500);
  await injectSession(page);
  await page.goto(BASE_URL + url, { waitUntil: 'domcontentloaded' });
  await sleep(4500);
  console.log(`  → ${label} URL: ${page.url()}`);
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    // ─── 01 MENU ───────────────────────────────────────────────────────────
    console.log('\n[01] Menu page...');
    await goTo(page, '/dashboard/menu', 'Menu');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-menu.png'), fullPage: true });
    console.log('✅ 01-menu.png');

    // ─── 02 INVENTORY ──────────────────────────────────────────────────────
    console.log('\n[02] Inventory...');
    await goTo(page, '/dashboard/inventory', 'Inventory');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-inventory.png'), fullPage: true });
    console.log('✅ 02-inventory.png');

    // ─── 03 TABLES ─────────────────────────────────────────────────────────
    console.log('\n[03] Tables...');
    await goTo(page, '/dashboard/tables', 'Tables');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-tables.png'), fullPage: true });
    console.log('✅ 03-tables.png');

    // ─── 04 STAFF ──────────────────────────────────────────────────────────
    console.log('\n[04] Staff...');
    await goTo(page, '/dashboard/staff', 'Staff');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-staff.png'), fullPage: true });
    console.log('✅ 04-staff.png');

    // ─── 05 ORDERS ─────────────────────────────────────────────────────────
    console.log('\n[05] Orders...');
    await goTo(page, '/dashboard/orders', 'Orders');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-order-journey.png'), fullPage: true });
    console.log('✅ 05-order-journey.png');

    // ─── 06 FOUNDER CONTROL CENTER ─────────────────────────────────────────
    console.log('\n[06] Founder Control Center...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await sleep(500);
    await injectSession(page);
    await page.goto(BASE_URL + '/dashboard/founder/control-center', { waitUntil: 'domcontentloaded' });
    await sleep(8000); // Canvas + Realtime init
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-founder.png'), fullPage: false });
    console.log('✅ 06-founder.png — URL:', page.url());

    // Try clicking Live Mode button
    try {
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const txt = await btn.evaluate(el => el.textContent || '');
        if (txt.trim().toLowerCase().includes('live')) {
          await btn.click();
          await sleep(4000);
          console.log('   → Clicked Live Mode tab');
          break;
        }
      }
    } catch (_) {}
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06b-founder-live.png'), fullPage: false });
    console.log('✅ 06b-founder-live.png');

    // ─── 07 INVENTORY DELTA ────────────────────────────────────────────────
    console.log('\n[07] Inventory delta view...');
    await goTo(page, '/dashboard/inventory', 'Inventory-delta');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-inventory-delta.png'), fullPage: true });
    console.log('✅ 07-inventory-delta.png');

    // ─── 08 CUSTOMER QR / WAITER CALL ─────────────────────────────────────
    console.log('\n[08] Customer QR page...');
    await page.goto(BASE_URL + '/menu/foodyhub?table=Table%2012', { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-waiter-call.png'), fullPage: true });
    console.log('✅ 08-waiter-call.png — URL:', page.url());

    // ─── 09 KITCHEN ────────────────────────────────────────────────────────
    console.log('\n[09] Kitchen screen...');
    await goTo(page, '/dashboard/kitchen', 'Kitchen');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-kitchen.png'), fullPage: true });
    console.log('✅ 09-kitchen.png');

    console.log('\n===== ALL SCREENSHOTS DONE =====');
    console.log('Location:', SCREENSHOT_DIR);

  } catch (err) {
    console.error('ERROR at URL:', page.url());
    console.error('Message:', err.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-state.png') }).catch(() => {});
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
