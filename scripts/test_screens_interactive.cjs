const puppeteer = require('puppeteer');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function testInteractiveScreens() {
  console.log('=== STARTING INTERACTIVE SCREEN & STRESS TESTING ===');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const uncaughtErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push({ text: msg.text(), loc: msg.location() });
    }
  });

  page.on('pageerror', err => {
    uncaughtErrors.push(err.toString());
  });

  const testResults = [];

  // Setup simulated owner session
  const mockRestaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
  const mockOwnerProfile = {
    id: 'test-owner-uuid',
    email: 'owner@testrestaurant.com',
    full_name: 'Test Owner',
    role: 'owner',
    restaurant_id: mockRestaurantId
  };

  await page.goto(`${BASE_URL}/login`);
  await page.evaluate((prof) => {
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(prof));
    sessionStorage.setItem('smartdine_active_restaurant_id', prof.restaurant_id);
  }, mockOwnerProfile);

  // 1. TEST DASHBOARD OVERVIEW
  console.log('\n1. Testing Owner Dashboard (/dashboard)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const dashboardText = await page.evaluate(() => document.body.innerText);
  console.log(`  Dashboard Text Length: ${dashboardText.length}`);
  testResults.push({
    screen: 'Dashboard Overview',
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  // 2. TEST FLOOR LAYOUT MANAGER (/dashboard/tables)
  console.log('\n2. Testing Floor Layout Manager (/dashboard/tables)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.goto(`${BASE_URL}/dashboard/tables`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const floorText = await page.evaluate(() => document.body.innerText);
  console.log(`  Floor Layout Text Length: ${floorText.length}`);
  
  // Test clicking floor tabs and action buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
  });
  console.log(`  Found buttons:`, buttons.slice(0, 10));

  testResults.push({
    screen: 'Floor Layout Manager',
    buttonsCount: buttons.length,
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  // 3. TEST KITCHEN DISPLAY SYSTEM (KDS)
  console.log('\n3. Testing Kitchen Display System (/dashboard/kds)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.goto(`${BASE_URL}/dashboard/kds`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const kdsText = await page.evaluate(() => document.body.innerText);
  console.log(`  KDS Text Length: ${kdsText.length}`);
  testResults.push({
    screen: 'Kitchen Display System',
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  // 4. TEST MENU MANAGEMENT (/dashboard/menu)
  console.log('\n4. Testing Menu Management (/dashboard/menu)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.goto(`${BASE_URL}/dashboard/menu`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const menuText = await page.evaluate(() => document.body.innerText);
  console.log(`  Menu Management Text Length: ${menuText.length}`);
  testResults.push({
    screen: 'Menu Management',
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  // 5. TEST BILLING & SAAS (/dashboard/billing)
  console.log('\n5. Testing Billing & SaaS (/dashboard/billing)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.goto(`${BASE_URL}/dashboard/billing`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const billingText = await page.evaluate(() => document.body.innerText);
  console.log(`  Billing Text Length: ${billingText.length}`);
  testResults.push({
    screen: 'Billing Page',
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  // 6. TEST REPORTS & ANALYTICS (/dashboard/reports)
  console.log('\n6. Testing Reports & Analytics (/dashboard/reports)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.goto(`${BASE_URL}/dashboard/reports`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const reportsText = await page.evaluate(() => document.body.innerText);
  console.log(`  Reports Text Length: ${reportsText.length}`);
  testResults.push({
    screen: 'Reports Page',
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  // 7. TEST SETTINGS (/dashboard/settings)
  console.log('\n7. Testing Settings (/dashboard/settings)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.goto(`${BASE_URL}/dashboard/settings`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const settingsText = await page.evaluate(() => document.body.innerText);
  console.log(`  Settings Text Length: ${settingsText.length}`);
  testResults.push({
    screen: 'Settings Page',
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  // 8. TEST SUPER ADMIN (/super-admin)
  console.log('\n8. Testing Super Admin (/super-admin)...');
  consoleLogs.length = 0;
  uncaughtErrors.length = 0;
  await page.evaluate(() => {
    sessionStorage.removeItem('smartdine_impersonated_profile');
  });
  await page.goto(`${BASE_URL}/super-admin`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  const adminText = await page.evaluate(() => document.body.innerText);
  console.log(`  Super Admin Text Length: ${adminText.length}`);
  testResults.push({
    screen: 'Super Admin Portal',
    hasErrors: uncaughtErrors.length > 0,
    errors: [...uncaughtErrors],
    consoleErrors: [...consoleLogs]
  });

  fs.writeFileSync('scripts/interactive_test_results.json', JSON.stringify(testResults, null, 2));
  console.log('\n=== RESULTS WRITTEN TO scripts/interactive_test_results.json ===');

  await browser.close();
}

testInteractiveScreens().catch(console.error);
