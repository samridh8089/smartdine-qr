import { chromium } from 'playwright';

async function testErrorLogging() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  page.on('console', msg => console.log(`[CONSOLE ${msg.type().toUpperCase()}]:`, msg.text()));
  page.on('pageerror', err => console.error('[UNCAUGHT PAGE ERROR]:', err));

  const url = 'https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2';
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Veg Spring Roll');

  // Add item
  await page.click('button:has-text("Add +")');
  await page.waitForTimeout(1000);

  // Open cart
  await page.click('button:has-text("View Cart")');
  await page.waitForSelector('text=Review Your Basket');
  await page.waitForTimeout(500);

  // Click place order and listen for toast or DOM changes
  await page.click('button:has-text("Place Order")');
  
  // Wait 4 seconds and check what toasts or text appear on page
  await page.waitForTimeout(4000);

  const toasts = await page.locator('[role="alert"], [class*="toast"], [class*="Toast"], [class*="error"], [class*="badge"]').allInnerTexts();
  console.log('Toasts and alerts on screen:', toasts.filter(t => t.trim().length > 0));

  await browser.close();
}

testErrorLogging().catch(console.error);
