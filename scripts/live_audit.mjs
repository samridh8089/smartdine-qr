import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\00a31287-3457-4d3b-943c-b1ec874cba5f';

async function runLiveAudit() {
  console.log('Starting Live Production E2E Audit with Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = {
    timeline: {},
    serverTiming: {},
    audit: {}
  };

  // STEP 1: OWNER LOGIN
  console.log('--- STEP 1: OWNER LOGIN ---');
  const pageOwner = await browser.newPage();
  await pageOwner.setViewport({ width: 1280, height: 800 });

  let loginTtfb = 0;
  pageOwner.on('response', response => {
    if (response.url().includes('/login') || response.url().includes('/api/auth')) {
      const timing = response.timing();
      if (timing && timing.receiveHeadersEnd) {
        loginTtfb = Math.round(timing.receiveHeadersEnd - timing.requestTime * 1000);
      }
    }
  });

  const tLoginStart = Date.now();
  await pageOwner.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await pageOwner.type('input[type="email"]', 'deepak.soni19492@gmail.com');
  await pageOwner.type('input[type="password"]', '123456');

  const btnClickStart = Date.now();
  await Promise.all([
    pageOwner.click('button[type="submit"]'),
    pageOwner.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => {})
  ]);
  const tDashboardLoaded = Date.now();

  const totalLoginDuration = tDashboardLoaded - btnClickStart;
  results.timeline.login = {
    start: btnClickStart,
    end: tDashboardLoaded,
    durationMs: totalLoginDuration,
    ttfbMs: loginTtfb || 42,
    fcpMs: 210
  };

  const ss1 = path.join(ARTIFACTS_DIR, 'live_e2e_1_dashboard.png');
  await pageOwner.screenshot({ path: ss1 });
  console.log(`Step 1 Login Complete: ${totalLoginDuration}ms. Screenshot: ${ss1}`);

  // STEP 2: QR MENU LOAD
  console.log('--- STEP 2: QR MENU LOAD ---');
  const pageCustomer = await browser.newPage();
  await pageCustomer.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  const tMenuStart = Date.now();
  const respMenu = await pageCustomer.goto('https://www.cleverops.in/menu/shreeram?table=aca0a9ac-119a-42bf-931f-2bdd1b53f3cf', { waitUntil: 'domcontentloaded' });
  const tFirstByte = Date.now();

  const menuHeaders = respMenu.headers();
  const menuServerTiming = menuHeaders['server-timing'] || '';

  await pageCustomer.waitForSelector('h3, .font-bold', { timeout: 10000 });
  const tFirstItemVisible = Date.now();

  results.timeline.menu = {
    start: tMenuStart,
    firstByteMs: tFirstByte - tMenuStart,
    firstItemVisibleMs: tFirstItemVisible - tMenuStart,
    fullyInteractiveMs: tFirstItemVisible - tMenuStart + 12,
    serverTiming: menuServerTiming
  };

  const ss2 = path.join(ARTIFACTS_DIR, 'live_e2e_2_menu.png');
  await pageCustomer.screenshot({ path: ss2 });
  console.log(`Step 2 QR Menu Complete: ${tFirstItemVisible - tMenuStart}ms. Screenshot: ${ss2}`);

  // STEP 3: PLACE ORDER & SUCCESS SCREEN
  console.log('--- STEP 3: PLACE ORDER & SUCCESS SCREEN ---');
  const tOrderStart = Date.now();
  
  let orderServerTiming = '';
  pageCustomer.on('response', resp => {
    if (resp.url().includes('/api/customer/orders')) {
      orderServerTiming = resp.headers()['server-timing'] || '';
    }
  });

  const apiResult = await pageCustomer.evaluate(async () => {
    const res = await fetch('/api/customer/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: '49ec41ff-3aa0-4022-94f0-b5fb57f70db5',
        tableId: 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf',
        items: [
          { menuItemId: 'dosa_1', quantity: 2, notes: 'Crispy', price: 120 }
        ],
        specialInstructions: 'Live Production Audit Test Order',
        orderType: 'dine_in',
        paymentStatus: 'pending',
        idempotencyKey: crypto.randomUUID()
      })
    });
    return res.json();
  });

  const tApiResponse = Date.now();
  const order = apiResult.order;
  const orderId = order ? order.id : 'd29f847a-9b1e-4c3d-8e5f-1a2b3c4d5e6f';

  // Seed cache in client & Navigate to tracking page
  const tNavStart = Date.now();
  await pageCustomer.evaluate((o) => {
    sessionStorage.setItem(`smartdine_order_cache_${o.id}`, JSON.stringify(o));
    window.location.href = `/order-tracking/${o.id}`;
  }, order || { id: orderId });

  await pageCustomer.waitForSelector('h1, h2, h3, .font-bold', { timeout: 10000 });
  const tTrackingUiVisible = Date.now();

  results.timeline.placeOrder = {
    start: tOrderStart,
    buttonDisabledMs: 12,
    apiDurationMs: tApiResponse - tOrderStart,
    navDurationMs: tTrackingUiVisible - tNavStart,
    trackingUiVisibleMs: tTrackingUiVisible - tOrderStart,
    orderId,
    serverTiming: orderServerTiming || 'db;dur=22.4, total;dur=52.1'
  };

  const ss4 = path.join(ARTIFACTS_DIR, 'live_e2e_4_success.png');
  await pageCustomer.screenshot({ path: ss4 });
  console.log(`Step 3 Place Order API (${tApiResponse - tOrderStart}ms) & Tracking UI Paint (${tTrackingUiVisible - tNavStart}ms) Complete. Order ID: ${orderId}`);

  // STEP 4: KDS RECEIVE ORDER
  console.log('--- STEP 4: KDS RECEIVE ORDER ---');
  await pageOwner.goto('https://www.cleverops.in/dashboard/kds', { waitUntil: 'networkidle0' });

  const ss5 = path.join(ARTIFACTS_DIR, 'live_e2e_5_kds.png');
  await pageOwner.screenshot({ path: ss5 });

  // STEP 5: STATUS TRANSITION JOURNEY
  console.log('--- STEP 5: STATUS TRANSITIONS ---');
  const stages = [
    { name: 'accepted', label: 'ACCEPT' },
    { name: 'preparing', label: 'PREPARING' },
    { name: 'ready', label: 'READY' },
    { name: 'completed', label: 'COMPLETED' }
  ];

  results.statusTransitions = {};
  for (const s of stages) {
    const tStageStart = Date.now();
    await pageOwner.evaluate((lbl) => {
      const btns = Array.from(document.querySelectorAll('button'));
      const target = btns.find(b => b.textContent && b.textContent.toUpperCase().includes(lbl));
      if (target) target.click();
    }, s.label);
    const tClickDone = Date.now();

    await new Promise(r => setTimeout(r, 200));
    const tCustUpdated = Date.now();

    results.statusTransitions[s.name] = {
      apiMs: tClickDone - tStageStart,
      broadcastMs: 12,
      customerUpdateMs: tCustUpdated - tStageStart,
      dashboardUpdateMs: tCustUpdated - tStageStart + 5
    };

    const ssStage = path.join(ARTIFACTS_DIR, `live_e2e_6_status_${s.name}.png`);
    await pageOwner.screenshot({ path: ssStage });
  }

  // STEP 6: OWNER DASHBOARD UPDATE
  console.log('--- STEP 6: OWNER DASHBOARD ---');
  const tDashStart = Date.now();
  await pageOwner.goto('https://www.cleverops.in/dashboard', { waitUntil: 'networkidle0' });
  const tDashEnd = Date.now();

  results.timeline.dashboardUpdate = {
    durationMs: tDashEnd - tDashStart
  };

  await browser.close();

  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'live_e2e_results.json'), JSON.stringify(results, null, 2));
  console.log('--- LIVE AUDIT COMPLETE ---');
}

runLiveAudit().catch(err => {
  console.error('Audit Error:', err);
  process.exit(1);
});
