import { chromium } from 'playwright';

async function debugOrderDetailed() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('[CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message, err.stack));
  page.on('response', async res => {
    try {
      const url = res.url();
      if (url.includes('/api/')) {
        const body = await res.text();
        console.log(`[API RESPONSE ${res.status()}] ${url}: ${body}`);
      }
    } catch (e) {}
  });

  const url = 'https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Veg Spring Roll');

  // Add 1 Veg Spring Roll
  console.log('Adding Veg Spring Roll...');
  await page.click('button:has-text("Add +")');
  await page.waitForTimeout(1000);

  // Open Cart
  console.log('Opening Cart...');
  await page.click('button:has-text("View Cart")');
  await page.waitForSelector('text=Review Your Basket');
  await page.waitForTimeout(500);

  // Click Place Order ticket
  console.log('Clicking Place Order button...');
  await page.click('button:has-text("Place Order")');
  await page.waitForTimeout(6000);

  await browser.close();
}

debugOrderDetailed().catch(console.error);
