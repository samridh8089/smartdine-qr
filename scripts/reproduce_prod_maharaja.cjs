const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b2c2e285-1d6c-4421-9a44-cbed460919e6';

async function main() {
  console.log('=== STEP 1: Check Production Version ===');
  const versionRes = await fetch('https://cleverops.in/api/version');
  const versionData = await versionRes.json();
  console.log('Production Version Info:', JSON.stringify(versionData, null, 2));

  console.log('\n=== STEP 2: Launch Browser Context for Owner on cleverops.in ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage = await ownerContext.newPage();

  const ownerConsoleLogs = [];
  const networkWsEvents = [];

  ownerPage.on('console', msg => {
    const text = `[Owner Console ${msg.type()}]: ${msg.text()}`;
    ownerConsoleLogs.push(text);
    if (msg.text().includes('Realtime') || msg.text().includes('floorplan') || msg.text().includes('order') || msg.text().includes('table')) {
      console.log(text);
    }
  });

  ownerPage.on('websocket', ws => {
    console.log('[Owner WebSocket Opened]:', ws.url());
    ws.on('framesent', f => {
      networkWsEvents.push({ type: 'sent', payload: f.payload });
    });
    ws.on('framereceived', f => {
      networkWsEvents.push({ type: 'received', payload: f.payload });
      if (typeof f.payload === 'string' && (f.payload.includes('table') || f.payload.includes('order') || f.payload.includes('floorplan'))) {
        console.log('[WS RECV MATCH]:', f.payload.slice(0, 200));
      }
    });
  });

  console.log('Navigating to cleverops.in login...');
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await ownerPage.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      break;
    } catch (e) {
      console.warn(`Attempt ${attempt} navigation failed, retrying...`, e.message);
      await ownerPage.waitForTimeout(2000);
    }
  }

  console.log('Logging in as dsoni1281@gmail.com...');
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', '123456');
  await ownerPage.click('button[type="submit"]');

  await ownerPage.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 25000 });
  console.log('Owner logged in successfully! Current URL:', ownerPage.url());

  // Get active restaurant details from localStorage / state
  const restInfo = await ownerPage.evaluate(() => {
    const stored = localStorage.getItem('smartdine_active_restaurant') || localStorage.getItem('current_restaurant');
    return {
      storage: stored,
      keys: Object.keys(localStorage)
    };
  });
  console.log('Restaurant Info from localStorage:', restInfo);

  // Navigate to Tables & QRs / Floor Layout
  console.log('\n=== STEP 3: Navigate to Tables & Floor Layout ===');
  await ownerPage.goto('https://cleverops.in/dashboard/tables', { waitUntil: 'networkidle' });
  await ownerPage.waitForTimeout(3000);

  // Take screenshot of Floor Layout before order
  const floorBeforePath = path.join(ARTIFACT_DIR, 'prod_floor_layout_before.png');
  await ownerPage.screenshot({ path: floorBeforePath, fullPage: true });
  console.log('Saved Floor Layout before order screenshot to:', floorBeforePath);

  // Find table maharaja card and its QR button
  console.log('Finding Maharaja table and opening QR or Drawer...');
  const maharajaCard = ownerPage.locator('text=maharaja').first();
  await maharajaCard.scrollIntoViewIfNeeded();

  // Let's get the QR link or table ID
  // In FloorLayoutManager, TableNode has a QR button with aria-label or title
  const qrIcon = ownerPage.locator('button[title*="QR"], button:has(svg)').filter({ has: ownerPage.locator('xpath=ancestor::*[contains(., "maharaja")]') });
  console.log('QR icons found:', await qrIcon.count());

  // Click View Digital Menu in top right to see restaurant slug
  const viewMenuBtn = ownerPage.locator('a:has-text("View Digital Menu"), button:has-text("View Digital Menu")').first();
  const menuHref = await viewMenuBtn.getAttribute('href');
  console.log('Digital Menu Href:', menuHref);

  // Let's also click on the maharaja card to open the drawer
  await maharajaCard.click();
  await ownerPage.waitForTimeout(1000);

  // Extract all table data directly from DOM or window
  const tablesDump = await ownerPage.evaluate(() => {
    // Find all table nodes in floor layout
    const nodes = Array.from(document.querySelectorAll('*[data-table-id], div[class*="table"], div[style*="left:"]'));
    return nodes.map(n => ({
      id: n.getAttribute('data-table-id'),
      text: n.innerText ? n.innerText.slice(0, 80) : '',
      dataset: { ...n.dataset }
    })).filter(n => n.text.includes('maharaja') || n.text.includes('T-14'));
  });
  console.log('Tables Dump from DOM:', tablesDump);

  // Let's also inspect all network requests or fetch the tables API directly using owner's auth
  const apiTables = await ownerPage.evaluate(async () => {
    try {
      const res = await fetch('/api/admin/sql-proof', { method: 'POST' }).catch(() => null);
      // or check window.__NEXT_DATA__ or localStorage
      const token = localStorage.getItem('smartdine_auth_token_v2');
      return { token: !!token };
    } catch (e) {
      return { err: e.message };
    }
  });
  console.log('API info:', apiTables);

  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'prod_owner_console.log'),
    ownerConsoleLogs.join('\n')
  );
  fs.writeFileSync(
    path.join(ARTIFACT_DIR, 'prod_ws_events.json'),
    JSON.stringify(networkWsEvents, null, 2)
  );

  console.log('\n=== Test execution completed initial inspection ===');
  await browser.close();
}

main().catch(err => {
  console.error('Error in test:', err);
  process.exit(1);
});
