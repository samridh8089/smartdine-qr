import { chromium } from 'playwright';

async function testInPageDb() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2');
  await page.waitForTimeout(3000);

  const result = await page.evaluate(async () => {
    try {
      // @ts-ignore
      const res = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae',
          tableId: '433daa89-186c-454c-a978-e184a85577b2',
          items: [{ menuItemId: 'test', quantity: 1 }],
          orderType: 'dine_in'
        })
      });
      const data = await res.json();
      return { status: res.status, data };
    } catch (err) {
      return { error: err.message };
    }
  });

  console.log('Result from page evaluate:', JSON.stringify(result, null, 2));
  await browser.close();
}

testInPageDb().catch(console.error);
