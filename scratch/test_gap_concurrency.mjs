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

async function testGap(gapMs) {
  console.log(`\n=== TESTING CONCURRENCY WITH GAP: ${gapMs}ms ===`);
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
      specialInstructions: `Timing Gap ${gapMs}ms Test`,
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
    })
  });
  const { order } = await orderRes.json();
  await supabase.from('orders').update({ status: 'ready' }).eq('id', order.id);

  // 2. Open Waiter 2 portal
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('console', msg => console.log(`[W2 GAP ${gapMs}]`, msg.text()));

  await page.goto(`${PROD_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await page.goto(`${PROD_URL}/dashboard/orders`);
  await page.waitForSelector('text=Table 2', { timeout: 20000 });

  // Pre-locate the banner serve button
  await page.waitForSelector('button:has-text("Serve Order")', { timeout: 10000 });

  // 3. Dispatch Waiter 1 serve in DB, and after gapMs Waiter 2 clicks
  // But to simulate Waiter 2 having the button visible without 0ms websocket unmount:
  // If gapMs === 0: Waiter 1 updates, Waiter 2 clicks at 0ms
  // If gapMs > 0: Waiter 1 updates, Waiter 2 clicks after gapMs
  console.log(`Executing race: Waiter 1 serves in DB, Waiter 2 clicks with ${gapMs}ms delta...`);
  
  if (gapMs === 0) {
    await Promise.all([
      supabase.from('orders').update({ status: 'served' }).eq('id', order.id),
      page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Serve Order'));
        if (btn) btn.click();
      })
    ]);
  } else {
    // Waiter 1 executes serve
    await supabase.from('orders').update({ status: 'served' }).eq('id', order.id);
    if (gapMs > 0) await new Promise(r => setTimeout(r, gapMs));
    await page.evaluate(() => {
      // If banner is already unmounted due to realtime update, click the order card Serve or detail Serve
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Serve'));
      if (btn) btn.click();
    });
  }

  await page.waitForTimeout(1500);

  const toastVisible = await page.getByText('Order already served by another team member.').isVisible();
  console.log(`GAP ${gapMs}ms RESULT: Toast Visible = ${toastVisible}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, `phase17_live_gap_${gapMs}ms.png`) });
  await browser.close();
  return toastVisible;
}

async function runAll() {
  for (const gap of [0, 100, 500, 1000]) {
    await testGap(gap);
  }
}

runAll().catch(console.error);
