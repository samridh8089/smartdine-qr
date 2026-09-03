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

async function runReportsAndAdminAudit() {
  console.log('===============================================================');
  console.log('=== PHASE 11H: OWNER REPORTS & SUPER ADMIN LIVE AUDIT        ===');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });

  // 1. Owner 20 Tables Grid
  console.log('\n[1] Capturing Owner 20-Tables Dashboard Grid...');
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const ownerPage = await ownerContext.newPage();

  await ownerPage.goto('https://www.cleverops.in/login');
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await ownerPage.goto('https://www.cleverops.in/dashboard/tables');
  await ownerPage.waitForTimeout(3000);

  await ownerPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase11_20_tables_grid.png') });
  console.log('Saved phase11_20_tables_grid.png');

  // 2. Owner Reports & Analytics
  console.log('\n[2] Capturing Owner Analytics & Tax Reports...');
  await ownerPage.goto('https://www.cleverops.in/dashboard/reports');
  await ownerPage.waitForTimeout(3000);

  await ownerPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase11_reports_analytics.png') });
  console.log('Saved phase11_reports_analytics.png');

  // 3. Owner Inventory & Recipes
  console.log('\n[3] Capturing Owner Inventory & Recipes Dashboard...');
  await ownerPage.goto('https://www.cleverops.in/dashboard/inventory');
  await ownerPage.waitForTimeout(3000);

  await ownerPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase11_inventory_bom.png') });
  console.log('Saved phase11_inventory_bom.png');

  // 4. Super Admin Global Platform Control
  console.log('\n[4] Capturing Super Admin Dashboard...');
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const adminPage = await adminContext.newPage();

  await adminPage.goto('https://www.cleverops.in/login');
  await adminPage.fill('input[type="email"]', 'admin@cleverops.in');
  await adminPage.fill('input[type="password"]', 'Admin@12345!');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  await adminPage.goto('https://www.cleverops.in/super-admin');
  await adminPage.waitForTimeout(3000);

  await adminPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase11_superadmin_global.png') });
  console.log('Saved phase11_superadmin_global.png');

  // Fetch verified figures from DB
  const { data: reportOrders } = await supabase
    .from('orders')
    .select('id, subtotal, gst, total, status')
    .eq('restaurant_id', restaurantId)
    .in('status', ['completed', 'served', 'ready', 'preparing', 'accepted', 'new']);

  let totalGross = 0;
  let totalGst = 0;
  let totalNet = 0;

  reportOrders?.forEach(o => {
    totalGross += (o.subtotal || 0);
    totalGst += (o.gst || 0);
    totalNet += (o.total || 0);
  });

  console.log('\n=== REAL DB REPORT METRICS ===');
  console.log(`Active/Valid Orders: ${reportOrders?.length}`);
  console.log(`Gross Sales: ₹${totalGross.toFixed(2)}`);
  console.log(`GST Collected: ₹${totalGst.toFixed(2)}`);
  console.log(`Net Revenue: ₹${totalNet.toFixed(2)}`);
  console.log(`AOV: ₹${(totalNet / (reportOrders?.length || 1)).toFixed(2)}`);

  await browser.close();
  console.log('\n=== PHASE 11H COMPLETED! ===');
}

runReportsAndAdminAudit().catch(console.error);
