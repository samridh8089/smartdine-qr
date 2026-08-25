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
    console.log('[Puppeteer] Navigating to customer menu table URL:', targetUrl);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[Puppeteer] Page loaded. URL:', page.url());

    // Wait 5 seconds for DB fetch and table state set
    await page.evaluate(() => new Promise(r => setTimeout(r, 5000)));

    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('[Puppeteer] Body inner text snippet:');
    console.log(bodyText.substring(0, 300));

    const buttons = await page.$$('button');
    console.log('[Puppeteer] Found button count:', buttons.length);
    let callWaiterBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      console.log('  Button text:', JSON.stringify(text?.trim()));
      if (text && text.includes('Call Waiter')) {
        callWaiterBtn = btn;
      }
    }

    if (callWaiterBtn) {
      console.log('[Puppeteer] Call Waiter button found! Clicking...');
      await callWaiterBtn.click();
      await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));
      await page.screenshot({ path: 'scratch/menu_after_call.png' });
      console.log('[Puppeteer] Call Waiter clicked successfully!');
    }
  } catch (err) {
    console.error('[Puppeteer] Error:', err.message);
  } finally {
    await browser.close();
  }
})();
