import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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
const table4Id = '8514189f-b4b5-44fa-bb1a-e39fa0646ff0';

async function loginStaff(page, email, password, targetUrl) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  if (targetUrl) {
    await page.goto(targetUrl);
    await page.waitForTimeout(1500);
  }
}

async function testWaiterConflict() {
  console.log('=== TESTING WAITER CONFLICT RACE CONDITION ===');
  const browser = await chromium.launch({ headless: true });

  // Clean old orders on table 4
  await supabase.from('orders').update({ status: 'completed' }).eq('table_id', table4Id);

  // Create fresh order
  const orderRes = await fetch(`${BASE_URL}/api/customer/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId,
      tableId: table4Id,
      orderType: 'dine_in',
      items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
    })
  });
  const orderJson = await orderRes.json();
  const orderId = orderJson.order?.id;
  console.log('Fresh Order placed on Table 4:', orderId);

  // Set to ready
  await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);

  const w1Ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const w1Page = await w1Ctx.newPage();
  await loginStaff(w1Page, 'samridhtomar8@gmail.com', 'FoodyHub@W1_2026!', `${BASE_URL}/dashboard/orders`);

  const w2Ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const w2Page = await w2Ctx.newPage();
  await loginStaff(w2Page, 'poojagarg0885@gmail.com', 'FoodyHub@W2_2026!', `${BASE_URL}/dashboard/orders`);

  await w1Page.waitForSelector('text=Table 4', { timeout: 15000 });
  await w2Page.waitForSelector('text=Table 4', { timeout: 15000 });

  // Select Table 4 on both
  await w1Page.click('text=Table 4');
  await w2Page.click('text=Table 4');
  await w1Page.waitForTimeout(1000);
  await w2Page.waitForTimeout(1000);

  console.log('Both Waiter 1 and Waiter 2 have Table 4 order open.');

  // Find the quick Serve button or panel Serve Order button
  const w1Btn = w1Page.locator('button:has-text("Serve Order"), button:has-text("Serve")').first();
  const w2Btn = w2Page.locator('button:has-text("Serve Order"), button:has-text("Serve")').first();

  console.log('Attempting simultaneous clicks...');
  await Promise.allSettled([
    w1Btn.click({ timeout: 3000 }),
    w2Btn.click({ timeout: 3000 })
  ]);

  await w1Page.waitForTimeout(2000);
  await w2Page.waitForTimeout(2000);

  const { data: dbOrder } = await supabase.from('orders').select('status').eq('id', orderId).single();
  console.log('Final Order status in DB:', dbOrder?.status);

  await w1Page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase15_waiter1_conflict_winner.png') });
  await w2Page.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase15_waiter2_conflict_state.png') });
  console.log('Screenshots saved.');

  await browser.close();
}

testWaiterConflict().catch(console.error);
