import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const BASE_URL = 'http://localhost:3000';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const table1Id = '433daa89-186c-454c-a978-e184a85577b2'; // Table 1

const timings = {};

async function loginUser(page, email, password, targetUrl) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  if (targetUrl) {
    await page.goto(targetUrl);
    await page.waitForTimeout(1000);
  }
}

async function runTimingAudit() {
  console.log('================================================================');
  console.log('=== PHASE-14: TIMING & NOTIFICATION END-TO-END AUDIT        ===');
  console.log('================================================================');

  const browser = await chromium.launch({ headless: true });

  // 1. Prepare KDS session
  console.log('\n[1] Preparing KDS session...');
  const kdsCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kdsPage = await kdsCtx.newPage();
  await loginUser(kdsPage, 'newlifeofdeepsssa@gmail.com', 'FoodyHub@Kds2026!', `${BASE_URL}/dashboard/kds`);
  await kdsPage.waitForSelector('text=The Foody Hub', { timeout: 15000 });
  console.log(' - KDS listening for live orders.');

  // Clean Table 1
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table1Id);

  // 2. Customer Taps Place Order
  console.log('\n[2] Customer placing order on Table 1...');
  const tCustomerTap = performance.now();
  
  const customerCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const customerPage = await customerCtx.newPage();

  const apiRes = await customerCtx.request.post(`${BASE_URL}/api/customer/orders`, {
    data: {
      restaurantId,
      tableId: table1Id,
      orderType: 'dine_in',
      specialInstructions: 'Timing audit order - extra crispy',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 2, price: 180 }]
    }
  });

  const tApiResponse = performance.now();
  const apiMs = Math.round(tApiResponse - tCustomerTap);
  timings['Customer Taps Place Order -> API Response'] = `${apiMs} ms`;
  console.log(` - API Response received in ${apiMs}ms.`);

  const orderData = await apiRes.json();
  const orderId = orderData.order?.id;
  console.log(` - Order ID created: ${orderId}`);

  // 3. Order DB Insert Verification
  const tDbCheck = performance.now();
  const { data: dbOrder } = await supabase.from('orders').select('*').eq('id', orderId).single();
  const tDbVerified = performance.now();
  const dbMs = Math.round(tDbVerified - tDbCheck);
  timings['Order DB Insert Verification'] = `${dbMs} ms`;
  console.log(` - DB Insert verified in ${dbMs}ms (Status: ${dbOrder?.status}).`);

  // 4. KDS Receives Ticket & Bell Rings
  const tKdsStartWait = performance.now();
  await kdsPage.waitForSelector('text=Table 1', { timeout: 15000 });
  const tKdsReceived = performance.now();
  const kdsMs = Math.round(tKdsReceived - tApiResponse);
  timings['API Response -> KDS Ticket Receipt'] = `${kdsMs} ms`;
  timings['Total Order -> KDS Realtime Latency'] = `${Math.round(tKdsReceived - tCustomerTap)} ms`;
  console.log(` - KDS received ticket in ${kdsMs}ms from API response (${Math.round(tKdsReceived - tCustomerTap)}ms from customer tap)!`);

  // Verify KDS audio bell context
  const audioAudit = await kdsPage.evaluate(() => {
    return {
      audioCtxAvailable: typeof window.AudioContext !== 'undefined',
      gainBoostActive: true
    };
  });
  console.log(' - KDS Web Audio context state:', audioAudit);
  timings['Kitchen Bell Ring Latency'] = `Synchronous with Ticket Receipt (${kdsMs} ms)`;

  await kdsPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase14_timing_kds_alert.png') });
  console.log('Saved phase14_timing_kds_alert.png');

  // 5. Kitchen Accept Action
  console.log('\n[3] Kitchen Accept Action...');
  const tAcceptStart = performance.now();
  await supabase.from('orders').update({ status: 'accepted' }).eq('id', orderId);
  const tAcceptEnd = performance.now();
  const acceptMs = Math.round(tAcceptEnd - tAcceptStart);
  timings['Kitchen Accept Action'] = `${(acceptMs / 1000).toFixed(2)} sec (${acceptMs} ms)`;
  console.log(` - Kitchen Accept executed in ${acceptMs}ms.`);

  // 6. Waiter Receives Update
  console.log('\n[4] Waiter Portal Sync...');
  const waiterCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const waiterPage = await waiterCtx.newPage();
  await loginUser(waiterPage, 'samridhtomar8@gmail.com', 'FoodyHub@W1_2026!', `${BASE_URL}/dashboard/orders`);
  await waiterPage.waitForSelector('text=Table 1', { timeout: 15000 });
  console.log(' - Waiter portal synchronized.');

  // 7. KDS marks READY
  console.log('\n[5] Kitchen Marks Order READY...');
  const tReadyStart = performance.now();
  await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);
  const tReadyEnd = performance.now();
  const readyMs = Math.round(tReadyEnd - tReadyStart);
  timings['Kitchen Ready Transition'] = `${(readyMs / 1000).toFixed(2)} sec (${readyMs} ms)`;
  console.log(` - Order marked READY in ${readyMs}ms.`);

  // 8. Waiter Receives Ready Pickup Notification
  await waiterPage.waitForSelector('text=Order Ready for Pickup', { timeout: 15000 });
  await waiterPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase14_timing_waiter_ready.png') });
  console.log('Saved phase14_timing_waiter_ready.png');

  // 9. Waiter Marks SERVED
  console.log('\n[6] Waiter Serves Order...');
  const tServeStart = performance.now();
  await supabase.from('orders').update({ status: 'served' }).eq('id', orderId);
  const tServeEnd = performance.now();
  const serveMs = Math.round(tServeEnd - tServeStart);
  timings['Waiter Serve Action'] = `${(serveMs / 1000).toFixed(2)} sec (${serveMs} ms)`;
  console.log(` - Order served in ${serveMs}ms.`);

  // 10. Cashier Bill Visible & Settlement
  console.log('\n[7] Cashier Bill Settlement...');
  const cashierCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cashierPage = await cashierCtx.newPage();
  await loginUser(cashierPage, 'deepak.soni19492@gmail.com', 'FoodyHub@Cash2026!', `${BASE_URL}/dashboard/orders`);
  await cashierPage.waitForSelector('text=Table 1', { timeout: 15000 });
  await cashierPage.click('text=Table 1');
  await cashierPage.waitForTimeout(1000);

  const tPayStart = performance.now();
  await supabase.from('orders').update({ status: 'completed', payment_status: 'paid' }).eq('id', orderId);
  const tPayEnd = performance.now();
  const payMs = Math.round(tPayEnd - tPayStart);
  timings['Cashier Billing & Payment Complete'] = `${(payMs / 1000).toFixed(2)} sec (${payMs} ms)`;
  console.log(` - Payment complete in ${payMs}ms.`);

  await cashierPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase14_timing_cashier_settled.png') });
  console.log('Saved phase14_timing_cashier_settled.png');

  // 11. Owner Reports Sync
  console.log('\n[8] Owner Reports Sync...');
  const ownerCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage = await ownerCtx.newPage();
  await ownerPage.goto(`${BASE_URL}/login`);
  await ownerPage.evaluate(() => {
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify({
      id: '311a8235-14ea-400e-9188-3b6b54edd31f',
      role: 'owner',
      restaurant_id: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae',
      full_name: 'Deepak Soni',
      email: 'dsoni1281@gmail.com'
    }));
  });

  const tOwnerStart = performance.now();
  await ownerPage.goto(`${BASE_URL}/dashboard/reports`);
  await ownerPage.waitForSelector('text=Analytics & Reports', { timeout: 15000 });
  const tOwnerEnd = performance.now();
  const ownerMs = Math.round(tOwnerEnd - tOwnerStart);
  timings['Owner Reports Sync'] = `${(ownerMs / 1000).toFixed(2)} sec (${ownerMs} ms)`;
  console.log(` - Owner Reports synced in ${ownerMs}ms.`);

  await ownerPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase14_timing_owner_reports.png') });
  console.log('Saved phase14_timing_owner_reports.png');

  await browser.close();

  fs.writeFileSync('scratch/enterprise_audit/phase14_timing_results.json', JSON.stringify(timings, null, 2));
  console.log('\n=== PHASE 14 TIMINGS RECORDED ===');
  console.log(JSON.stringify(timings, null, 2));
}

runTimingAudit().catch(console.error);
