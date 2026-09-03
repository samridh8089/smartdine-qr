import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function captureMenuProofs() {
  console.log('=== CAPTURING OWNER & CUSTOMER MENU PROOFS ===\n');
  const browser = await chromium.launch({ headless: true });

  // 1. Owner Dashboard Menu
  console.log('Logging in as Owner...');
  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const ownerPage = await ownerContext.newPage();

  await ownerPage.goto('https://www.cleverops.in/login');
  await ownerPage.waitForSelector('input[type="email"]');
  await ownerPage.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await ownerPage.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await ownerPage.click('button[type="submit"]');
  await ownerPage.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  console.log('Going to /dashboard/menu...');
  await ownerPage.goto('https://www.cleverops.in/dashboard/menu');
  await ownerPage.waitForSelector('text=Veg Spring Roll', { timeout: 15000 });
  await ownerPage.waitForTimeout(1000);

  // Take screenshot of Starters tab
  const startersScreen = path.join(SCRATCH_DIR, 'phase9b_owner_menu_starters.png');
  await ownerPage.screenshot({ path: startersScreen, fullPage: true });
  fs.copyFileSync(startersScreen, path.join(ARTIFACTS_DIR, 'phase9b_owner_menu_starters.png'));
  console.log('Saved phase9b_owner_menu_starters.png');

  // Click Main Course tab
  console.log('Clicking Main Course tab...');
  await ownerPage.click('button:has-text("Main Course"), a:has-text("Main Course"), [role="tab"]:has-text("Main Course")');
  await ownerPage.waitForSelector('text=Paneer Butter Masala', { timeout: 10000 });
  await ownerPage.waitForTimeout(1000);

  const mainCourseScreen = path.join(SCRATCH_DIR, 'phase9b_owner_menu_maincourse.png');
  await ownerPage.screenshot({ path: mainCourseScreen, fullPage: true });
  fs.copyFileSync(mainCourseScreen, path.join(ARTIFACTS_DIR, 'phase9b_owner_menu_maincourse.png'));
  console.log('Saved phase9b_owner_menu_maincourse.png');

  // 2. Customer Digital Menu for Table 1
  console.log('Opening Customer Menu for Table 1...');
  const custContext = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const custPage = await custContext.newPage();

  await custPage.goto('https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2');
  await custPage.waitForSelector('text=Veg Spring Roll', { timeout: 15000 });
  await custPage.waitForTimeout(1500);

  const custScreen = path.join(SCRATCH_DIR, 'phase9b_customer_menu.png');
  await custPage.screenshot({ path: custScreen, fullPage: true });
  fs.copyFileSync(custScreen, path.join(ARTIFACTS_DIR, 'phase9b_customer_menu.png'));
  console.log('Saved phase9b_customer_menu.png');

  await browser.close();
}

captureMenuProofs().catch(console.error);
