import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.type(), msg.text()));

  await page.goto('https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const evalResult = await page.evaluate(async () => {
    try {
      // Find the db object imported in client bundles
      // @ts-ignore
      const modules = window.__NEXT_REGISTER_CHUNK_MODULES || [];
      console.log('Next modules found:', modules.length);
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  });

  console.log('Eval result:', evalResult);
  await browser.close();
}

main().catch(console.error);
