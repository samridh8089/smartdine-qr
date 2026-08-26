import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function loadEnv(file) {
  const envPath = path.resolve(process.cwd(), file);
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    }
  }
}

loadEnv('.env.test');
loadEnv('.env.local');

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000';

async function inspectCustomerMenu() {
  console.log(`Opening Customer Menu: ${BASE_URL}/menu/bistro?table=c0ef9a09-f509-4739-8e6b-921aa54f0a9f`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/menu/bistro?table=c0ef9a09-f509-4739-8e6b-921aa54f0a9f`);
    await page.waitForSelector('h2, h3, button', { timeout: 15000 });
    await page.waitForTimeout(1000);

    const title = await page.title();
    console.log(`Page title: ${title}`);

    const buttonsText = await page.locator('button').allTextContents();
    console.log(`Rendered Buttons (${buttonsText.length}):`, buttonsText);

    const headings = await page.locator('h1, h2, h3, h4').allTextContents();
    console.log(`Rendered Headings:`, headings.slice(0, 10));

  } catch (err) {
    console.error('Error inspecting customer menu:', err.message);
  } finally {
    await browser.close();
  }
}

inspectCustomerMenu();
