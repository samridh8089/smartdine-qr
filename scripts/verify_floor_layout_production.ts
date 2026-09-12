import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\63be691e-3623-4138-a70b-1f50b5cb5801';

async function verifyFloorLayout() {
  console.log('Launching browser for Owner Verification...');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    console.log('Logging in as owner dsoni1281@gmail.com...');
    await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation to dashboard...');
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 20000 });
    console.log('Logged in successfully, current URL:', page.url());

    console.log('Navigating to Tables & QRs...');
    await page.goto('http://localhost:3000/dashboard/tables', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // 1. Proof of Floor Layout Manager - Indoor Tab
    console.log('Capturing Indoor Floor Layout...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_floor_layout_indoor_polish.png'),
      fullPage: false
    });

    // 2. Click Outdoor Tab
    console.log('Switching to Outdoor Tab...');
    const outdoorBtn = page.locator('button:has-text("Outdoor")').first();
    if (await outdoorBtn.count() > 0) {
      await outdoorBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_floor_layout_outdoor_polish.png'),
        fullPage: false
      });
    }

    // 3. Switch back to Indoor Tab
    console.log('Switching back to Indoor Tab...');
    const indoorBtn = page.locator('button:has-text("Indoor")').first();
    if (await indoorBtn.count() > 0) {
      await indoorBtn.click();
      await page.waitForTimeout(800);
    }

    // 4. Click a Table Card to open Drawer
    console.log('Opening Table Drawer...');
    const tableCards = page.locator('div[style*="left:"]');
    const cardCount = await tableCards.count();
    console.log(`Found ${cardCount} table card elements on canvas.`);
    if (cardCount > 0) {
      await tableCards.first().click();
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_table_drawer_status_polish.png'),
        fullPage: false
      });

      // Click Booking Tab inside Drawer
      console.log('Switching to Booking tab inside drawer...');
      const bookingTab = page.locator('button:has-text("Booking")');
      if (await bookingTab.count() > 0) {
        await bookingTab.first().click();
        await page.waitForTimeout(800);
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'proof_table_drawer_booking_polish.png'),
          fullPage: false
        });
      }

      // Click QR Tab inside Drawer
      console.log('Switching to QR tab inside drawer...');
      const qrTab = page.locator('button:has-text("QR")');
      if (await qrTab.count() > 0) {
        await qrTab.first().click();
        await page.waitForTimeout(800);
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, 'proof_table_drawer_qr_polish.png'),
          fullPage: false
        });
      }

      // Close drawer
      const closeBtn = page.locator('div.fixed.top-16 button:has(svg.lucide-x)').first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // 5. Open Add Table Modal
    console.log('Opening Add Table Modal...');
    const addTableBtn = page.locator('button:has-text("Add Table")').last();
    if (await addTableBtn.count() > 0) {
      await addTableBtn.click({ force: true });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_add_table_modal_polish.png'),
        fullPage: false
      });

      // Close Add Table Modal
      const modalClose = page.locator('button:has-text("Cancel")').first();
      if (await modalClose.count() > 0) {
        await modalClose.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // 6. Open Bulk Add Modal
    console.log('Opening Bulk Add Modal...');
    const bulkAddBtn = page.locator('button:has-text("Bulk Add")');
    if (await bulkAddBtn.count() > 0) {
      await bulkAddBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_bulk_add_modal_polish.png'),
        fullPage: false
      });

      // Close Bulk Add Modal
      const bulkClose = page.locator('button:has-text("Cancel")');
      if (await bulkClose.count() > 0) {
        await bulkClose.click({ force: true });
        await page.waitForTimeout(500);
      }
    }

    // 7. Test Mobile Viewport (iPhone 14 / One-Thumb Operations)
    console.log('Testing Mobile Viewport...');
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await mobilePage.goto('http://localhost:3000/dashboard/tables', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);

    // Click a table on mobile to trigger Bottom Sheet
    const mobileCards = mobilePage.locator('div[style*="left:"]');
    if (await mobileCards.count() > 0) {
      await mobileCards.first().click();
      await mobilePage.waitForTimeout(1000);
      await mobilePage.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_mobile_bottom_sheet_polish.png'),
        fullPage: false
      });
    }

    console.log('All verification screenshots captured successfully!');
  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
  }
}

verifyFloorLayout();
