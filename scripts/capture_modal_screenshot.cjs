const puppeteer = require('puppeteer');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('language', 'en');
  });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // Wait for Install App button and click it
  await page.waitForSelector('#install-app-btn', { visible: true });
  await page.click('#install-app-btn');

  // Wait for modal to render
  await page.waitForFunction(() => document.body.innerText.includes('Install SmartDine App'), { timeout: 5000 });

  const outPath = path.join(process.cwd(), 'install_modal_open.png');
  await page.screenshot({ path: outPath });
  console.log('Screenshot saved to:', outPath);

  await browser.close();
}

capture().catch(err => {
  console.error(err);
  process.exit(1);
});
