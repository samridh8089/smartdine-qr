const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const iconPath = path.resolve(__dirname, '../smartdine-mobile/assets/icon.png');
  const buffer = fs.readFileSync(iconPath);
  const base64 = buffer.toString('base64');

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; background: transparent;">
        <img id="img" src="data:image/webp;base64,${base64}" />
      </body>
    </html>
  `;
  await page.setContent(html);

  const dimensions = await page.evaluate(async () => {
    const img = document.getElementById('img');
    await img.decode();
    return { width: img.naturalWidth, height: img.naturalHeight };
  });
  console.log('Original dimensions:', dimensions);

  await page.setViewport({ width: dimensions.width, height: dimensions.height, deviceScaleFactor: 1 });

  const imgElement = await page.$('#img');
  const pngBuffer = await imgElement.screenshot({ type: 'png', omitBackground: true });

  const hex = pngBuffer.slice(0, 16).toString('hex');
  const isPng = hex.startsWith('89504e470d0a1a0a');
  console.log('Converted PNG size:', pngBuffer.length, 'head:', hex, 'isPng:', isPng);

  if (!isPng) {
    throw new Error('Conversion did not yield valid PNG!');
  }

  fs.writeFileSync(iconPath, pngBuffer);
  console.log('Successfully overwritten', iconPath);

  await browser.close();
})();
