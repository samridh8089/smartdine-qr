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
const table2Id = '10739156-1a62-4fd7-bc06-e0621dbed844';

async function test() {
  const browser = await chromium.launch({ headless: true });
  
  // Clean & create ready order
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table2Id);
  const orderRes = await fetch('http://localhost:3000/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table2Id,
      orderType: 'dine_in',
      specialInstructions: 'Waiter Concurrency Accurate Target',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
    })
  });
  const { order } = await orderRes.json();
  await supabase.from('orders').update({ status: 'ready' }).eq('id', order.id);
  console.log('Order ready:', order.id);

  // Open Waiter 2
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  page2.on('console', msg => console.log('W2 CONSOLE:', msg.text()));
  page2.on('pageerror', err => console.log('W2 PAGE ERROR:', err.message));

  await page2.goto('http://localhost:3000/login');
  await page2.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await page2.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await page2.click('button[type="submit"]');
  await page2.waitForURL(u => !u.toString().includes('/login'));
  await page2.goto('http://localhost:3000/dashboard/orders');
  await page2.waitForSelector('text=Table 2');
  await page2.waitForTimeout(1000);

  // Locate the EXACT inner Serve button
  const innerServeBtn = page2.getByRole('button', { name: /^Serve$/ });
  console.log('Inner serve button count:', await innerServeBtn.count());

  // Click on the order card to open details
  console.log('Selecting order card to open details...');
  await page2.click('text=Table 2');
  await page2.waitForTimeout(500);

  // Mark the order as SERVED on the server (simulating Waiter 1 completing serve)
  console.log('Simulating Waiter 1 completing serve in database...');
  await supabase.from('orders').update({ status: 'served' }).eq('id', order.id);

  // In Waiter 2's opened details or card, trigger Serve
  console.log('Waiter 2 attempts to click Serve Order...');
  const detailServeBtn = page2.getByRole('button', { name: /^Serve Order$/ }).last();
  console.log('Detail Serve Order button visible:', await detailServeBtn.isVisible());
  await detailServeBtn.click({ force: true });

  await page2.waitForTimeout(1000);

  const toastVisible = await page2.getByText('Order already served by another team member.').isVisible();
  console.log('Toast visible on screen:', toastVisible);

  await page2.screenshot({ path: 'scratch/w2_toast_captured.png' });
  await browser.close();
}

test().catch(console.error);
