import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const SCRATCH_DIR = 'scratch';

async function gotoWithRetry(page, url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      return;
    } catch (e) {
      console.warn(`Goto attempt ${attempt} failed for ${url}: ${e.message}. Retrying...`);
      if (attempt === maxRetries) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
  console.log('=== CAPTURING INVENTORY & RECIPES PROOFS ===\n');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
  const page = await context.newPage();

  // Login as Owner
  console.log('Logging in as Owner...');
  await gotoWithRetry(page, 'https://www.cleverops.in/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'dsoni1281@gmail.com');
  await page.fill('input[type="password"]', 'FoodyHub@Owner2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });

  // 1. Inventory Items tab
  console.log('Going to /dashboard/inventory (Items tab)...');
  await gotoWithRetry(page, 'https://www.cleverops.in/dashboard/inventory');
  await page.waitForSelector('text=Paneer', { timeout: 15000 });
  await page.waitForTimeout(2000);

  const itemsScreen = path.join(SCRATCH_DIR, 'phase9b_inventory_items.png');
  await page.screenshot({ path: itemsScreen, fullPage: true });
  fs.copyFileSync(itemsScreen, path.join(ARTIFACTS_DIR, 'phase9b_inventory_items.png'));
  console.log('Saved phase9b_inventory_items.png');

  // 2. Recipes tab
  console.log('Clicking Recipes tab...');
  await page.click('button:has-text("Recipes & Costing"), button:has-text("Recipes"), [role="tab"]:has-text("Recipes")');
  await page.waitForSelector('text=Paneer Butter Masala', { timeout: 10000 });
  await page.waitForTimeout(2000);

  const recipesScreen = path.join(SCRATCH_DIR, 'phase9b_inventory_recipes.png');
  await page.screenshot({ path: recipesScreen, fullPage: true });
  fs.copyFileSync(recipesScreen, path.join(ARTIFACTS_DIR, 'phase9b_inventory_recipes.png'));
  console.log('Saved phase9b_inventory_recipes.png');

  await browser.close();
}

main().catch(console.error);
