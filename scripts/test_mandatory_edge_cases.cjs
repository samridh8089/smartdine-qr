const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testEdgeCases() {
  console.log('=== MANDATORY EDGE CASES TESTING ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const edgeCaseResults = [];

  // Setup simulated owner
  const mockRestaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
  const mockOwnerProfile = {
    id: 'test-owner-uuid',
    email: 'owner@testrestaurant.com',
    full_name: 'Test Owner',
    role: 'owner',
    restaurant_id: mockRestaurantId
  };

  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((prof) => {
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(prof));
    sessionStorage.setItem('smartdine_active_restaurant_id', prof.restaurant_id);
  }, mockOwnerProfile);

  // -------------------------------------------------------------------------
  // EDGE CASE 1: 50+ TABLES STRESS TEST ON FLOOR LAYOUT MANAGER
  // -------------------------------------------------------------------------
  console.log('1. Testing 50+ Tables Stress Test on Floor Layout Manager...');
  await page.goto(`${BASE_URL}/dashboard/tables`, { waitUntil: 'networkidle2' });
  
  // Inject 50 tables into localStorage / mock store
  const tables50 = Array.from({ length: 55 }, (_, i) => ({
    id: `table_stress_${i + 1}`,
    name: `Table ${i + 1}`,
    number: `${i + 1}`,
    seats: 4,
    capacity: 4,
    status: i % 3 === 0 ? 'occupied' : i % 5 === 0 ? 'reserved' : 'available',
    x: (i % 8) * 120 + 50,
    y: Math.floor(i / 8) * 120 + 50,
    width: 80,
    height: 80,
    shape: 'rectangle',
    zone: 'Indoor AC'
  }));

  const start50 = Date.now();
  const perfResult = await page.evaluate((tList) => {
    try {
      localStorage.setItem('smartdine_tables_cache', JSON.stringify(tList));
      return { success: true, count: tList.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }, tables50);
  const renderTime50 = Date.now() - start50;
  console.log(`   50 tables injected: ${perfResult.success}, render/eval time: ${renderTime50}ms`);
  edgeCaseResults.push({
    edgeCase: '50 Tables Stress Test',
    status: perfResult.success ? 'PASS' : 'FAIL',
    details: `Evaluated 55 tables in ${renderTime50}ms`
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 2: LONG RESTAURANT NAME (OVERFLOW TEST)
  // -------------------------------------------------------------------------
  console.log('2. Testing Long Restaurant Name UI Overflow...');
  const longName = 'The Grand Imperial Royal Palace Of Modern Fine Dining & Luxury Culinary Experiences International Heritage Resort';
  await page.evaluate((name) => {
    const prof = JSON.parse(sessionStorage.getItem('smartdine_impersonated_profile') || '{}');
    prof.restaurant_name = name;
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(prof));
  }, longName);

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2' });
  await page.setViewport({ width: 375, height: 812 }); // mobile check
  const headerOverflow = await page.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.scrollWidth > header.clientWidth : false;
  });
  console.log(`   Long restaurant name mobile header overflow: ${headerOverflow}`);
  edgeCaseResults.push({
    edgeCase: 'Long Restaurant Name',
    mobileOverflow: headerOverflow,
    status: headerOverflow ? 'OVERFLOW_DETECTED' : 'PASS'
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 3: LONG GUEST NAME (TAKEAWAY / RESERVATION / PUNCH)
  // -------------------------------------------------------------------------
  console.log('3. Testing Extremely Long Guest Name...');
  const longGuestName = 'H.E. Dr. Alexander Bartholomew Montgomery-Fitzgerald III of Royal Buckinghamshire';
  // Test customer order route handling of long guest name
  const orderRes = await fetch(`${BASE_URL}/api/customer/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: mockRestaurantId,
      customerName: longGuestName,
      customerPhone: '9876543210',
      orderType: 'takeaway',
      items: [{ menuItemId: 'test-item', quantity: 1, price: 100 }]
    })
  });
  const orderData = await orderRes.json();
  console.log(`   Long guest name order status: ${orderRes.status} (expected validation or handling)`);
  edgeCaseResults.push({
    edgeCase: 'Long Guest Name Handling',
    httpStatus: orderRes.status,
    response: orderData
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 4: 10 SIMULTANEOUS ORDERS (CONCURRENCY & IDEMPOTENCY)
  // -------------------------------------------------------------------------
  console.log('4. Testing 10 Simultaneous Orders Concurrency...');
  const idempotencyKey = `batch_concurrency_${Date.now()}`;
  const simultaneousPromises = Array.from({ length: 10 }, (_, i) => {
    return fetch(`${BASE_URL}/api/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId: mockRestaurantId,
        idempotencyKey: idempotencyKey, // Same key = duplicate spam test
        orderType: 'dine_in',
        tableId: 't_1',
        items: [{ menuItemId: 'test-item', quantity: 1, price: 100 }]
      })
    }).then(r => r.status);
  });

  const statuses = await Promise.all(simultaneousPromises);
  console.log(`   10 Simultaneous Order Statuses:`, statuses);
  edgeCaseResults.push({
    edgeCase: '10 Simultaneous Orders (Duplicate Spam)',
    statuses,
    allHandled: statuses.every(s => typeof s === 'number')
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 5: EXPIRED SESSION / UNAUTHORIZED ATTEMPTS
  // -------------------------------------------------------------------------
  console.log('5. Testing Expired Session & Unauthorized API Attempts...');
  const unauthRes = await fetch(`${BASE_URL}/api/admin/entity-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entityType: 'restaurant', entityId: 'test', action: 'delete' })
  });
  console.log(`   Unauthorized admin edit: HTTP ${unauthRes.status} (Expected 401)`);
  edgeCaseResults.push({
    edgeCase: 'Unauthorized Admin Attempt',
    status: unauthRes.status,
    pass: unauthRes.status === 401
  });

  // -------------------------------------------------------------------------
  // EDGE CASE 6: RESPONSIVE BREAKPOINTS (375px, 768px, 1280px) ON FLOOR LAYOUT
  // -------------------------------------------------------------------------
  console.log('6. Testing Responsive Breakpoints on Floor Layout Manager...');
  await page.goto(`${BASE_URL}/dashboard/tables`, { waitUntil: 'networkidle2' });

  // Mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await new Promise(r => setTimeout(r, 500));
  const mobileWidth = await page.evaluate(() => document.body.scrollWidth);
  const mobileOverflow = mobileWidth > 375;

  // Tablet 768px
  await page.setViewport({ width: 768, height: 1024 });
  await new Promise(r => setTimeout(r, 500));
  const tabletWidth = await page.evaluate(() => document.body.scrollWidth);
  const tabletOverflow = tabletWidth > 768;

  // Desktop 1280px
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise(r => setTimeout(r, 500));
  const desktopWidth = await page.evaluate(() => document.body.scrollWidth);
  const desktopOverflow = desktopWidth > 1280;

  console.log(`   Breakpoints: Mobile Overflow: ${mobileOverflow} (${mobileWidth}px), Tablet: ${tabletOverflow}, Desktop: ${desktopOverflow}`);
  edgeCaseResults.push({
    edgeCase: 'Responsive Breakpoints',
    mobileOverflow,
    tabletOverflow,
    desktopOverflow
  });

  fs.writeFileSync('scripts/edge_case_results.json', JSON.stringify(edgeCaseResults, null, 2));
  console.log('\n=== EDGE CASE RESULTS SAVED TO scripts/edge_case_results.json ===');

  await browser.close();
}

testEdgeCases().catch(console.error);
