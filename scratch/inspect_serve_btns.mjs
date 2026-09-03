import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'poojagarg0885@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@W2_2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(u => !u.toString().includes('/login'));
  await page.goto('http://localhost:3000/dashboard/orders');
  await page.waitForTimeout(2000);

  const btns = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map((b, idx) => ({
      idx,
      text: b.innerText.trim(),
      classes: b.className,
      disabled: b.disabled
    }));
  });
  console.log('ALL SERVE BUTTONS:', btns.filter(b => b.text.includes('Serve')));
  await browser.close();
})();
