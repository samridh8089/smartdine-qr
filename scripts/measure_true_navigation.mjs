import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE_URL = 'https://www.cleverops.in';

const ROUTES = [
  { name: 'Overview', path: '/dashboard' },
  { name: 'Orders', path: '/dashboard/orders' },
  { name: 'KDS', path: '/dashboard/kds' },
  { name: 'Menu', path: '/dashboard/menu' },
  { name: 'Inventory', path: '/dashboard/inventory' },
  { name: 'Reports', path: '/dashboard/reports' },
  { name: 'Billing', path: '/dashboard/billing' },
  { name: 'Tables', path: '/dashboard/tables' },
  { name: 'Staff', path: '/dashboard/staff' },
  { name: 'Settings', path: '/dashboard/settings' }
];

async function measureNavigationSuite(viewport, isMobile = false) {
  console.log(`\n=== Running Navigation Audit on ${viewport.width}x${viewport.height} (${isMobile ? 'Mobile' : 'Desktop'}) ===`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: viewport.width, height: viewport.height, isMobile });

  // 1. Login
  console.log('Logging in as owner...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]');
  await page.type('input[type="email"]', 'dsoni1281@gmail.com');
  await page.type('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const results = [];

  for (const target of ROUTES) {
    const currentUrl = page.url();
    if (currentUrl.endsWith(target.path)) {
      const altRoute = target.path === '/dashboard' ? '/dashboard/orders' : '/dashboard';
      if (isMobile) {
        await page.click('button[aria-label="Open sidebar"]').catch(() => {});
        await new Promise(r => setTimeout(r, 200));
        await page.click(`aside a[href="${altRoute}"]`).catch(() => {});
      } else {
        await page.click(`aside a[href="${altRoute}"]`).catch(() => {});
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (isMobile) {
      await page.waitForSelector('button[aria-label="Open sidebar"]', { timeout: 5000 });
      await page.click('button[aria-label="Open sidebar"]');
      await new Promise(r => setTimeout(r, 300));
    }

    const linkSelector = `aside a[href="${target.path}"]`;
    await page.waitForSelector(linkSelector, { timeout: 5000 });

    const metric = await page.evaluate(async (selector, targetPath) => {
      const link = document.querySelector(selector);
      if (!link) return { error: `Link ${selector} not found` };

      const clickTime = performance.now();
      let routeChangeStartTime = null;
      let fcpTime = null;
      let interactiveTime = null;

      link.click();

      const startCheck = performance.now();
      while (performance.now() - startCheck < 10000) {
        const now = performance.now();

        // 1. Route Change Start: when pathname matches target path
        if (!routeChangeStartTime && window.location.pathname === targetPath) {
          routeChangeStartTime = now;
        }

        // 2. First Contentful Paint: when new route DOM renders (skeleton or content)
        const main = document.querySelector('main');
        if (routeChangeStartTime && !fcpTime && main) {
          if (main.innerText.trim().length > 15 || main.querySelector('table, form, div.grid, h1, h2, h3, div.space-y-6, div.space-y-8')) {
            fcpTime = now;
          }
        }

        // 3. Interactive Time: when page-level loading skeletons / blocking spinners in main are resolved
        if (fcpTime && !interactiveTime) {
          // Identify if the route is showing a full-page loading skeleton or spinner
          const isPageLoading = Boolean(
            document.querySelector('main > div.animate-pulse') ||
            document.querySelector('main > div.space-y-6.animate-pulse') ||
            document.querySelector('main > div.space-y-8.animate-pulse') ||
            document.querySelector('main .animate-spin')
          );

          if (!isPageLoading) {
            interactiveTime = now;
            break;
          }
        }

        await new Promise(r => setTimeout(r, 16));
      }

      const endNow = performance.now();
      if (!routeChangeStartTime) routeChangeStartTime = endNow;
      if (!fcpTime) fcpTime = endNow;
      if (!interactiveTime) interactiveTime = endNow;

      return {
        clickToRouteChangeStartMs: Math.round(routeChangeStartTime - clickTime),
        firstContentfulPaintMs: Math.round(fcpTime - clickTime),
        interactiveTimeMs: Math.round(interactiveTime - clickTime),
        totalNavigationTimeMs: Math.round(interactiveTime - clickTime)
      };
    }, linkSelector, target.path);

    results.push({
      route: target.path,
      name: target.name,
      ...metric
    });

    console.log(`[${target.name}] ${target.path}: RouteStart=${metric.clickToRouteChangeStartMs}ms, FCP=${metric.firstContentfulPaintMs}ms, Interactive=${metric.interactiveTimeMs}ms, Total=${metric.totalNavigationTimeMs}ms`);
    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();
  return results;
}

async function runAudit() {
  const desktop = await measureNavigationSuite({ width: 1440, height: 900 }, false);
  const mobile = await measureNavigationSuite({ width: 390, height: 844 }, true);

  const baselineData = {
    timestamp: new Date().toISOString(),
    desktop,
    mobile
  };

  fs.writeFileSync('scratch/baseline_true_navigation.json', JSON.stringify(baselineData, null, 2));
  console.log('\n=== Baseline True Navigation Saved to scratch/baseline_true_navigation.json ===');
  console.table(desktop);
  console.table(mobile);
}

runAudit().catch(console.error);
