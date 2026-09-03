import { chromium } from 'playwright';

async function update() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://www.cleverops.in/login');
  await page.evaluate(() => {
    sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify({
      id: '311a8235-14ea-400e-9188-3b6b54edd31f',
      role: 'owner',
      restaurant_id: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae',
      full_name: 'Deepak Soni',
      email: 'dsoni1281@gmail.com'
    }));
  });
  await page.goto('https://www.cleverops.in/dashboard/reports');
  await page.waitForSelector('text=Analytics & Reports');
  await page.click('button:has-text("This Month")');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/DELL/.gemini/antigravity/brain/60c0760b-7ce1-458e-9e85-ce4d63f31527/phase14_owner_reports_synced.png' });
  console.log('Saved phase14_owner_reports_synced.png with This Month range');
  await browser.close();
}

update().catch(console.error);
