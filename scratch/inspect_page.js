import puppeteer from 'puppeteer';
import fs from 'fs';

async function debugPage() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/menu/the-foody-hub?table=c0ef9a09-f509-4739-8e6b-921aa54f0a9f', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 6000));
  const html = await page.content();
  fs.writeFileSync('C:/Users/DELL/.gemini/antigravity/brain/ede4cd64-0118-4151-ace3-c43138533807/scratch/dom.html', html);
  console.log('[Inspect] Saved dom.html length:', html.length);
  await browser.close();
}

debugPage();
