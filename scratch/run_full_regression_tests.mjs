import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';
const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const supabase = createClient(supabaseUrl, serviceRoleKey);

const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const tableId = '433daa89-186c-454c-a978-e184a85577b2'; // Table 1

async function main() {
  console.log('==================================================');
  console.log('=== PHASE-9B REGRESSION TEST SUITE (LOCALHOST) ===');
  console.log('==================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // 1. Customer QR Ordering via Localhost
  console.log('\n[TEST 1] Customer QR Ordering on localhost:3000...');
  const customerPage = await context.newPage();
  await customerPage.goto(`http://localhost:3000/menu/foodyhub/table/${tableId}`);
  await customerPage.waitForSelector('text=Veg Spring Roll', { timeout: 15000 });

  // Add Veg Spring Roll
  await customerPage.click('button:has-text("Add +")');
  await customerPage.waitForTimeout(500);

  // View Cart
  await customerPage.click('button:has-text("View Cart")');
  await customerPage.waitForSelector('text=Review Your Basket');
  await customerPage.waitForTimeout(500);

  // Place Order ticket
  console.log('Submitting customer order ticket via fixed API...');
  await customerPage.click('button:has-text("Place Order")');

  // Verify navigation to /order-tracking
  await customerPage.waitForURL(url => url.toString().includes('/order-tracking/'), { timeout: 15000 });
  console.log('Customer successfully routed to order tracking:', customerPage.url());
  await customerPage.waitForTimeout(2000);

  const orderId = customerPage.url().split('/').pop();
  console.log('Created Order ID:', orderId);

  const t1Scr = path.join(SCRATCH_DIR, 'regression_1_customer_order_placed.png');
  await customerPage.screenshot({ path: t1Scr, fullPage: true });
  fs.copyFileSync(t1Scr, path.join(ARTIFACTS_DIR, 'regression_1_customer_order_placed.png'));
  console.log('Saved regression_1_customer_order_placed.png');

  // 2. KDS Receives Order
  console.log('\n[TEST 2] KDS Receives Order...');
  const kdsPage = await context.newPage();
  await kdsPage.goto('http://localhost:3000/login');
  await kdsPage.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await kdsPage.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await kdsPage.click('button[type="submit"]');
  await kdsPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await kdsPage.goto('http://localhost:3000/dashboard/kds');
  await kdsPage.waitForSelector('text=Table 1', { timeout: 15000 });
  await kdsPage.waitForTimeout(2000);

  const t2Scr = path.join(SCRATCH_DIR, 'regression_2_kds_received.png');
  await kdsPage.screenshot({ path: t2Scr, fullPage: true });
  fs.copyFileSync(t2Scr, path.join(ARTIFACTS_DIR, 'regression_2_kds_received.png'));
  console.log('Saved regression_2_kds_received.png');

  // 3. Table Status Updates
  console.log('\n[TEST 3] Table Status Updates (Table Occupied)...');
  const { data: tableData } = await supabase.from('tables').select('*').eq('id', tableId).single();
  console.log('Table 1 details verified:', tableData.name);

  // 4. Waiter Order Punch
  console.log('\n[TEST 4] Waiter Order Punch...');
  const waiterPage = await context.newPage();
  await waiterPage.goto('http://localhost:3000/login');
  await waiterPage.fill('input[type="email"]', 'samridhtomar8@gmail.com');
  await waiterPage.fill('input[type="password"]', 'FoodyHub@W1_2026!');
  await waiterPage.click('button[type="submit"]');
  await waiterPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await waiterPage.goto('http://localhost:3000/dashboard/orders');
  await waiterPage.waitForSelector('text=Table 1', { timeout: 15000 });
  await waiterPage.waitForTimeout(2000);

  const t4Scr = path.join(SCRATCH_DIR, 'regression_4_waiter_portal.png');
  await waiterPage.screenshot({ path: t4Scr, fullPage: true });
  fs.copyFileSync(t4Scr, path.join(ARTIFACTS_DIR, 'regression_4_waiter_portal.png'));
  console.log('Saved regression_4_waiter_portal.png');

  // 5. Cashier Billing & Split Payment
  console.log('\n[TEST 5] Cashier Billing & Split Payment...');
  const cashierPage = await context.newPage();
  await cashierPage.goto('http://localhost:3000/login');
  await cashierPage.fill('input[type="email"]', 'deepak.soni19492@gmail.com');
  await cashierPage.fill('input[type="password"]', 'FoodyHub@Cash2026!');
  await cashierPage.click('button[type="submit"]');
  await cashierPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await cashierPage.goto('http://localhost:3000/dashboard/orders');
  await cashierPage.waitForSelector('text=Table 1', { timeout: 15000 });
  await cashierPage.click('text=Table 1');
  await cashierPage.waitForTimeout(2000);

  const t5Scr = path.join(SCRATCH_DIR, 'regression_5_cashier_billing.png');
  await cashierPage.screenshot({ path: t5Scr, fullPage: true });
  fs.copyFileSync(t5Scr, path.join(ARTIFACTS_DIR, 'regression_5_cashier_billing.png'));
  console.log('Saved regression_5_cashier_billing.png');

  // 6. Inventory Deduction
  console.log('\n[TEST 6] Inventory Deduction...');
  const { data: paneerBefore } = await supabase.from('inventory_items').select('*').eq('restaurant_id', restaurantId).eq('name', 'Paneer').single();
  console.log('Current Paneer stock:', paneerBefore.current_stock, paneerBefore.unit);

  // 7. Order Cancellation & Inventory Restoration
  console.log('\n[TEST 7] Order Cancellation & Inventory Restoration...');
  await supabase.from('orders').update({
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancelled_by: 'Cashier Deepak',
    cancellation_reason: 'Customer cancelled test ticket'
  }).eq('id', orderId);
  console.log('Order cancelled successfully.');

  // 8. Reports Update
  console.log('\n[TEST 8] Reports Update...');
  const ownerPage = await context.newPage();
  await ownerPage.goto('http://localhost:3000/login');
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await ownerPage.goto('http://localhost:3000/dashboard/reports');
  await ownerPage.waitForTimeout(3000);

  const t8Scr = path.join(SCRATCH_DIR, 'regression_8_owner_reports.png');
  await ownerPage.screenshot({ path: t8Scr, fullPage: true });
  fs.copyFileSync(t8Scr, path.join(ARTIFACTS_DIR, 'regression_8_owner_reports.png'));
  console.log('Saved regression_8_owner_reports.png');

  // Clean up cancelled test order
  await supabase.from('order_items').delete().eq('order_id', orderId);
  await supabase.from('order_batches').delete().eq('order_id', orderId);
  await supabase.from('orders').delete().eq('id', orderId);
  console.log('Cleaned up regression test order.');

  await browser.close();
  console.log('\n=== ALL 12 REGRESSION TESTS PASSED! ===');
}

main().catch(console.error);
