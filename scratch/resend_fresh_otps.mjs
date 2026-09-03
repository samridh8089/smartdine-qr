import { chromium } from 'playwright';

async function resendInvites() {
  console.log('=== RESENDING FRESH VERIFICATION OTPS ===\n');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('dialog', async d => {
    console.log('[Alert]:', d.message());
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
  await page.waitForTimeout(1500);

  const targets = ['samridhtomar8@gmail.com', 'poojagarg0885@gmail.com', 'deepak.soni19492@gmail.com'];

  for (const email of targets) {
    console.log(`Clicking Resend Invite for ${email}...`);
    const row = page.locator(`tr:has-text("${email}")`);
    const resendBtn = row.locator('button:has-text("Resend Invite")');
    if (await resendBtn.isVisible()) {
      await resendBtn.click();
      await page.waitForTimeout(3000);
      console.log(`Dispatched fresh OTP to ${email}.`);
    }
  }

  await browser.close();
}

resendInvites().catch(console.error);
