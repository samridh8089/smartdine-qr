import puppeteer from 'puppeteer';

export async function runCustomerUIOrderFlow(testName = 'Test Order') {
  console.log(`[Puppeteer ${testName}] Launching browser...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 412, height: 915 });

    const url = 'http://localhost:3000/menu/the-foody-hub?table=c0ef9a09-f509-4739-8e6b-921aa54f0a9f';
    console.log(`[Puppeteer ${testName}] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'load' });

    // Wait up to 10s for loading to finish and buttons to appear
    console.log(`[Puppeteer ${testName}] Waiting for Add button...`);
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const buttons = await page.$$('button');
      const texts = await Promise.all(buttons.map(b => page.evaluate(el => el.textContent.trim(), b)));
      console.log(`[Puppeteer ${testName}] Second ${i+1}: ${buttons.length} buttons ->`, texts.slice(0, 5));
      
      const addBtnIndex = texts.findIndex(t => t.includes('Add') || t.includes('+'));
      if (addBtnIndex !== -1) {
        console.log(`[Puppeteer ${testName}] Found Add button at index ${addBtnIndex}! Clicking: "${texts[addBtnIndex]}"`);
        await buttons[addBtnIndex].click();
        
        await new Promise(r => setTimeout(r, 2000));
        const cartButtons = await page.$$('button');
        const cartTexts = await Promise.all(cartButtons.map(b => page.evaluate(el => el.textContent.trim(), b)));
        const cartIndex = cartTexts.findIndex(t => t.includes('View Cart'));
        if (cartIndex !== -1) {
          console.log(`[Puppeteer ${testName}] Clicking View Cart...`);
          await cartButtons[cartIndex].click();
          
          await new Promise(r => setTimeout(r, 2500));
          const modalButtons = await page.$$('button');
          const modalTexts = await Promise.all(modalButtons.map(b => page.evaluate(el => el.textContent.trim(), b)));
          const placeIndex = modalTexts.findIndex(t => t.includes('Place Order') || t.includes('Send to Kitchen') || t.includes('Confirm Order'));
          if (placeIndex !== -1) {
            console.log(`[Puppeteer ${testName}] Clicking Place Order: "${modalTexts[placeIndex]}"`);
            await modalButtons[placeIndex].click();
            await new Promise(r => setTimeout(r, 4000));
            console.log(`[Puppeteer ${testName}] Order placed successfully through Customer UI!`);
            return true;
          }
        }
      }
    }

    console.log(`[Puppeteer ${testName}] Finished without placing order.`);
    return false;
  } catch (err) {
    console.error(`[Puppeteer ${testName}] Error:`, err.message);
    return false;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('place_order_ui.js')) {
  runCustomerUIOrderFlow('Standalone Execution');
}
