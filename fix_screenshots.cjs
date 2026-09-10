const p = require('c:/Users/admin/smartdine-qr/node_modules/puppeteer');
const SCREENSHOT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity\\brain\\9720eddb-f290-4494-8524-ae806dff2e86\\screenshots';

(async () => {
  const browser = await p.launch({ headless: true, args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 900 } });
  const page = await browser.newPage();

  async function inject() {
    await page.evaluate((r, u) => {
      const prof = { id: u, user_id: u, role: 'owner', full_name: 'Demo Owner', email: 'dsoni1281@gmail.com', restaurant_id: r, is_active: true };
      sessionStorage.setItem('smartdine_impersonated_profile', JSON.stringify(prof));
      sessionStorage.setItem('founder_mode', 'true');
      localStorage.setItem('smartdine_active_restaurant_id', r);
    }, '81fa8201-51d7-4da5-98f5-a52dbff4e6ae', '311a8235-14ea-400e-9188-3b6b54edd31f');
  }

  // Kitchen KDS
  await page.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await inject();
  await page.goto('https://www.cleverops.in/dashboard/kds', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: SCREENSHOT_DIR + '\\09-kitchen.png', fullPage: true });
  console.log('09-kitchen.png done — URL:', page.url());

  // Also fix menu page (was skeleton) — wait longer
  await page.goto('https://www.cleverops.in/login', { waitUntil: 'domcontentloaded' });
  await inject();
  await page.goto('https://www.cleverops.in/dashboard/menu', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 7000));
  await page.screenshot({ path: SCREENSHOT_DIR + '\\01-menu.png', fullPage: true });
  console.log('01-menu.png done — URL:', page.url());

  await browser.close();
  console.log('Done!');
})().catch(e => { console.error(e.message); process.exit(1); });
