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
      specialInstructions: 'Waiter Concurrency Debug',
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
  page2.on('dialog', d => {
    console.log('W2 DIALOG:', d.type(), d.message());
    d.dismiss();
  });

  await page2.goto('http://localhost:3000/login');
  await page2.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await page2.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await page2.click('button[type="submit"]');
  await page2.waitForURL(u => !u.toString().includes('/login'));
  await page2.goto('http://localhost:3000/dashboard/orders');
  await page2.waitForSelector('text=Table 2');
  await page2.waitForTimeout(1000);

  // Inspect page buttons
  const buttonsBefore = await page2.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
  });
  console.log('Buttons on W2 page:', buttonsBefore);

  // Now simulate Waiter 1 serving the order in DB
  console.log('Simulating Waiter 1 serving the order in DB...');
  await supabase.from('orders').update({ status: 'served' }).eq('id', order.id);

  // Now Waiter 2 clicks "Serve Order" or "Serve"
  console.log('Waiter 2 attempts to click Serve...');
  const serveBtn = page2.locator('button:has-text("Serve")').first();
  await serveBtn.click({ force: true });
  await page2.waitForTimeout(1500);

  const bodyText = await page2.innerText('body');
  console.log('Includes toast string:', bodyText.includes('Order already served by another team member.'));
  console.log('Toast element count:', await page2.locator('text=Order already served by another team member.').count());

  await page2.screenshot({ path: 'scratch/w2_debug.png' });
  await browser.close();
}

test().catch(console.error);
