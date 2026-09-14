const puppeteer = require('puppeteer');

async function testBrowser() {
  console.log('--- REAL CHROME RUNTIME VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ServiceWorker') || text.includes('beforeinstallprompt')) {
      console.log('   [Chrome Console]', text);
    }
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // 1. Check Button in DOM
  const btnInitial = await page.$('#install-app-btn');
  console.log('1. Install App button in DOM on load:', btnInitial !== null ? '✅ PASS (VISIBLE)' : '❌ FAIL');

  // 2. Check Button Text
  const btnText = await page.evaluate(() => document.getElementById('install-app-btn')?.innerText);
  console.log('2. Button label text:', btnText?.trim() === 'Install App' ? '✅ PASS ("Install App")' : `❌ FAIL (${btnText})`);

  // 3. Dispatch appinstalled event to simulate completion of install
  await page.evaluate(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });

  await new Promise(resolve => setTimeout(resolve, 600));

  // 4. Verify Button is Hidden (unmounted from DOM)
  const btnAfterInstall = await page.$('#install-app-btn');
  console.log('3. Button in DOM after installation:', btnAfterInstall === null ? '✅ PASS (UNMOUNTED/HIDDEN)' : '❌ FAIL');

  // 5. Check Success Notification
  const hasSuccessBanner = await page.evaluate(() => document.body.innerText.includes('installed successfully'));
  console.log('4. Success toast notification displayed:', hasSuccessBanner ? '✅ PASS' : '❌ FAIL');

  // 6. Test in Standalone PWA Mode
  const pwaPage = await browser.newPage();
  await pwaPage.evaluateOnNewDocument(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query) => ({
        matches: query.includes('standalone'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });
  await pwaPage.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const btnPwa = await pwaPage.$('#install-app-btn');
  console.log('5. Button in Standalone PWA Window:', btnPwa === null ? '✅ PASS (HIDDEN IN STANDALONE)' : '❌ FAIL');

  await browser.close();
  console.log('--- REAL CHROME RUNTIME VERIFICATION COMPLETE ---\n');
}

testBrowser().catch(err => {
  console.error(err);
  process.exit(1);
});
