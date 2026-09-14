const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';

async function testRoleBoundaries() {
  console.log('=== TESTING ROLE PERMISSION BOUNDARIES ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const mockRestaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

  // 1. TEST WAITER ROLE BOUNDARIES
  console.log('1. Testing Waiter Role Navigation...');
  const waiterProfile = {
    id: 'test-waiter-uuid',
    email: 'waiter@testrestaurant.com',
    full_name: 'Test Waiter',
    role: 'waiter',
    restaurant_id: mockRestaurantId
  };

  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((prof) => {
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(prof));
    sessionStorage.setItem('smartdine_active_restaurant_id', prof.restaurant_id);
  }, waiterProfile);

  // Waiter navigating to forbidden route: /dashboard/billing
  await page.goto(`${BASE_URL}/dashboard/billing`, { waitUntil: 'networkidle2' });
  const waiterBillingUrl = page.url();
  const waiterBillingText = await page.evaluate(() => document.body.innerText);
  console.log(`   Waiter on /dashboard/billing: URL=${waiterBillingUrl}`);
  const waiterBlockedBilling = !waiterBillingUrl.includes('/billing') || waiterBillingText.includes('Access Denied') || waiterBillingText.includes('Unauthorized') || waiterBillingText.includes('Not Authorized');
  console.log(`   Waiter blocked from billing: ${waiterBlockedBilling}`);

  // Waiter navigating to forbidden route: /dashboard/settings
  await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'networkidle2' });
  const waiterSettingsUrl = page.url();
  const waiterSettingsText = await page.evaluate(() => document.body.innerText);
  console.log(`   Waiter on /dashboard/settings: URL=${waiterSettingsUrl}`);
  const waiterBlockedSettings = !waiterSettingsUrl.includes('/settings') || waiterSettingsText.includes('Access Denied') || waiterSettingsText.includes('Unauthorized');
  console.log(`   Waiter blocked from settings: ${waiterBlockedSettings}`);

  // 2. TEST KITCHEN ROLE BOUNDARIES
  console.log('\n2. Testing Kitchen Role Navigation...');
  const kitchenProfile = {
    id: 'test-kitchen-uuid',
    email: 'kitchen@testrestaurant.com',
    full_name: 'Test Chef',
    role: 'kitchen',
    restaurant_id: mockRestaurantId
  };

  await page.evaluate((prof) => {
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(prof));
    sessionStorage.setItem('smartdine_active_restaurant_id', prof.restaurant_id);
  }, kitchenProfile);

  // Kitchen navigating to forbidden route: /dashboard/reports
  await page.goto(`${BASE_URL}/dashboard/reports`, { waitUntil: 'networkidle2' });
  const kitchenReportsUrl = page.url();
  const kitchenReportsText = await page.evaluate(() => document.body.innerText);
  console.log(`   Kitchen on /dashboard/reports: URL=${kitchenReportsUrl}`);
  const kitchenBlockedReports = !kitchenReportsUrl.includes('/reports') || kitchenReportsText.includes('Access Denied') || kitchenReportsText.includes('Unauthorized');
  console.log(`   Kitchen blocked from reports: ${kitchenBlockedReports}`);

  // 3. TEST SUPER ADMIN ROUTE WITH WAITER / OWNER
  console.log('\n3. Testing Non-Admin Access to /super-admin...');
  await page.goto(`${BASE_URL}/super-admin`, { waitUntil: 'networkidle2' });
  const superAdminUrl = page.url();
  const superAdminText = await page.evaluate(() => document.body.innerText);
  console.log(`   Non-admin on /super-admin: URL=${superAdminUrl}, BodyLen=${superAdminText.length}`);
  const blockedSuperAdmin = !superAdminUrl.includes('/super-admin') || superAdminText.includes('Unauthorized') || superAdminText.length < 200;
  console.log(`   Non-admin blocked from /super-admin: ${blockedSuperAdmin}`);

  await browser.close();
}

testRoleBoundaries().catch(console.error);
