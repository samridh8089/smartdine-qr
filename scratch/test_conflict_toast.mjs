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
  console.log('=== VERIFYING WAITER CONFLICT TOAST ===');
  const browser = await chromium.launch({ headless: true });

  // 1. Reset orders & Create a new order on Table 2
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table2Id);
  const orderRes = await fetch('http://localhost:3000/api/customer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table2Id,
      orderType: 'dine_in',
      specialInstructions: 'Waiter Conflict Direct Test',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
    })
  });
  const { order } = await orderRes.json();
  await supabase.from('orders').update({ status: 'ready' }).eq('id', order.id);
  console.log('Created and set order to READY:', order.id);

  // 2. Open Waiter 2 portal
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  page.on('console', msg => console.log('W2 CONSOLE:', msg.text()));
  page.on('dialog', d => {
    console.log('UNEXPECTED DIALOG:', d.type(), d.message());
    d.dismiss();
  });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'));
  await page.goto('http://localhost:3000/dashboard/orders');
  await page.waitForSelector('text=Table 2');
  console.log('Table 2 visible in Waiter 2 portal.');

  // 3. Pause WebSocket updates temporarily in Waiter 2 to simulate race condition where Waiter 1 serves on server
  // but Waiter 2 has not received the WebSocket packet yet
  console.log('Simulating race condition: Order transitioned to SERVED on server...');
  await supabase.from('orders').update({ status: 'served' }).eq('id', order.id);

  // 4. In Waiter 2 portal, click Serve button
  console.log('Waiter 2 taps Serve button on Table 2 order...');
  // The serve button inside the ready card
  const serveBtn = page.locator('button:has-text("Serve Order")').first();
  if (await serveBtn.isVisible()) {
    await serveBtn.click();
  } else {
    // Or quick action button in order card
    const cardServe = page.getByRole('button', { name: /^Serve$/ }).first();
    await cardServe.click();
  }

  await page.waitForTimeout(1000);

  // 5. Check if toast appears
  const toastVisible = await page.evaluate(() => {
    return document.body.innerText.includes('Order already served by another team member.');
  });
  console.log('RESULT: Toast with "Order already served by another team member." visible =', toastVisible);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase17_waiter2_conflict_toast_proof.png') });
  console.log('Saved screenshot: phase17_waiter2_conflict_toast_proof.png');

  await browser.close();
}

test().catch(console.error);
