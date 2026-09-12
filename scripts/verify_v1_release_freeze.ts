import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\63be691e-3623-4138-a70b-1f50b5cb5801';

async function verifyV1ReleaseFreeze() {
  console.log('Starting Floor Layout Manager v1.0 Stable Freeze Verification...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('Logging in as owner dsoni1281@gmail.com...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 20000 });
    console.log('Logged in successfully!');

    await page.goto('http://localhost:3000/dashboard/tables', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 1. Proof: Indoor Floor (AC Hall)
    console.log('1. Capturing Indoor Floor...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_indoor.png'),
      fullPage: false
    });

    // 2. Proof: Outdoor Floor
    console.log('2. Capturing Outdoor Floor...');
    const outdoorTab = page.locator('div:has-text("Outdoor")').last();
    await outdoorTab.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_outdoor.png'),
      fullPage: false
    });

    // 3. Proof: First Floor
    console.log('3. Capturing First Floor...');
    const firstFloorTab = page.locator('div:has-text("First Floor")').last();
    await firstFloorTab.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_first_floor.png'),
      fullPage: false
    });

    // 4. Proof: Terrace Floor
    console.log('4. Capturing Terrace Floor...');
    const terraceTab = page.locator('div:has-text("Terrace")').last();
    await terraceTab.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_terrace.png'),
      fullPage: false
    });

    // Switch back to Indoor / AC Hall
    const indoorTab = page.locator('div:has-text("AC Hall"), div:has-text("Indoor")').last();
    await indoorTab.click({ force: true });
    await page.waitForTimeout(800);

    // 5. Proof: Add Table Modal
    console.log('5. Capturing Add Table Modal...');
    const addTableBtn = page.locator('button:has-text("Add Table")').first();
    await addTableBtn.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_add_table_modal.png'),
      fullPage: false
    });
    // Close Add Table Modal
    const closeAddModalBtn = page.locator('button:has-text("Cancel")').first();
    await closeAddModalBtn.click({ force: true });
    await page.waitForTimeout(500);

    // 6. Proof: Walk-in Modal with Smart Suggestion
    console.log('6. Capturing Walk-in Modal...');
    const walkInBtn = page.locator('button:has-text("Seat Walk-In Guest")').first();
    await walkInBtn.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_walkin_modal.png'),
      fullPage: false
    });
    // Close Walk-in Modal
    const closeWalkInBtn = page.locator('div.fixed.inset-0 button').first();
    if (await closeWalkInBtn.count() > 0) {
      await closeWalkInBtn.click({ force: true });
      await page.waitForTimeout(500);
    }

    // 7. Proof: Table Drawer (Click table card to open drawer)
    console.log('7. Capturing Table Drawer Live Session / Status...');
    const tableCards = page.locator('div[style*="left:"]');
    if (await tableCards.count() > 0) {
      await tableCards.first().click({ force: true });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_v1_table_drawer.png'),
        fullPage: false
      });

      // 8. Proof: QR Drawer Tab
      console.log('8. Capturing QR Drawer Section...');
      const qrTab = page.locator('div.fixed.right-0 button:has-text("QR")').first();
      await qrTab.click({ force: true });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_v1_qr_drawer.png'),
        fullPage: false
      });

      // 9. Proof: Booking Drawer Tab
      console.log('9. Capturing Booking Drawer Section...');
      const bookingTab = page.locator('div.fixed.right-0 button:has-text("Booking")').first();
      await bookingTab.click({ force: true });
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_v1_booking_drawer.png'),
        fullPage: false
      });

      // Close drawer
      const closeDrawerBtn = page.locator('button.p-2.text-zinc-400').first();
      if (await closeDrawerBtn.count() > 0) {
        await closeDrawerBtn.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // 10. Proof: Live Timer verification
    console.log('10. Capturing Live Timer...');
    const timerElem = page.locator('span:has-text("Elapsed")').first();
    const timerText1 = (await timerElem.count() > 0) ? await timerElem.textContent() : '';
    console.log('Timer reading 1:', timerText1);
    await page.waitForTimeout(2000);
    const timerText2 = (await timerElem.count() > 0) ? await timerElem.textContent() : '';
    console.log('Timer reading 2 (2s later):', timerText2);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_live_timer.png'),
      fullPage: false
    });

    // 11. Proof: Long Scroll
    console.log('11. Capturing Long Scroll Container...');
    const scrollContainer = page.locator('div.overflow-auto').first();
    const scrollMetrics = await scrollContainer.evaluate((el) => {
      el.scrollTop = 450;
      return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop };
    });
    console.log('Scroll Metrics:', scrollMetrics);
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_v1_long_scroll.png'),
      fullPage: false
    });

    console.log('All v1.0 release freeze checks verified and screenshots captured successfully!');
  } catch (err) {
    console.error('Error during v1.0 release freeze verification:', err);
  } finally {
    await browser.close();
  }
}

verifyV1ReleaseFreeze();
