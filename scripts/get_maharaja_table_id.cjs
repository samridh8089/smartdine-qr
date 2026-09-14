const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  await page.goto('https://www.cleverops.in/login');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => u.pathname.includes('/dashboard'));
  await page.goto('https://www.cleverops.in/dashboard/tables');
  await page.waitForTimeout(3000);

  // Open Maharaja drawer first
  console.log('Opening Maharaja drawer...');
  const maharaja = page.locator('text=maharaja').first();
  await maharaja.click();
  await page.waitForTimeout(1000);

  // Click QR tab
  console.log('Clicking QR tab...');
  const qrBtn = page.locator('button', { hasText: 'QR' }).last();
  await qrBtn.click();
  await page.waitForTimeout(1000);

  const previewLink = page.locator('a:has-text("Open Customer Menu Preview")').first();
  const href = await previewLink.getAttribute('href');
  console.log('MAHARAJA_CUSTOMER_URL:', href);

  // Extract any links/text in drawer
  const qrText = await page.evaluate(() => {
    return document.body.innerText;
  });

  // Click Orders (1) tab
  console.log('Clicking Orders (1) tab...');
  const ordersBtn = page.locator('button', { hasText: 'Orders (1)' }).last();
  if (await ordersBtn.count() > 0) {
    await ordersBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b2c2e285-1d6c-4421-9a44-cbed460919e6\\prod_maharaja_orders_tab.png' });
  }

  // Let's also check Grid View!
  console.log('Checking Grid View button...');
  const gridViewBtn = page.locator('button:has-text("Grid View")').first();
  if (await gridViewBtn.count() > 0) {
    await gridViewBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b2c2e285-1d6c-4421-9a44-cbed460919e6\\prod_grid_view.png' });
  }

  console.log('Screenshots captured successfully!');
  await browser.close();
}

main().catch(console.error);
