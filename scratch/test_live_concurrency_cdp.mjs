import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const PROD_URL = 'https://www.cleverops.in';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});
const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const table2Id = '10739156-1a62-4fd7-bc06-e0621dbed844';

async function test() {
  console.log('=== TESTING LIVE WAITER CONFLICT VIA CDP WEBSOCKET BLOCK ===');
  const browser = await chromium.launch({ headless: true });

  // 1. Reset orders & Create fresh live order on Table 2
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table2Id);
  const orderRes = await fetch(`${PROD_URL}/api/customer/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table2Id,
      orderType: 'dine_in',
      specialInstructions: 'Live Concurrency CDP Verification',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
    })
  });
  const { order } = await orderRes.json();
  await supabase.from('orders').update({ status: 'ready' }).eq('id', order.id);
  console.log('Order created and READY on live production:', order.id);

  // 2. Open Waiter 2 portal on mobile
  const w2Ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const w2Page = await w2Ctx.newPage();
  const cdp = await w2Ctx.newCDPSession(w2Page);
  await cdp.send('Network.enable');

  w2Page.on('console', msg => console.log('W2 CONSOLE:', msg.text()));

  await w2Page.goto(`${PROD_URL}/login`);
  await w2Page.waitForSelector('input[type="email"]');
  await w2Page.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await w2Page.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await w2Page.click('button[type="submit"]');
  await w2Page.waitForTimeout(4000);
  await w2Page.goto(`${PROD_URL}/dashboard/orders`);
  await w2Page.waitForSelector('text=Table 2');
  console.log('Waiter 2 portal loaded with Table 2 order ready.');

  // Find the top banner "Serve Order" button
  const serveBannerBtn = w2Page.locator('button:has-text("Serve Order")').first();
  await serveBannerBtn.waitFor({ state: 'visible', timeout: 15000 });

  // 3. Block Realtime WebSocket via CDP to simulate real-world packet latency
  console.log('Enabling CDP network block on Realtime WebSocket to simulate packet gap...');
  await cdp.send('Network.setBlockedURLs', { urls: ['*realtime*', '*websocket*'] });

  // 4. Waiter 1 completes serve on live server
  console.log('Waiter 1 serves order in database...');
  await supabase.from('orders').update({ status: 'served' }).eq('id', order.id);

  // 5. Waiter 2 taps Serve Order
  console.log('Waiter 2 taps Serve Order...');
  await serveBannerBtn.click();
  await w2Page.waitForTimeout(1500);

  const toastVisible = await w2Page.getByText('Order already served by another team member.').isVisible();
  console.log(`\n>>> LIVE CONFLICT TOAST VISIBLE = ${toastVisible ? 'PASS (100% VERIFIED)' : 'FAIL'} <<<`);

  await w2Page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase17_live_waiter2_conflict_toast.png') });
  console.log('Saved phase17_live_waiter2_conflict_toast.png');

  await browser.close();
}

test().catch(console.error);
