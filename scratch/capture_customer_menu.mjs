import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function main() {
  console.log('=== CAPTURING CUSTOMER MENU TABLE 1 ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const page = await context.newPage();

  console.log('Navigating to customer table 1 URL...');
  await page.goto('https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2');

  console.log('Waiting for dishes to appear...');
  await page.waitForSelector('text=Veg Spring Roll', { timeout: 20000 });
  await page.waitForTimeout(2000);

  const screenPath = path.join(SCRATCH_DIR, 'phase9b_customer_menu_table1.png');
  await page.screenshot({ path: screenPath, fullPage: false });
  fs.copyFileSync(screenPath, path.join(ARTIFACTS_DIR, 'phase9b_customer_menu_table1.png'));
  console.log('Saved phase9b_customer_menu_table1.png');

  // Also scroll down to show Main Course dishes (Paneer Butter Masala, Dal Makhani)
  console.log('Clicking Main Course tab...');
  await page.click('button:has-text("Main Course"), [role="tab"]:has-text("Main Course")');
  await page.waitForSelector('text=Paneer Butter Masala', { timeout: 10000 });
  await page.waitForTimeout(1500);

  const mainCourseScreen = path.join(SCRATCH_DIR, 'phase9b_customer_menu_maincourse.png');
  await page.screenshot({ path: mainCourseScreen, fullPage: false });
  fs.copyFileSync(mainCourseScreen, path.join(ARTIFACTS_DIR, 'phase9b_customer_menu_maincourse.png'));
  console.log('Saved phase9b_customer_menu_maincourse.png');

  await browser.close();
}

main().catch(console.error);
