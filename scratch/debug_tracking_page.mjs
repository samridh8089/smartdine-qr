import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[BROWSER PAGEERROR]', err.message));

  console.log('Navigating to tracking page on live cleverops.in...');
  await page.goto('https://www.cleverops.in/order-tracking/63d78fb9-b150-447d-b510-395177bf0863');

  await page.waitForTimeout(6000);

  const text = await page.textContent('body');
  console.log('Page text includes "The Foody Hub":', text.includes('The Foody Hub'));
  console.log('Page text includes "Order Not Found":', text.includes('Order Not Found'));
  console.log('Page text includes "TABLE 1":', text.includes('TABLE 1') || text.includes('Table 1'));

  await page.screenshot({ path: 'scratch/debug_tracking_page.png' });
  await browser.close();
}

main().catch(console.error);
