// Phase-21 Full Proof: fresh order through all pipeline stages + SQL proof + screenshots
const https = require('https');
const p = require('c:/Users/admin/smartdine-qr/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const RESTAURANT_ID = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const OWNER_USER_ID = '311a8235-14ea-400e-9188-3b6b54edd31f';
const BASE_URL = 'https://www.cleverops.in';
const SCREENSHOT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\9720eddb-f290-4494-8524-ae806dff2e86\\screenshots\\phase21';

// Use Table 4 (fresh, no pending orders)
const TABLE_4_ID = '8514189f-b4b5-44fa-bb1a-e39fa0646ff0';
const MENU = {
  margherita: 'd44e96e5-8168-44c9-8186-6d3960810fed', // ✅ verified from DB
  coke: '4808ce74-415d-4ca6-9878-27f0eb4b6063',         // ✅ verified from DB
};

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

async function sqlProof(orderId) {
  const r = await post('/api/admin/sql-proof', {
    secret: 'foody_hub_seed_2026',
    orderId,
  });
  return r.b;
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

async function clickTab(page, text) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const t = await btn.evaluate(el => el.textContent || '');
    if (t.trim().toLowerCase().includes(text.toLowerCase())) {
      await btn.click(); return true;
    }
  }
  return false;
}

async function goFounder(page, tab = 'live') {
  await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
  await sleep(300);
  await inject(page);
  await page.evaluate((t) => { sessionStorage.setItem('founder_active_mode', t); }, tab);
  await page.goto(BASE_URL + '/dashboard/founder/control-center', { waitUntil: 'networkidle0' });
  await sleep(12000); // full wait for events to load from DB
}

async function main() {
  console.log('\n===== PHASE-21 FULL PROOF =====\n');

  // ── 1. Place fresh order (checkout_started + order_created + inventory_reserved emitted)
  console.log('[1] Placing fresh order on Table 4...');
  const ik = 'p21_proof_' + Date.now();
  const orderRes = await post('/api/customer/orders', {
    restaurantId: RESTAURANT_ID, tableId: TABLE_4_ID, orderType: 'dine_in',
    items: [
      { menuItemId: MENU.margherita, quantity: 1, specialInstructions: '', portionSize: 'full' },
      { menuItemId: MENU.coke,       quantity: 1, specialInstructions: '', portionSize: 'full' },
    ],
    specialInstructions: 'Phase-21 Full Proof Order', idempotencyKey: ik,
  });
  if (!orderRes.b?.order?.id) { console.error('Order failed:', JSON.stringify(orderRes.b)); process.exit(1); }
  const orderId = orderRes.b.order.id;
  console.log('✅ Order created:', orderId);
  await sleep(2000);

  // ── 2. Accept → preparing → ready → served
  const steps = [
    ['accepted',  'Ravi Kumar'],
    ['preparing', 'Suresh Chef'],
    ['ready',     'Suresh Chef'],
    ['served',    'Ravi Kumar'],
  ];
  for (const [st, staff] of steps) {
    const r = await post('/api/staff/update-order-status', { orderId, newStatus: st, staffName: staff });
    console.log('✅ ' + st.toUpperCase() + ':', r.s, r.b?.order?.status || r.b?.error);
    await sleep(2000);
  }

  // ── 3. Wait for all async events to settle
  console.log('\n[2] Waiting 6s for all system_events to persist...');
  await sleep(6000);

  // ── 4. SQL Proof
  console.log('\n[3] Running SQL proof...');
  const proof = await sqlProof(orderId);
  if (proof?.success) {
    console.log('\n=== SQL PROOF 1: event_type GROUP BY ===');
    (proof.sql_proof_1_event_type_counts || []).forEach(r => console.log('  ' + r.event_type + ': ' + r.count));
    console.log('  TOTAL events in DB:', proof.sql_proof_1_total);

    console.log('\n=== SQL PROOF 2: recent 30 events ===');
    (proof.sql_proof_2_recent_30 || []).forEach(e =>
      console.log('  ' + (e.created_at||'').substring(11,19), '|', e.event_type.padEnd(22), '|', (e.source_node||'?').padEnd(14), '->', (e.target_node||'?'))
    );

    console.log('\n=== SQL PROOF 3: audit_logs ===');
    (proof.sql_proof_3_audit_logs || []).slice(0,8).forEach(e =>
      console.log('  ' + (e.created_at||'').substring(11,19), '|', e.action)
    );

    console.log('\n=== SQL PROOF 4: events for order ' + orderId.substring(0,8) + ' ===');
    const evts = proof.sql_proof_4_order_events || [];
    if (evts.length > 0) {
      evts.forEach(e => console.log('  ' + e.event_type.padEnd(22) + ' | ' + (e.source_node||'?').padEnd(14) + ' -> ' + (e.target_node||'?')));
      console.log('  TOTAL events for this order:', evts.length);
    } else {
      console.log('  (no events found for this order)');
    }
    console.log('\n  DB Errors:', JSON.stringify(proof.errors));
  } else {
    console.log('SQL proof failed:', JSON.stringify(proof).substring(0,300));
  }

  // ── 5. Screenshots
  console.log('\n[4] Capturing Founder CC screenshots...');
  const browser = await p.launch({ headless: true, args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();
  try {
    // Live Timeline
    await goFounder(page, 'live');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p21-01-timeline.png') });
    console.log('✅ p21-01-timeline.png');

    // Debug panel
    await clickTab(page, 'Debug');
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p21-02-debug-counters.png'), fullPage: true });
    console.log('✅ p21-02-debug-counters.png');

    // Inspector → Inventory
    await goFounder(page, 'live');
    await clickTab(page, 'Inspector');
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p21-03-inspector.png') });
    console.log('✅ p21-03-inspector.png');

    // Flight Recorder
    await clickTab(page, 'Flight');
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p21-04-flight-recorder.png') });
    console.log('✅ p21-04-flight-recorder.png');

    // Inventory dashboard
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await inject(page);
    await page.goto(BASE_URL + '/dashboard/inventory', { waitUntil: 'networkidle0' });
    await sleep(6000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p21-05-inventory-stock.png'), fullPage: true });
    console.log('✅ p21-05-inventory-stock.png');

    // KDS
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await inject(page);
    await page.goto(BASE_URL + '/dashboard/kds', { waitUntil: 'networkidle0' });
    await sleep(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p21-06-kds.png'), fullPage: true });
    console.log('✅ p21-06-kds.png');

    // Live Orders
    await page.goto(BASE_URL + '/login', { waitUntil: 'domcontentloaded' });
    await inject(page);
    await page.goto(BASE_URL + '/dashboard/orders', { waitUntil: 'networkidle0' });
    await sleep(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'p21-07-live-orders.png'), fullPage: true });
    console.log('✅ p21-07-live-orders.png');

    console.log('\n===== ALL PHASE-21 PROOF SCREENSHOTS DONE =====');
    console.log('Order ID:', orderId);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
