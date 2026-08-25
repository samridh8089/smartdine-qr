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
    console.log('[Puppeteer] Page loaded.');

    // Wait 4 seconds for DB fetch
    await page.evaluate(() => new Promise(r => setTimeout(r, 4000)));

    // Look for Call Waiter button again (or any staff action button)
    const buttons = await page.$$('button');
    let targetBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Call Waiter') || text.includes('Bill'))) {
        targetBtn = btn;
        break;
      }
    }

    if (targetBtn) {
      console.log('[Puppeteer] Customer Action button found! Clicking...');
      await targetBtn.click();
      await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));
      await page.screenshot({ path: 'scratch/menu_after_foreground_call.png' });
      console.log('[Puppeteer] Customer Action clicked successfully!');
    }
  } catch (err) {
    console.error('[Puppeteer] Error:', err.message);
  } finally {
    await browser.close();
  }
})();
