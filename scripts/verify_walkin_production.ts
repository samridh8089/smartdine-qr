import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\63be691e-3623-4138-a70b-1f50b5cb5801';

async function verifyWalkInSeating() {
  console.log('Launching browser for Walk-In Seating Owner Verification...');
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

    // 1. Proof of Floor Layout with Polished Table Cards (Occupied cards with items & status strip, Reserved cards with countdown)
    console.log('Capturing Floor Layout with polished Table Cards...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_walkin_floor_table_cards.png'),
      fullPage: false
    });

    // 2. Click "Seat Walk-In Guest" button
    console.log('Clicking Seat Walk-In Guest button...');
    const walkInBtn = page.locator('button:has-text("Seat Walk-In Guest")').first();
    await walkInBtn.click({ force: true });
    await page.waitForTimeout(800);

    // Capture Walk-In Modal default state (Guest Count = 4, Smart Table Suggestion)
    console.log('Capturing Walk-In Modal (Default: 4 Guests)...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_walkin_modal_4guests.png'),
      fullPage: false
    });

    // 3. Test Quick Chips: Click chip '2'
    console.log('Clicking Quick Chip 2...');
    const chip2 = page.locator('button:has-text("2")').first();
    await chip2.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_walkin_modal_2guests.png'),
      fullPage: false
    });

    // 4. Test Quick Chip '6+' and Custom Input
    console.log('Clicking Quick Chip 6+...');
    const chip6Plus = page.locator('button:has-text("6+")').first();
    await chip6Plus.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_walkin_modal_custom6plus.png'),
      fullPage: false
    });

    // 5. Select 4 Guests and Click "Seat Guest" (One-Click Seating)
    console.log('Selecting 4 guests and executing One-Click Seat...');
    const chip4 = page.locator('button:has-text("4")').first();
    await chip4.click({ force: true });
    await page.waitForTimeout(400);

    const seatGuestBtn = page.locator('button:has-text("Seat Guest")').first();
    await seatGuestBtn.click({ force: true });
    await page.waitForTimeout(2000);

    // Capture drawer showing Live Session for newly seated table
    console.log('Capturing Table Drawer Live Session after Seating...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'proof_walkin_seated_drawer_live_session.png'),
      fullPage: false
    });

    // 6. Click an Occupied table (e.g. Table 2) to view full Live Session metrics & order status breakdown
    console.log('Selecting Table 2 to view detailed Live Session metrics...');
    const tableCards = page.locator('div[style*="left:"]');
    if (await tableCards.count() > 0) {
      await tableCards.nth(2).click({ force: true });
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_walkin_occupied_live_session_metrics.png'),
        fullPage: false
      });
    }

    // 7. Mobile Viewport (iPhone 14 / One-Thumb Operations)
    console.log('Testing Mobile Viewport (390x844)...');
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 390, height: 844 });
    await mobilePage.goto('http://localhost:3000/dashboard/tables', { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);

    // Open Walk-In Modal on mobile to verify Bottom Sheet
    const mobileWalkInBtn = mobilePage.locator('button:has-text("Seat Walk-In Guest")').first();
    if (await mobileWalkInBtn.count() > 0) {
      await mobileWalkInBtn.click({ force: true });
      await mobilePage.waitForTimeout(800);
      await mobilePage.screenshot({
        path: path.join(ARTIFACT_DIR, 'proof_walkin_mobile_bottom_sheet.png'),
        fullPage: false
      });
    }

    console.log('All Walk-In verification screenshots captured successfully!');
  } catch (err) {
    console.error('Error during Walk-In verification:', err);
  } finally {
    await browser.close();
  }
}

verifyWalkInSeating();
