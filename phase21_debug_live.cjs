// Place fresh order + capture Founder debug screenshot AFTER events appear
const https = require('https');
const p = require('c:/Users/admin/smartdine-qr/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const TABLE_6_ID = 'c446c252-d62c-461a-95f0-e6edb4f668f4';
const MENU = {
  brownie: 'cb324256-ae4e-4d37-a47c-d92e67e7fdc9',
  coke: '4808ce74-415d-4ca6-9878-27f0eb4b6063',
};
const SCREENSHOT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\9720eddb-f290-4494-8524-ae806dff2e86\\screenshots\\phase21';
const BASE_URL = 'https://www.cleverops.in';
const OWNER_USER_ID = '311a8235-14ea-400e-9188-3b6b54edd31f';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function post(path_, body) {
  return new Promise((resolve, reject) => {
    const b = JSON.stringify(body);
    const req = https.request({
      hostname: 'www.cleverops.in', port: 443, path: path_, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) }
    }, (res) => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } });
    });
    req.on('error', reject);
    req.write(b); req.end();
  });
}

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

async function main() {
  // 1. Place fresh order on Table 6
  console.log('Placing fresh order on Table 6...');
  const ik = 'p21_debug_' + Date.now();
  const orderRes = await post('/api/customer/orders', {
    restaurantId: RESTAURANT_ID, tableId: TABLE_6_ID, orderType: 'dine_in',
    items: [
      { menuItemId: MENU.brownie, quantity: 1, specialInstructions: '', portionSize: 'full' },
      { menuItemId: MENU.coke,    quantity: 1, specialInstructions: '', portionSize: 'full' },
    ],
    specialInstructions: 'Phase-21 Debug Counter Test', idempotencyKey: ik,
  });
  if (!orderRes.b?.order?.id) { console.error('Order failed', orderRes.b); process.exit(1); }
  const orderId = orderRes.b.order.id;
  console.log('Order:', orderId);

  // 2. Advance through pipeline immediately
  for (const [st, staff] of [['accepted','Ravi Kumar'],['preparing','Suresh Chef'],['ready','Suresh Chef'],['served','Ravi Kumar']]) {
    const r = await post('/api/staff/update-order-status', { orderId, newStatus: st, staffName: staff });
    console.log(st + ':', r.s, r.b?.order?.status || r.b?.error);
    await sleep(1500);
  }

  // 3. Wait for events to propagate to system_events table
  console.log('Waiting 5s for events to settle...');
  await sleep(5000);

  // 4. Open Founder CC and wait 15s for Realtime to deliver all events
  const browser = await p.launch({ headless: true, args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();

  try {
    console.log('Opening Founder CC with 15s wait for Realtime...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await sleep(300);
    await inject(page);
    await page.goto(BASE_URL + '/dashboard/founder/control-center', { waitUntil: 'domcontentloaded' });
    await sleep(15000); // long wait to load historical events from DB

    // Click Debug
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const t = await btn.evaluate(el => el.textContent || '');
      if (t.trim().toLowerCase().includes('debug')) { await btn.click(); break; }
    }
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03b-debug-after-live-order.png'), fullPage: true });
    console.log('✅ 03b-debug-after-live-order.png saved');

    // Also Timeline
    for (const btn of await page.$$('button')) {
      const t = await btn.evaluate(el => el.textContent || '');
      if (t.trim().toLowerCase().includes('live')) { await btn.click(); break; }
    }
    await sleep(1000);
    for (const btn of await page.$$('button')) {
      const t = await btn.evaluate(el => el.textContent || '');
      if (t.trim().toLowerCase() === 'timeline') { await btn.click(); break; }
    }
    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02b-timeline-after-live-order.png') });
    console.log('✅ 02b-timeline-after-live-order.png saved');

    // Event count from page
    const eventCount = await page.evaluate(() => {
      const txt = document.body.innerText;
      const m = txt.match(/(\d+)\s*events/i);
      return m ? m[0] : 'unknown';
    });
    console.log('Event count on page:', eventCount);
    console.log('Order ID used:', orderId);
  } finally {
    await browser.close();
  }
}
main().catch(console.error);
