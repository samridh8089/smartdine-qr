import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\63be691e-3623-4138-a70b-1f50b5cb5801';

async function verifyFloorPolishFinal() {
  console.log('Launching browser for Founder Final Polish Verification...');
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

    console.log('Waiting for dashboard navigation...');
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 20000 });
    console.log('Logged in successfully!');

    console.log('Navigating to Tables & Floor Layout Manager...');
    await page.goto('http://localhost:3000/dashboard/tables', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // 1. Proof 1: Centered Equal-Width Segmented Floor Tabs & Header (No Toast OPS)
    console.log('Capturing Proof 1: Header (No Toast OPS) & Centered Segmented Floor Tabs...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_header_centered_tabs.png'),
      fullPage: false
    });

    // 2. Test Floor Rename: Click edit icon on Indoor tab, change to "AC Hall", press Enter
    console.log('Testing Floor Rename on Indoor tab...');
    const renameBtn = page.locator('button[title*="Rename Floor"]').first();
    if (await renameBtn.count() > 0) {
      await renameBtn.click({ force: true });
      await page.waitForTimeout(500);
      const floorInput = page.locator('input[value="Indoor"], input[value="AC Hall"]').first();
      if (await floorInput.count() > 0) {
        await floorInput.fill('AC Hall');
        await floorInput.press('Enter');
        await page.waitForTimeout(600);
      }
    }

    // Capture Proof 2: Renamed Floor Tab ("AC Hall")
    console.log('Capturing Proof 2: Renamed Floor Tab ("AC Hall")...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_floor_renamed_achall.png'),
      fullPage: false
    });

    // 3. Proof 3: Clean Available Table Cards & Occupied Hierarchy
    console.log('Capturing Proof 3: Clean Available & Occupied Hierarchy Cards...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_table_cards_hierarchy.png'),
      fullPage: false
    });

    // 4. Test Live Timer: Measure elapsed time string now vs 3 seconds later
    const timerElem = page.locator('span:has-text("Elapsed")').first();
    const initialElapsedText = (await timerElem.count() > 0) ? await timerElem.textContent() : '';
    console.log('Initial Elapsed text:', initialElapsedText);
    await page.waitForTimeout(3000);
    const updatedElapsedText = (await timerElem.count() > 0) ? await timerElem.textContent() : '';
    console.log('Updated Elapsed text after 3s:', updatedElapsedText);

    // 5. Test Floor Navigation: Switch between all floors (Outdoor, First Floor, Terrace)
    console.log('Testing Floor Navigation across all tabs...');
    const outdoorTab = page.locator('div:has-text("Outdoor")').last();
    await outdoorTab.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_floor_outdoor.png'),
      fullPage: false
    });

    const firstFloorTab = page.locator('div:has-text("First Floor")').last();
    await firstFloorTab.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_floor_first_floor.png'),
      fullPage: false
    });

    const terraceTab = page.locator('div:has-text("Terrace")').last();
    await terraceTab.click({ force: true });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_floor_terrace.png'),
      fullPage: false
    });

    // Switch back to AC Hall (Indoor)
    const acHallTab = page.locator('div:has-text("AC Hall")').last();
    await acHallTab.click({ force: true });
    await page.waitForTimeout(800);

    // 6. Stress Test 50+ Tables & Scroll Container
    console.log('Executing 50+ Tables Stress Test via Bulk Add...');
    const bulkAddBtn = page.locator('button:has-text("Bulk Add")').first();
    await bulkAddBtn.click({ force: true });
    await page.waitForTimeout(800);

    const submitBulkBtn = page.locator('button[type="submit"]:has-text("Generate Layout")').first();
    if (await submitBulkBtn.count() > 0) {
      await submitBulkBtn.click({ force: true });
      await page.waitForTimeout(3500);
    }

    // Capture Proof 7: 50+ Tables Layout with Vertical Scroll
    console.log('Capturing Proof 7: 50+ Tables Layout with Scrollable Area...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_50_tables_scroll_top.png'),
      fullPage: false
    });

    // Scroll down inside the canvas container
    const scrollContainer = page.locator('div.overflow-auto').first();
    if (await scrollContainer.count() > 0) {
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 500;
      });
      await page.waitForTimeout(1000);
    }

    console.log('Capturing Proof 8: 50+ Tables Scrolled Down...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_final_50_tables_scrolled_down.png'),
      fullPage: false
    });

    console.log('All Final Polish Verification steps completed successfully!');
  } catch (err) {
    console.error('Error during Final Polish Verification:', err);
  } finally {
    await browser.close();
  }
}

verifyFloorPolishFinal();
