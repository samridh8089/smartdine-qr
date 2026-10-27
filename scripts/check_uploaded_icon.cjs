const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const filePath = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/.user_uploaded/media_1793098131217_3b10cdeb.jpg';
  const b = fs.readFileSync(filePath).toString('base64');
  await page.setContent(`<img id="img" src="data:image/jpeg;base64,${b}" />`);
  const dims = await page.evaluate(() => {
    const el = document.getElementById('img');
    return { w: el.naturalWidth, h: el.naturalHeight };
  });
  console.log('Uploaded image resolution:', dims);
  await browser.close();
})();
