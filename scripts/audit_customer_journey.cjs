const puppeteer = require('puppeteer');

async function testCustomerJourney() {
  console.log('=== AUDITING PHASE 7: CUSTOMER QR MENU & CHECKOUT ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });

  const consoleLogs = [];
  const networkRequests = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  page.on('request', req => {
    if (req.url().includes('/api/')) {
      networkRequests.push({ method: req.method(), url: req.url() });
    }
  });

  // 1. Visit menu
  console.log('1. Navigating to Customer QR Menu...');
  await page.goto('http://localhost:3000/menu/the-foody-hub/table/t_1', { waitUntil: 'networkidle2' });
  const menuTitle = await page.title();
  console.log(`   Page title: "${menuTitle}"`);

  // 2. Check category buttons and search
  const categories = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button'))
      .map(b => b.innerText.trim())
      .filter(t => t && !t.includes('Add') && !t.includes('Cart') && t.length < 25);
  });
  console.log(`   Categories found:`, categories.slice(0, 8));

  // 3. Search for an item
  const searchInput = await page.$('input[type="text"], input[placeholder*="Search" i]');
  if (searchInput) {
    await searchInput.type('Paneer');
    await new Promise(r => setTimeout(r, 500));
    console.log('   Typed "Paneer" in search input');
    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 300));
  }

  // 4. Click first "ADD" or "+" button
  console.log('2. Adding item to cart...');
  const addButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const matches = [];
    for (let i = 0; i < btns.length; i++) {
      const txt = btns[i].innerText.trim();
      if (txt === 'ADD' || txt.includes('Add') || txt === '+') {
        matches.push(i);
      }
    }
    return matches;
  });

  console.log(`   Found ${addButtons.length} candidate Add buttons`);
  if (addButtons.length > 0) {
    // Click the first Add button
    await page.evaluate((idx) => {
      const btns = document.querySelectorAll('button');
      if (btns[idx]) btns[idx].click();
    }, addButtons[0]);
    await new Promise(r => setTimeout(r, 1000));
  }

  // 5. Check if Cart bar appears
  const cartBarText = await page.evaluate(() => {
    const bottomBar = document.querySelector('[class*="fixed bottom-"]') || document.querySelector('[class*="bottom-0"]');
    return bottomBar ? bottomBar.innerText : null;
  });
  console.log('   Cart bar text:', cartBarText ? cartBarText.replace(/\n/g, ' ') : 'NOT FOUND');

  // 6. Open cart drawer
  console.log('3. Opening cart drawer...');
  const openedCart = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const viewCartBtn = btns.find(b => b.innerText.includes('View Cart') || b.innerText.includes('Cart'));
    if (viewCartBtn) {
      viewCartBtn.click();
      return true;
    }
    return false;
  });
  console.log('   View Cart clicked:', openedCart);
  await new Promise(r => setTimeout(r, 800));

  // 7. Check drawer contents
  const drawerInfo = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h2, h3')).map(h => h.innerText.trim());
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim());
    return { headings, btns };
  });
  console.log('   Drawer headings:', drawerInfo.headings);
  console.log('   Drawer buttons:', drawerInfo.btns.filter(b => b.includes('Order') || b.includes('Place') || b.includes('Bill') || b.includes('Pay')));

  // 8. Test Place Order button click
  console.log('4. Testing Place Order click behavior...');
  const orderResult = await page.evaluate(async () => {
    const btns = Array.from(document.querySelectorAll('button'));
    const placeBtn = btns.find(b => b.innerText.includes('Place Order') || b.innerText.includes('Confirm Order'));
    if (!placeBtn) return { found: false };

    const initialText = placeBtn.innerText.trim();
    const wasDisabledBefore = placeBtn.disabled;
    
    // Click place order
    placeBtn.click();

    // Immediately inspect button state within 10ms
    const isDisabledImmediate = placeBtn.disabled;
    const immediateText = placeBtn.innerText.trim();

    return {
      found: true,
      initialText,
      wasDisabledBefore,
      isDisabledImmediate,
      immediateText
    };
  });

  console.log('   Place Order button state on click:', orderResult);

  // 9. Monitor for 3 seconds: does "View Cart" appear while submitting?
  let flickerDetected = false;
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 200));
    const url = page.url();
    if (url.includes('/order-tracking/')) {
      console.log(`   Successfully navigated to order tracking: ${url}`);
      break;
    }
    const hasViewCart = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('View Cart'));
    });
    if (hasViewCart) {
      console.log(`   [FLICKER CHECK] At ${(i + 1) * 200}ms, "View Cart" button was visible during submission!`);
      flickerDetected = true;
    }
  }

  console.log(`   Checkout flicker detected: ${flickerDetected}`);
  console.log(`   Final URL: ${page.url()}`);

  await browser.close();
}

testCustomerJourney().catch(console.error);
