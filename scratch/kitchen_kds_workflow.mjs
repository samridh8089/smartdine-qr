import puppeteer from 'puppeteer';

(async () => {
  console.log('[KDS Workflow] Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  try {
    const kdsUrl = 'http://localhost:3000/dashboard/kds';
    console.log('[KDS Workflow] Navigating to KDS:', kdsUrl);
    await page.goto(kdsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait 4s for KDS state load
    await page.evaluate(() => new Promise(r => setTimeout(r, 4000)));

    console.log('[KDS Workflow] Looking for Accept button...');
    const buttons = await page.$$('button');
    let acceptBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Accept')) {
        acceptBtn = btn;
        break;
      }
    }

    if (acceptBtn) {
      console.log('[KDS Workflow] Clicking ACCEPT button...');
      await acceptBtn.click();
      console.log('[KDS Workflow] ACCEPTED TIMESTAMP:', new Date().toISOString());
      await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));
    } else {
      console.log('[KDS Workflow] Accept button not found by text search.');
    }

    // Now look for Start Cooking / Preparing button
    const buttons2 = await page.$$('button');
    let prepBtn = null;
    for (const btn of buttons2) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Start Cooking') || text.includes('Preparing'))) {
        prepBtn = btn;
        break;
      }
    }

    if (prepBtn) {
      console.log('[KDS Workflow] Clicking PREPARING / START COOKING button...');
      await prepBtn.click();
      console.log('[KDS Workflow] PREPARING TIMESTAMP:', new Date().toISOString());
      await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));
    }

    // Now look for Mark Ready / Ready button
    const buttons3 = await page.$$('button');
    let readyBtn = null;
    for (const btn of buttons3) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Mark Ready') || text.includes('Ready'))) {
        readyBtn = btn;
        break;
      }
    }

    if (readyBtn) {
      console.log('[KDS Workflow] Clicking MARK READY button...');
      await readyBtn.click();
      console.log('[KDS Workflow] READY TIMESTAMP:', new Date().toISOString());
      await page.evaluate(() => new Promise(r => setTimeout(r, 3000)));
    } else {
      console.log('[KDS Workflow] Mark Ready button not found.');
    }

  } catch (err) {
    console.error('[KDS Workflow] Error:', err.message);
  } finally {
    await browser.close();
  }
})();
