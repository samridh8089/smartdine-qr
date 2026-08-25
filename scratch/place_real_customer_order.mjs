import puppeteer from 'puppeteer';

(async () => {
  console.log('[Puppeteer] Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    const targetUrl = 'http://localhost:3000/menu/the-foody-hub/table/c0ef9a09-f509-4739-8e6b-921aa54f0a9f';
    console.log('[Puppeteer] Navigating to customer menu URL:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait 5s for hydration
    await page.evaluate(() => new Promise(r => setTimeout(r, 5000)));

    // Find first "Add +" button and click
    const addBtns = await page.$$('button');
    let added = false;
    for (const btn of addBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Add +')) {
        console.log('[Puppeteer] Found Add + button! Clicking...');
        await btn.click();
        added = true;
        break;
      }
    }

    if (!added) {
      throw new Error('Add + button not found!');
    }

    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

    // Click "View Cart"
    const cartBtns = await page.$$('button');
    let cartClicked = false;
    for (const btn of cartBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('View Cart')) {
        console.log('[Puppeteer] Found View Cart button! Clicking...');
        await btn.click();
        cartClicked = true;
        break;
      }
    }

    if (!cartClicked) {
      throw new Error('View Cart button not found!');
    }

    await page.evaluate(() => new Promise(r => setTimeout(r, 2000)));

    // Click "Place Order" button in cart modal
    const placeBtns = await page.$$('button');
    let placed = false;
    for (const btn of placeBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Place Order')) {
        console.log('[Puppeteer] Found Place Order button! Clicking...');
        await btn.click();
        placed = true;
        break;
      }
    }

    if (!placed) {
      throw new Error('Place Order button not found in cart!');
    }

    console.log('[Puppeteer] Waiting for redirection to order tracking page...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));

    const finalUrl = page.url();
    console.log('[Puppeteer] Final URL after placing order:', finalUrl);
    const orderIdMatch = finalUrl.match(/\/order-tracking\/([a-f0-9-]+)/i);
    const orderId = orderIdMatch ? orderIdMatch[1] : 'unknown';
    console.log('[Puppeteer] CREATED ORDER ID:', orderId);
    console.log('[Puppeteer] CREATION TIMESTAMP:', new Date().toISOString());

  } catch (err) {
    console.error('[Puppeteer] Error placing order:', err.message);
  } finally {
    await browser.close();
  }
})();
