import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Popup Screenshot (First Visit, no language stored in localStorage)
  console.log('1. Capturing: Popup Screenshot...');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lang-modal-title', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const popupPath = path.join(SCRATCH_DIR, 'proof_popup.png');
    await page.screenshot({ path: popupPath });
    fs.copyFileSync(popupPath, path.join(ARTIFACTS_DIR, 'proof_popup.png'));
    console.log('Saved proof_popup.png');
    await context.close();
  }

  // 2. Navbar Switch Screenshot (Desktop & Mobile)
  console.log('2. Capturing: Navbar Switch Screenshot...');
  {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('language', 'hi');
    });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('header', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const headerEl = await page.waitForSelector('header');
    const navSwitchPath = path.join(SCRATCH_DIR, 'proof_navbar_switch.png');
    await headerEl.screenshot({ path: navSwitchPath });
    fs.copyFileSync(navSwitchPath, path.join(ARTIFACTS_DIR, 'proof_navbar_switch.png'));
    console.log('Saved proof_navbar_switch.png');
    await context.close();
  }

  // 3. Desktop Screenshot (Hinglish)
  console.log('3. Capturing: Desktop Hinglish...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('language', 'hi');
    });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const desktopHiPath = path.join(SCRATCH_DIR, 'proof_desktop_hi.png');
    await page.screenshot({ path: desktopHiPath, fullPage: false });
    fs.copyFileSync(desktopHiPath, path.join(ARTIFACTS_DIR, 'proof_desktop_hi.png'));
    console.log('Saved proof_desktop_hi.png');
    await context.close();
  }

  // 4. Desktop Screenshot (English)
  console.log('4. Capturing: Desktop English...');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
    });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const desktopEnPath = path.join(SCRATCH_DIR, 'proof_desktop_en.png');
    await page.screenshot({ path: desktopEnPath, fullPage: false });
    fs.copyFileSync(desktopEnPath, path.join(ARTIFACTS_DIR, 'proof_desktop_en.png'));
    console.log('Saved proof_desktop_en.png');
    await context.close();
  }

  // 5. Mobile Screenshot (Hinglish - 390px viewport)
  console.log('5. Capturing: Mobile Hinglish (390px)...');
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('language', 'hi');
    });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const mobileHiPath = path.join(SCRATCH_DIR, 'proof_mobile_hi.png');
    await page.screenshot({ path: mobileHiPath });
    fs.copyFileSync(mobileHiPath, path.join(ARTIFACTS_DIR, 'proof_mobile_hi.png'));
    console.log('Saved proof_mobile_hi.png');
    await context.close();
  }

  // 6. Mobile Screenshot (English - 390px viewport)
  console.log('6. Capturing: Mobile English (390px)...');
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('language', 'en');
    });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const mobileEnPath = path.join(SCRATCH_DIR, 'proof_mobile_en.png');
    await page.screenshot({ path: mobileEnPath });
    fs.copyFileSync(mobileEnPath, path.join(ARTIFACTS_DIR, 'proof_mobile_en.png'));
    console.log('Saved proof_mobile_en.png');
    await context.close();
  }

  // 7. Mobile Popup Screenshot (390px viewport to verify it fits without scrolling)
  console.log('7. Capturing: Mobile Popup (390px)...');
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lang-modal-title', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const mobilePopupPath = path.join(SCRATCH_DIR, 'proof_mobile_popup.png');
    await page.screenshot({ path: mobilePopupPath });
    fs.copyFileSync(mobilePopupPath, path.join(ARTIFACTS_DIR, 'proof_mobile_popup.png'));
    console.log('Saved proof_mobile_popup.png');
    await context.close();
  }

  await browser.close();
  console.log('ALL PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('Error capturing proofs:', err);
  process.exit(1);
});
