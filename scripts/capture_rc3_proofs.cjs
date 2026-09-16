const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function captureProofs() {
  console.log('Launching headless browser to capture RC3 UI proofs...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const targets = [
    { url: 'http://localhost:3000', file: 'rc3_proof_landing.png' },
    { url: 'http://localhost:3000/dashboard', file: 'rc3_proof_dashboard.png' },
    { url: 'http://localhost:3000/dashboard/kds', file: 'rc3_proof_kds.png' },
    { url: 'http://localhost:3000/dashboard/orders', file: 'rc3_proof_orders.png' },
    { url: 'http://localhost:3000/dashboard/tables', file: 'rc3_proof_tables.png' }
  ];

  for (const t of targets) {
    try {
      console.log(`Navigating to ${t.url}...`);
      await page.goto(t.url, { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1000));
      const dest = path.join(process.cwd(), t.file);
      await page.screenshot({ path: dest, fullPage: false });
      console.log(`Captured: ${t.file} (${fs.statSync(dest).size} bytes)`);
    } catch (e) {
      console.log(`Warning on ${t.url}: ${e.message}`);
    }
  }

  // Mobile Viewport
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  try {
    console.log('Capturing mobile customer view...');
    await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle0', timeout: 15000 });
    const mobileDest = path.join(process.cwd(), 'rc3_proof_mobile_checkout.png');
    await page.screenshot({ path: mobileDest });
    console.log(`Captured: rc3_proof_mobile_checkout.png (${fs.statSync(mobileDest).size} bytes)`);
  } catch (e) {
    console.log('Warning on mobile checkout:', e.message);
  }

  await browser.close();
  console.log('Browser capture finished successfully.');
}

captureProofs().catch(err => {
  console.error('Fatal in capture proofs:', err);
  process.exit(1);
});
