import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\63be691e-3623-4138-a70b-1f50b5cb5801';

async function verifyScrollAndCards() {
  console.log('Capturing canvas scroll and card details...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 20000 });

    await page.goto('http://localhost:3000/dashboard/tables', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Capture main floor view showing all cards and centered tabs
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_floor_view_complete.png'),
      fullPage: false
    });

    // Verify vertical scrollability: check scrollHeight of canvas container
    const scrollContainer = page.locator('div.overflow-auto').first();
    const scrollInfo = await scrollContainer.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      scrollTop: el.scrollTop
    }));
    console.log('Scroll Container Metrics:', scrollInfo);

    // Scroll down 400px
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 400;
    });
    await page.waitForTimeout(1000);

    // Capture scrolled down screenshot
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_canvas_scrolled.png'),
      fullPage: false
    });

    console.log('Scroll capture completed successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
}

verifyScrollAndCards();
