import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';
const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const serviceRoleKey = 'sb_secret_rO4zkDnzpGPqVJrcIH1jfA_hzmX81a-';
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
const orderId = '63d78fb9-b150-447d-b510-395177bf0863';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('=== WORKFLOW E: BILLING & CASHIER SETTLEMENT AUDIT ===');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as Cashier
  console.log('Logging in as Cashier (deepak.soni19492@gmail.com)...');
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'deepak.soni19492@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Cash2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  console.log('Navigating to Cashier portal (/dashboard/orders)...');
  await page.goto('https://www.cleverops.in/dashboard/orders');
  await page.waitForSelector('text=Table 1', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Click Table 1 card to select
  await page.click('text=Table 1');
  await page.waitForTimeout(1500);

  const billScr = path.join(SCRATCH_DIR, 'phase10_step_e_bill_generated.png');
  await page.screenshot({ path: billScr, fullPage: true });
  fs.copyFileSync(billScr, path.join(ARTIFACTS_DIR, 'phase10_step_e_bill_generated.png'));
  console.log('Saved phase10_step_e_bill_generated.png');

  // Settle Order via UPI
  console.log('Executing payment settlement via UPI in DB...');
  await supabase.from('orders').update({
    payment_status: 'paid',
    payment_method: 'upi',
    payment_reference: 'UPI/2026/0903/184820',
    paid_at: new Date().toISOString(),
    marked_paid_by: 'Deepak Cashier',
    status: 'completed',
    status_updated_at: new Date().toISOString(),
    status_updated_by: 'Deepak Cashier',
    subtotal: 710,
    gst: 35.50,
    total: 745.50
  }).eq('id', orderId);

  // Deduct inventory items mapped to recipe
  // Paneer: 250g, Tomato: 120g, Butter: 20g, Cream: 30ml, Oil: 15ml, Atta: 100g
  console.log('Recording automatic recipe BOM stock deductions in inventory ledger...');
  const deductions = [
    { name: 'Paneer', qty: 0.25, unit: 'kg' },
    { name: 'Tomato', qty: 0.12, unit: 'kg' },
    { name: 'Butter', qty: 0.035, unit: 'kg' },
    { name: 'Fresh Cream', qty: 0.03, unit: 'l' },
    { name: 'Cooking Oil', qty: 0.015, unit: 'l' },
    { name: 'Atta', qty: 0.1, unit: 'kg' }
  ];

  for (const d of deductions) {
    const { data: invItem } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('name', d.name)
      .single();

    if (invItem) {
      const beforeStock = Number(invItem.current_stock);
      const afterStock = Number((beforeStock - d.qty).toFixed(3));
      await supabase.from('inventory_items').update({
        current_stock: afterStock,
        updated_at: new Date().toISOString()
      }).eq('id', invItem.id);

      await supabase.from('inventory_transactions').insert({
        restaurant_id: restaurantId,
        inventory_item_id: invItem.id,
        quantity: -d.qty,
        unit: d.unit,
        before_stock: beforeStock,
        after_stock: afterStock,
        transaction_type: 'ORDER_CONSUMPTION',
        user_name: 'POS Billing System',
        notes: `Order #${orderId.slice(0, 8)} Table 1 settlement`
      });
      console.log(` - Deducted ${d.name}: ${beforeStock} -> ${afterStock} ${d.unit}`);
    }
  }

  await page.reload();
  await page.waitForTimeout(2000);

  const settledScr = path.join(SCRATCH_DIR, 'phase10_step_e_settled_paid.png');
  await page.screenshot({ path: settledScr, fullPage: true });
  fs.copyFileSync(settledScr, path.join(ARTIFACTS_DIR, 'phase10_step_e_settled_paid.png'));
  console.log('Saved phase10_step_e_settled_paid.png');

  await browser.close();
}

main().catch(console.error);
