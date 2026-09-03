import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
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
  console.log('=== REAL-WORLD CONCURRENCY COLLISION SIMULATION ===');
  const browser = await chromium.launch({ headless: true });

  // 1. Create fresh order on Table 2 and set to READY
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table2Id);
  const orderRes = await fetch('http://localhost:3000/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table2Id,
      orderType: 'dine_in',
      specialInstructions: 'Realistic Waiter Collision Test',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
    })
  });
  const { order } = await orderRes.json();
  await supabase.from('orders').update({ status: 'ready' }).eq('id', order.id);
  console.log('Order created and READY:', order.id);

  // 2. Waiter 2 opens dashboard on Mobile (width: 390, height: 844)
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  page2.on('console', msg => console.log('W2 LOG:', msg.text()));

  await page2.goto('http://localhost:3000/login');
  await page2.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await page2.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await page2.click('button[type="submit"]');
  await page2.waitForURL(u => !u.toString().includes('/login'));
  await page2.goto('http://localhost:3000/dashboard/orders');
  await page2.waitForSelector('text=Table 2');
  console.log('Waiter 2 portal loaded with Table 2 order in READY state.');

  // Find the top banner "Serve Order" button
  const serveBannerBtn = page2.locator('button:has-text("Serve Order")').first();
  await serveBannerBtn.waitFor({ state: 'visible' });

  // 3. Simulate network latency gap (Waiter 2 has not received WebSocket yet)
  await page2.route('**/realtime/**', route => route.abort());
  console.log('Simulating Waiter 1 serving the order on server...');
  await supabase.from('orders').update({ status: 'served' }).eq('id', order.id);

  // 4. Waiter 2 taps "Serve Order" on their device
  console.log('Waiter 2 taps "Serve Order" on Table 2...');
  await serveBannerBtn.click();

  // Wait for conflict toast animation
  await page2.waitForTimeout(1000);

  // 5. Verify the exact conflict toast
  const toastExists = await page2.getByText('Order already served by another team member.').isVisible();
  console.log(`CONFIRMATION: Conflict toast displayed = ${toastExists ? 'PASS' : 'FAIL'}`);

  await page2.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase17_waiter2_conflict_toast_proof.png') });
  console.log('Screenshot saved to phase17_waiter2_conflict_toast_proof.png');

  await browser.close();
}

test().catch(console.error);
