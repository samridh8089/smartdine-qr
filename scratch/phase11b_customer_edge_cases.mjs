import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const table1Id = '433daa89-186c-454c-a978-e184a85577b2';

async function runEdgeCases() {
  console.log('===============================================================');
  console.log('=== PHASE 11B: CUSTOMER EDGE CASES VERIFICATION             ===');
  console.log('===============================================================');

  const edgeResults = {};

  // 1. Empty cart test
  console.log('\n[1] Testing Empty Cart submission...');
  const emptyRes = await fetch('https://www.cleverops.in/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, tableId: table1Id, items: [] })
  });
  const emptyData = await emptyRes.json();
  edgeResults['Empty Cart'] = {
    status: emptyRes.status,
    pass: emptyRes.status === 400 && emptyData.error.includes('items are required'),
    response: emptyData
  };
  console.log(' - Empty Cart Result:', edgeResults['Empty Cart']);

  // 2. Missing restaurant ID
  console.log('\n[2] Testing Missing Restaurant ID...');
  const noRestRes = await fetch('https://www.cleverops.in/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId: table1Id, items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }] })
  });
  const noRestData = await noRestRes.json();
  edgeResults['Missing Restaurant ID'] = {
    status: noRestRes.status,
    pass: noRestRes.status === 400,
    response: noRestData
  };
  console.log(' - Missing Restaurant ID Result:', edgeResults['Missing Restaurant ID']);

  // 3. Out of stock item test
  console.log('\n[3] Testing Out of Stock item rejection...');
  // Query for an unavailable item or test non-existent dish ID
  const fakeDishRes = await fetch('https://www.cleverops.in/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table1Id,
      items: [{ menuItemId: '00000000-0000-0000-0000-000000000000', quantity: 1, price: 100 }]
    })
  });
  const fakeDishData = await fakeDishRes.json();
  edgeResults['Out of Stock / Invalid Item'] = {
    status: fakeDishRes.status,
    pass: fakeDishRes.status === 400 && fakeDishData.error.includes('out of stock'),
    response: fakeDishData
  };
  console.log(' - Out of stock / invalid item:', edgeResults['Out of Stock / Invalid Item']);

  // 4. Double Tap (Rapid concurrent submission from 2 devices on same table)
  console.log('\n[4] Testing Double Tap / Concurrent placement on same table...');
  const tapPayload = {
    restaurantId,
    tableId: table1Id,
    items: [{ menuItemId: '549c6942-17d1-4e73-b205-58933ddfb482', quantity: 1, price: 45 }]
  };

  const [resA, resB] = await Promise.all([
    fetch('https://www.cleverops.in/api/customer/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tapPayload) }),
    fetch('https://www.cleverops.in/api/customer/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tapPayload) })
  ]);

  const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
  edgeResults['Double Tap / Concurrent Order'] = {
    statusA: resA.status,
    statusB: resB.status,
    pass: resA.status === 200 && resB.status === 200 && dataA.order?.id === dataB.order?.id,
    orderIdA: dataA.order?.id,
    orderIdB: dataB.order?.id,
    note: 'Both requests safely joined or appended to the same master table order without collision'
  };
  console.log(' - Double Tap Result:', edgeResults['Double Tap / Concurrent Order']);

  // 5. Browser refresh during cart persistence
  console.log('\n[5] Testing Cart persistence across page refresh in Headless Browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  await page.goto(`https://www.cleverops.in/menu/foodyhub/table/${table1Id}`);
  await page.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await page.click('button:has-text("Add +")');
  await page.waitForTimeout(500);

  // Reload page
  await page.reload();
  await page.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Check if View Cart exists
  const viewCartBtn = await page.$('button:has-text("View Cart")');
  edgeResults['Cart Persistence On Refresh'] = {
    pass: Boolean(viewCartBtn),
    cartButtonVisible: Boolean(viewCartBtn)
  };
  console.log(' - Cart Persistence On Refresh:', edgeResults['Cart Persistence On Refresh']);

  // 6. Invalid Table QR code route
  console.log('\n[6] Testing Invalid Table QR code route...');
  await page.goto('https://www.cleverops.in/menu/foodyhub/table/invalid-table-uuid-12345');
  await page.waitForTimeout(3000);
  const bodyText = await page.textContent('body');
  const handledGracefully = bodyText.includes('Menu') || bodyText.includes('Foody Hub') || bodyText.includes('Not Found') || bodyText.includes('Invalid');
  edgeResults['Invalid Table QR Handling'] = {
    pass: handledGracefully,
    detail: 'Page gracefully rendered without Next.js unhandled crash'
  };
  console.log(' - Invalid Table QR Handling:', edgeResults['Invalid Table QR Handling']);

  await browser.close();

  fs.writeFileSync('scratch/edge_cases_results.json', JSON.stringify(edgeResults, null, 2));
  console.log('\n=== ALL EDGE CASES COMPLETED ===');
}

runEdgeCases().catch(console.error);
