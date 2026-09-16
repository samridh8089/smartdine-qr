const puppeteer = require('puppeteer');
const path = require('path');

async function debugLayout() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 575 });
  const fileUrl = 'file:///' + path.resolve(__dirname, '../docs/smartdine-control-tower-v4.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'load', timeout: 10000 });
  await new Promise(r => setTimeout(r, 1000));

  const info = await page.evaluate(() => {
    function getBox(id) {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        id,
        tagName: el.tagName,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: style.display,
        width: style.width,
        height: style.height,
        gridTemplateColumns: style.gridTemplateColumns,
        overflow: style.overflow,
        position: style.position,
        visibility: style.visibility,
        className: el.className
      };
    }

    return {
      windowSize: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
      workspace: getBox('tower-workspace'),
      leftSidebar: getBox('left-sidebar'),
      viewport: getBox('viewport'),
      inspector: getBox('inspector'),
      secFloor: getBox('sec-floor'),
      secErrHeatmap: getBox('sec-errheatmap'),
      masterSvg: getBox('master-svg'),
      nodeCustQr: getBox('node-cust_qr_scan')
    };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

debugLayout().catch(console.error);
