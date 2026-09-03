import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function saveScreen(page, filename) {
  const fullScr = path.join(SCRATCH_DIR, filename);
  await page.screenshot({ path: fullScr, fullPage: false });
  fs.copyFileSync(fullScr, path.join(ARTIFACTS_DIR, filename));
  console.log(`[Screenshot Saved]: ${filename}`);
}

async function testCustomerOrder() {
  console.log('--- TESTING CUSTOMER QR ORDER ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  const url = 'https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForSelector('text=Veg Spring Roll', { timeout: 20000 });
  console.log('Menu loaded.');

  // 1. Add Veg Spring Roll (₹180)
  console.log('Adding Veg Spring Roll...');
  await page.click('button:has-text("Add +")');
  await page.waitForTimeout(1000);

  // 2. Add Paneer Butter Masala (Full ₹320)
  console.log('Navigating to Main Course...');
  await page.click('button:has-text("Main Course"), [role="tab"]:has-text("Main Course")');
  await page.waitForSelector('text=Paneer Butter Masala', { timeout: 10000 });
  await page.click('button:has-text("Customize")');
  await page.waitForSelector('text=Full', { timeout: 8000 });

  console.log('Selecting Full...');
  await page.click('div:has-text("Full"):has-text("₹320.00"), button:has-text("Full")');
  await page.waitForTimeout(400);

  // Fill special notes
  const noteInput = page.locator('input[placeholder*="Extra spicy"], textarea[placeholder*="Extra spicy"]');
  if (await noteInput.isVisible()) {
    await noteInput.fill('Less spicy, extra gravy for kids');
    console.log('Notes added.');
  }

  await page.click('button:has-text("Add to Cart")');
  await page.waitForTimeout(1000);

  // 3. Add Butter Naan (₹45)
  console.log('Navigating to Breads...');
  await page.click('button:has-text("Breads"), [role="tab"]:has-text("Breads")');
  await page.waitForSelector('text=Butter Naan', { timeout: 10000 });
  await page.click('button:has-text("Add +")');
  await page.waitForTimeout(1000);

  // 4. View Cart
  console.log('Clicking View Cart...');
  const viewCartBtn = page.locator('button:has-text("View Cart")');
  await viewCartBtn.waitFor({ state: 'visible', timeout: 5000 });
  await viewCartBtn.click();
  await page.waitForTimeout(1500);

  await saveScreen(page, 'phase10_step_a_cart.png');

  // 5. Place Order
  console.log('Clicking Place Order ticket...');
  const placeOrderBtn = page.locator('button:has-text("Place Order")');
  await placeOrderBtn.waitFor({ state: 'visible', timeout: 5000 });
  await placeOrderBtn.click();
  console.log('Order placing clicked, waiting...');
  await page.waitForTimeout(4000);

  await saveScreen(page, 'phase10_step_a_order_placed.png');

  // Query latest order in DB
  const { data: latestOrders } = await supabase
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('Latest Order in DB:', JSON.stringify(latestOrders?.[0], null, 2));

  await browser.close();
}

testCustomerOrder().catch(console.error);
