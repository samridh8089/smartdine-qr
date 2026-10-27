const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const srcImg = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3/.user_uploaded/media_1793098131217_3b10cdeb.jpg';
  const base64 = fs.readFileSync(srcImg).toString('base64');

  // 1. Generate 1024x1024 standard square icon
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;background:#ffffff;overflow:hidden;">
      <img id="icon" src="data:image/jpeg;base64,${base64}" style="width:1024px;height:1024px;object-fit:cover;display:block;" />
    </body></html>
  `);
  const iconBuf = await page.screenshot({ type: 'png' });
  fs.writeFileSync('smartdine-mobile/assets/icon.png', iconBuf);
  fs.writeFileSync('smartdine-mobile/assets/splash-icon.png', iconBuf);
  fs.writeFileSync('public/logo.png', iconBuf);
  fs.writeFileSync('public/apple-touch-icon.png', iconBuf);
  fs.writeFileSync('public/icon-512.png', iconBuf);
  console.log('1024x1024 icon.png written, size:', iconBuf.length);

  // 2. Generate 192x192 icon
  await page.setViewport({ width: 192, height: 192, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;background:#ffffff;overflow:hidden;">
      <img id="icon" src="data:image/jpeg;base64,${base64}" style="width:192px;height:192px;object-fit:cover;display:block;" />
    </body></html>
  `);
  const icon192Buf = await page.screenshot({ type: 'png' });
  fs.writeFileSync('public/icon-192.png', icon192Buf);
  console.log('192x192 icon written, size:', icon192Buf.length);

  // 3. Generate Android Adaptive Foreground (safe zone centered, padding around emblem)
  // Adaptive icon standard: 1024x1024 with 72% inner safe zone (~720px centered)
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html><body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;height:1024px;overflow:hidden;">
      <img src="data:image/jpeg;base64,${base64}" style="width:720px;height:720px;object-fit:contain;border-radius:140px;box-shadow:0 8px 32px rgba(0,0,0,0.12);" />
    </body></html>
  `);
  const adaptiveBuf = await page.screenshot({ type: 'png', omitBackground: true });
  fs.writeFileSync('smartdine-mobile/assets/android-icon-foreground.png', adaptiveBuf);
  console.log('Adaptive foreground written, size:', adaptiveBuf.length);

  // Also copy the original JPG as launcher-icon.jpg
  fs.copyFileSync(srcImg, 'smartdine-mobile/assets/launcher-icon.jpg');
  fs.copyFileSync(srcImg, 'public/launcher-icon.jpg');

  await browser.close();
  console.log('All branding assets updated successfully!');
})();
