import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function createStaffMember({ name, email, phone, password, role }) {
  console.log(`=== CREATING STAFF: ${name} (${email}) - ROLE: ${role} ===`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  page.on('dialog', async d => {
    console.log('[Browser Dialog]:', d.message());
    await d.accept();
  });

  // Login as Owner
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**');

  // Go to Settings -> Staff
  await page.goto('https://www.cleverops.in/dashboard/settings');
  await page.waitForSelector('text=Loading CleverOps...', { state: 'detached' });
  await page.waitForTimeout(1000);

  await page.click('button:has-text("Staff Accounts"), [role="tab"]:has-text("Staff Accounts")');
  await page.waitForTimeout(1000);

  // Fill staff form
  console.log('Filling staff form...');
  const form = page.locator('form:has-text("Register Staff Login"), form:has-text("Staff Full Name")');
  await form.locator('input[placeholder="e.g. Rahul Sharma"]').fill(name);
  await form.locator('input[placeholder="rahul@restaurant.com"]').fill(email);
  await form.locator('input[placeholder="+91 9876543210"]').fill(phone);
  await form.locator('input[placeholder="Minimum 6 characters"]').fill(password);
  await form.locator('select').selectOption(role);
  await page.waitForTimeout(500);

  const fillScreen = path.join(SCRATCH_DIR, `phase9a_staff_${role}_filled.png`);
  await page.screenshot({ path: fillScreen, fullPage: true });
  fs.copyFileSync(fillScreen, path.join(ARTIFACTS_DIR, `phase9a_staff_${role}_filled.png`));
  console.log(`Saved phase9a_staff_${role}_filled.png`);

  console.log('Clicking Create Staff Profile...');
  await form.locator('button[type="submit"]').click();
  await page.waitForTimeout(4000);

  const resultScreen = path.join(SCRATCH_DIR, `phase9a_staff_${role}_result.png`);
  await page.screenshot({ path: resultScreen, fullPage: true });
  fs.copyFileSync(resultScreen, path.join(ARTIFACTS_DIR, `phase9a_staff_${role}_result.png`));
  console.log(`Saved phase9a_staff_${role}_result.png`);

  // Check if OTP modal is visible
  const isOtpModalOpen = await page.isVisible('text=Verify Staff Account');
  console.log('Is Staff OTP Modal Open:', isOtpModalOpen);

  const content = await page.content();
  const hasOtpPrompt = content.includes('Enter the 8-digit OTP') || content.includes('Verify Staff Account');
  console.log('Has OTP Prompt in text:', hasOtpPrompt);

  await browser.close();
  return { isOtpModalOpen, hasOtpPrompt };
}

createStaffMember({
  name: 'Nakshatra Kitchen',
  email: 'nakshatra1233@gmail.com',
  phone: '8949266061',
  password: 'FoodyHub@Kds2026!',
  role: 'kitchen'
}).catch(console.error);
