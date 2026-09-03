import { chromium } from 'playwright';

async function checkOwnerCreds() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'admin@cleverops.in');
  await page.fill('input[type="password"]', 'Admin@12345!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/super-admin**');
  await page.waitForSelector('text=Opening Admin Console...', { state: 'detached' });

  const row = page.locator('tr:has-text("The Foody Hub")');
  await row.locator('button:has-text("Owner Details")').click();
  await page.waitForSelector('text=Owner Account & Credentials');

  // Click eye button to reveal password
  const eyeBtn = page.locator('button[title="Show Password"], button:has-text("Show"), svg.lucide-eye').first();
  if (await eyeBtn.isVisible()) {
    await eyeBtn.click();
    await page.waitForTimeout(500);
  }

  const modalText = await page.locator('[role="dialog"]').innerText();
  console.log('--- OWNER MODAL CONTENT ---');
  console.log(modalText);

  await browser.close();
}

checkOwnerCreds().catch(console.error);
