import { chromium } from 'playwright';

async function registerStaffIsolated(staff) {
  console.log(`Registering ${staff.name} (${staff.email}) - ${staff.role}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async d => {
    console.log('[Dialog]:', d.message());
    await d.accept();
  });

  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(1000);

  const form = page.locator('form:has-text("Register Staff Login"), form:has-text("Staff Full Name")');
  await form.locator('input[placeholder="e.g. Rahul Sharma"]').fill(staff.name);
  await form.locator('input[placeholder="rahul@restaurant.com"]').fill(staff.email);
  await form.locator('input[placeholder="+91 9876543210"]').fill(staff.phone);
  await form.locator('input[placeholder="Minimum 6 characters"]').fill(staff.password);
  await form.locator('select').selectOption(staff.role);
  await page.waitForTimeout(300);

  await form.locator('button[type="submit"]').click();
  console.log(`Submitted invite for ${staff.email}. Waiting 5s...`);
  await page.waitForTimeout(5000);

  await browser.close();
  console.log(`Done registering ${staff.email}.`);
}

async function run() {
  await registerStaffIsolated({
    name: 'Pooja Waiter 2',
    email: 'poojagarg0885@gmail.com',
    phone: '8949266063',
    password: 'FoodyHub@W2_2026!',
    role: 'waiter'
  });

  await registerStaffIsolated({
    name: 'Deepak Cashier',
    email: 'deepak.soni19492@gmail.com',
    phone: '8949266064',
    password: 'FoodyHub@Cash2026!',
    role: 'cashier'
  });
}

run().catch(console.error);
