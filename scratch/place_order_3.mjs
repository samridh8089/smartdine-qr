import puppeteer from 'puppeteer';

const MENU_URL = 'http://localhost:3000/menu/the-foody-hub/table/c0ef9a09-f509-4739-8e6b-921aa54f0a9f';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`[${new Date().toISOString()}] Navigating to menu...`);
  await page.goto(MENU_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Find and click first "Add to Cart" / "+" button
  const addBtns = await page.$$('button');
  let added = false;
  for (const btn of addBtns) {
    const txt = await btn.evaluate(el => el.textContent.trim());
    if (txt === '+' || txt.toLowerCase().includes('add')) {
      await btn.click();
      console.log(`[${new Date().toISOString()}] Clicked add button: "${txt}"`);
      added = true;
      await new Promise(r => setTimeout(r, 500));
      break;
    }
  }

  if (!added) {
    // Try clicking on any menu item
    const items = await page.$$('[class*="menu-item"], [class*="MenuItem"], [class*="item"]');
    if (items.length > 0) {
      await items[0].click();
      console.log(`[${new Date().toISOString()}] Clicked menu item`);
      await new Promise(r => setTimeout(r, 1000));
      // Look for add to cart button
      const addBtn = await page.$('button[class*="add"], button[class*="Add"]');
      if (addBtn) { await addBtn.click(); added = true; }
    }
  }

  await new Promise(r => setTimeout(r, 1500));

  // Find "View Cart" or "Place Order" or checkout button
  const allBtns = await page.$$('button');
  for (const btn of allBtns) {
    const txt = await btn.evaluate(el => el.textContent.trim());
    if (txt.toLowerCase().includes('cart') || txt.toLowerCase().includes('order') || txt.toLowerCase().includes('checkout')) {
      await btn.click();
      console.log(`[${new Date().toISOString()}] Clicked: "${txt}"`);
      await new Promise(r => setTimeout(r, 2000));
      break;
    }
  }

  // Find confirm/place order button
  const finalBtns = await page.$$('button');
  for (const btn of finalBtns) {
    const txt = await btn.evaluate(el => el.textContent.trim());
    if (txt.toLowerCase().includes('place') || txt.toLowerCase().includes('confirm') || txt.toLowerCase().includes('submit')) {
      await btn.click();
      console.log(`[${new Date().toISOString()}] Final order button clicked: "${txt}"`);
      break;
    }
  }

  await new Promise(r => setTimeout(r, 3000));

  // Check page for order ID
  const pageContent = await page.evaluate(() => document.body.innerText);
  const orderMatch = pageContent.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  if (orderMatch) {
    console.log(`ORDER_ID=${orderMatch[0]}`);
  }
  console.log(`[${new Date().toISOString()}] Order flow complete`);
  console.log('URL:', page.url());

  await browser.close();
})();
