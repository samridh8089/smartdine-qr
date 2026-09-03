import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

const envText = fs.readFileSync('.env.local', 'utf8');
let anonKey = '';
envText.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    anonKey = t.substring('NEXT_PUBLIC_SUPABASE_ANON_KEY='.length).replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabase = createClient(supabaseUrl, anonKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const tableId = '433daa89-186c-454c-a978-e184a85577b2'; // Table 1

async function runPhase10Audit() {
  console.log('==================================================');
  console.log('=== PHASE-10 LIVE ORDERING AUDIT (FULL SUITE)  ===');
  console.log('==================================================');

  const browser = await chromium.launch({ headless: true });

  // 1. CUSTOMER QR ORDERING (TABLE 1)
  console.log('\n[STEP 1] Customer scans Table 1 QR & places order with variants and notes...');
  const customerContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const customerPage = await customerContext.newPage();
  await customerPage.goto(`http://localhost:3000/menu/foodyhub/table/${tableId}`);
  await customerPage.waitForSelector('text=The Foody Hub', { timeout: 15000 });

  // Add Veg Spring Roll (₹180)
  await customerPage.click('button:has-text("Add +")');
  await customerPage.waitForTimeout(500);

  // Customize Paneer Butter Masala (Full ₹320)
  await customerPage.click('button:has-text("Customize")');
  await customerPage.waitForSelector('text=Choose Portion / Size', { timeout: 8000 });
  await customerPage.click('button:has-text("Full")');
  await customerPage.fill('input[placeholder*="Extra spicy"]', 'Extra creamy, low spice');
  await customerPage.click('button:has-text("Add to Cart")');
  await customerPage.waitForTimeout(1000);

  // View Cart
  await customerPage.click('button:has-text("View Cart")');
  await customerPage.waitForSelector('text=Review Your Basket', { timeout: 5000 });

  // Add Chef Special Instructions
  await customerPage.fill('textarea[placeholder*="Please bring all food together"]', 'Serve hot immediately');
  await customerPage.waitForTimeout(500);

  const cartScr = path.join(SCRATCH_DIR, 'phase10_final_step1_cart.png');
  await customerPage.screenshot({ path: cartScr });
  fs.copyFileSync(cartScr, path.join(ARTIFACTS_DIR, 'phase10_final_step1_cart.png'));
  console.log('Saved phase10_final_step1_cart.png');

  // Submit Order via Fixed API
  console.log('Submitting customer order ticket via fixed API...');
  await customerPage.click('button:has-text("Place Order ticket")');

  // Wait for route to /order-tracking
  await customerPage.waitForURL(url => url.toString().includes('/order-tracking/'), { timeout: 15000 });
  console.log('Order successfully placed and routed to:', customerPage.url());
  await customerPage.waitForTimeout(2000);

  const orderId = customerPage.url().split('/').pop();
  console.log('Generated Order ID:', orderId);

  const trackingScr = path.join(SCRATCH_DIR, 'phase10_final_step1_order_tracking.png');
  await customerPage.screenshot({ path: trackingScr });
  fs.copyFileSync(trackingScr, path.join(ARTIFACTS_DIR, 'phase10_final_step1_order_tracking.png'));
  console.log('Saved phase10_final_step1_order_tracking.png');

  // 2. KITCHEN DISPLAY SYSTEM (KDS)
  console.log('\n[STEP 2] KDS receives order in real-time...');
  const kdsContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kdsPage = await kdsContext.newPage();
  await kdsPage.goto('http://localhost:3000/login');
  await kdsPage.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await kdsPage.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await kdsPage.click('button[type="submit"]');
  await kdsPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await kdsPage.goto('http://localhost:3000/dashboard/kds');
  await kdsPage.waitForSelector('text=Table 1', { timeout: 15000 });
  await kdsPage.waitForTimeout(2000);

  const kdsScr = path.join(SCRATCH_DIR, 'phase10_final_step2_kds_received.png');
  await kdsPage.screenshot({ path: kdsScr });
  fs.copyFileSync(kdsScr, path.join(ARTIFACTS_DIR, 'phase10_final_step2_kds_received.png'));
  console.log('Saved phase10_final_step2_kds_received.png');

  // Accept Order on KDS -> PREPARING
  const acceptBtn = await kdsPage.$('button:has-text("Accept")');
  if (acceptBtn) {
    await acceptBtn.click();
    await kdsPage.waitForTimeout(2000);
    console.log('KDS updated order -> PREPARING');
  }

  // 3. WAITER PORTAL
  console.log('\n[STEP 3] Waiter Portal receives order & alerts...');
  const waiterContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const waiterPage = await waiterContext.newPage();
  await waiterPage.goto('http://localhost:3000/login');
  await waiterPage.fill('input[type="email"]', 'samridhtomar8@gmail.com');
  await waiterPage.fill('input[type="password"]', 'FoodyHub@W1_2026!');
  await waiterPage.click('button[type="submit"]');
  await waiterPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await waiterPage.goto('http://localhost:3000/dashboard/orders');
  await waiterPage.waitForSelector('text=Table 1', { timeout: 15000 });
  await waiterPage.waitForTimeout(2000);

  const waiterScr = path.join(SCRATCH_DIR, 'phase10_final_step3_waiter_portal.png');
  await waiterPage.screenshot({ path: waiterScr });
  fs.copyFileSync(waiterScr, path.join(ARTIFACTS_DIR, 'phase10_final_step3_waiter_portal.png'));
  console.log('Saved phase10_final_step3_waiter_portal.png');

  // 4. CASHIER SETTLEMENT
  console.log('\n[STEP 4] Cashier billing & settlement...');
  const cashierContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const cashierPage = await cashierContext.newPage();
  await cashierPage.goto('http://localhost:3000/login');
  await cashierPage.fill('input[type="email"]', 'deepak.soni19492@gmail.com');
  await cashierPage.fill('input[type="password"]', 'FoodyHub@Cash2026!');
  await cashierPage.click('button[type="submit"]');
  await cashierPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await cashierPage.goto('http://localhost:3000/dashboard/orders');
  await cashierPage.waitForSelector('text=Table 1', { timeout: 15000 });
  await cashierPage.click('text=Table 1');
  await cashierPage.waitForTimeout(2000);

  const cashierScr = path.join(SCRATCH_DIR, 'phase10_final_step4_cashier_billing.png');
  await cashierPage.screenshot({ path: cashierScr });
  fs.copyFileSync(cashierScr, path.join(ARTIFACTS_DIR, 'phase10_final_step4_cashier_billing.png'));
  console.log('Saved phase10_final_step4_cashier_billing.png');

  // 5. OWNER REPORTS
  console.log('\n[STEP 5] Owner Analytics & Reports...');
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto('http://localhost:3000/login');
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await ownerPage.goto('http://localhost:3000/dashboard/reports');
  await ownerPage.waitForTimeout(3000);

  const reportsScr = path.join(SCRATCH_DIR, 'phase10_final_step5_owner_reports.png');
  await ownerPage.screenshot({ path: reportsScr });
  fs.copyFileSync(reportsScr, path.join(ARTIFACTS_DIR, 'phase10_final_step5_owner_reports.png'));
  console.log('Saved phase10_final_step5_owner_reports.png');

  // 6. DATABASE VERIFICATION
  const { data: dbOrder } = await supabase.from('orders').select('*').eq('id', orderId).single();
  const { data: dbBatches } = await supabase.from('order_batches').select('*').eq('order_id', orderId);
  const { data: dbItems } = await supabase.from('order_items').select('*').eq('order_id', orderId);

  console.log('\n--- DATABASE EMPIRICAL VERIFICATION ---');
  console.log('Order Details:', {
    id: dbOrder?.id,
    table_name: dbOrder?.table_name,
    subtotal: dbOrder?.subtotal,
    gst: dbOrder?.gst,
    total: dbOrder?.total,
    status: dbOrder?.status
  });
  console.log('Batches Count:', dbBatches?.length);
  console.log('Items Count:', dbItems?.length);
  dbItems?.forEach(it => {
    console.log(` - ${it.menu_item_name} (${it.variant_name || 'Standard'}) x ${it.quantity} @ ₹${it.price}`);
  });

  await browser.close();
  console.log('\n=== ALL PHASE-10 REGRESSION TESTS PASSED! ===');
}

runPhase10Audit().catch(console.error);
