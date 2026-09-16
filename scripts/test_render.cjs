const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function testRender() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // 1. User's exact screen size: 1024 x 575
  await page.setViewport({ width: 1024, height: 575 });
  const fileUrl = 'file:///' + path.resolve(__dirname, '../docs/smartdine-control-tower-v4.html').replace(/\\/g, '/');
  console.log('Navigating to:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'load', timeout: 10000 });
  await new Promise(r => setTimeout(r, 1500));

  const shot1024 = path.resolve(__dirname, '../docs/v4_proof_1024x575.png');
  await page.screenshot({ path: shot1024 });
  console.log('Saved 1024x575 screenshot to:', shot1024, fs.statSync(shot1024).size, 'bytes');

  // Also copy to artifact directory so we can view it
  const artifactDir = 'C:/Users/admin/.gemini/antigravity-ide/brain/1190a464-2370-4d41-a58a-6c128830815c';
  fs.copyFileSync(shot1024, path.join(artifactDir, 'v4_proof_1024x575.png'));

  // 2. Standard laptop: 1366 x 768
  await page.setViewport({ width: 1366, height: 768 });
  await new Promise(r => setTimeout(r, 800));
  const shot1366 = path.resolve(__dirname, '../docs/v4_proof_1366x768.png');
  await page.screenshot({ path: shot1366 });
  console.log('Saved 1366x768 screenshot to:', shot1366, fs.statSync(shot1366).size, 'bytes');
  fs.copyFileSync(shot1366, path.join(artifactDir, 'v4_proof_1366x768.png'));

  await browser.close();
  console.log('Capture completed successfully!');
}

testRender().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
