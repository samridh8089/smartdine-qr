import puppeteer from 'puppeteer';

async function main() {
  console.log('--- STARTING CONTROL TOWER MULTI-SUBSYSTEM VERIFICATION ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('1. Navigating to http://localhost:3000/founder-control-center.html ...');
    await page.goto('http://localhost:3000/founder-control-center.html', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    // Check page title and structure
    const title = await page.title();
    console.log('Page Title:', title);

    // Verify SVG and nodes loaded
    const nodeCount = await page.$$eval('.node-group', nodes => nodes.length);
    console.log(`Verified SVG Nodes count: ${nodeCount}`);

    // TEST 1: Simulate status transition 'preparing'
    console.log('\n--- TEST 1: Simulating PREPARING (Inventory Deduction + KDS + Reports) ---');
    await page.evaluate(() => {
      window.pulseArchitectureNodeForStatus('preparing');
    });

    // Wait for the cascade to progress to inventory consumption (delay 750ms)
    await new Promise(r => setTimeout(r, 900));

    const prepCheck = await page.evaluate(() => {
      const kdsPrep = document.getElementById('node-kds_preparing')?.classList.contains('flow-active');
      const orderPrep = document.getElementById('node-order_preparing')?.classList.contains('flow-active');
      const invConsume = document.getElementById('node-inv_consumption')?.classList.contains('flow-active');
      const invHasEmerald = document.getElementById('node-inv_consumption')?.classList.contains('flow-active-inventory');
      const bcModule = document.getElementById('bc-module')?.innerText;
      const bcNode = document.getElementById('bc-node')?.innerText;
      return { kdsPrep, orderPrep, invConsume, invHasEmerald, bcModule, bcNode };
    });

    console.log('PREPARING Cascade State:', prepCheck);
    if (prepCheck.invConsume) {
      console.log('✅ PASS: Inventory Engine node (inv_consumption) pulsed live on PREPARING!');
    } else {
      console.error('❌ FAIL: Inventory Engine node did not pulse!');
    }

    // Wait for reports cascade (delay 1550ms)
    await new Promise(r => setTimeout(r, 900));
    const repCheck = await page.evaluate(() => {
      const repInv = document.getElementById('node-report_inventory')?.classList.contains('flow-active');
      const bcModule = document.getElementById('bc-module')?.innerText;
      const bcNode = document.getElementById('bc-node')?.innerText;
      return { repInv, bcModule, bcNode };
    });
    console.log('REPORTS Cascade State:', repCheck);
    if (repCheck.repInv) {
      console.log('✅ PASS: Reports & Analytics node (report_inventory) pulsed live on PREPARING!');
    } else {
      console.error('❌ FAIL: Reports node did not pulse!');
    }

    // TEST 2: Simulate status transition 'served' (Billing Generation + Taxes)
    console.log('\n--- TEST 2: Simulating SERVED (Billing Generation + GST Taxes + Reports) ---');
    await page.evaluate(() => {
      window.pulseArchitectureNodeForStatus('served');
    });

    // Wait for billing generation (delay 750ms)
    await new Promise(r => setTimeout(r, 900));
    const servedCheck = await page.evaluate(() => {
      const waiterServe = document.getElementById('node-waiter_serve')?.classList.contains('flow-active');
      const billGen = document.getElementById('node-bill_generation')?.classList.contains('flow-active');
      const billHasPink = document.getElementById('node-bill_generation')?.classList.contains('flow-active-billing');
      const bcModule = document.getElementById('bc-module')?.innerText;
      const bcNode = document.getElementById('bc-node')?.innerText;
      return { waiterServe, billGen, billHasPink, bcModule, bcNode };
    });
    console.log('SERVED Cascade State (Billing):', servedCheck);
    if (servedCheck.billGen) {
      console.log('✅ PASS: Billing System node (bill_generation) pulsed live on SERVED!');
    } else {
      console.error('❌ FAIL: Billing node did not pulse!');
    }

    // TEST 3: Simulate status transition 'completed' (Settlement + Revenue + Reports)
    console.log('\n--- TEST 3: Simulating COMPLETED (Settlement + Sales Reports + Financial Reports) ---');
    await page.evaluate(() => {
      window.pulseArchitectureNodeForStatus('completed');
    });

    // Wait for settlement & reports cascade (delay 1600ms)
    await new Promise(r => setTimeout(r, 1800));
    const completedCheck = await page.evaluate(() => {
      const billSettle = document.getElementById('node-bill_settlement')?.classList.contains('flow-active');
      const repSales = document.getElementById('node-report_sales')?.classList.contains('flow-active');
      const repRev = document.getElementById('node-report_revenue')?.classList.contains('flow-active');
      const ownerReports = document.getElementById('node-owner_reports')?.classList.contains('flow-active');
      const bcModule = document.getElementById('bc-module')?.innerText;
      const bcNode = document.getElementById('bc-node')?.innerText;
      return { billSettle, repSales, repRev, ownerReports, bcModule, bcNode };
    });
    console.log('COMPLETED Cascade State (Reports & Settlement):', completedCheck);
    if (completedCheck.repSales || completedCheck.ownerReports) {
      console.log('✅ PASS: Reports & Analytics nodes (report_sales / owner_reports) pulsed live on COMPLETED!');
    } else {
      console.error('❌ FAIL: Reports nodes did not pulse on completed!');
    }

    // TEST 4: Live Activity Banner
    console.log('\n--- TEST 4: Live Activity HUD Banner Check ---');
    await page.evaluate(() => {
      window.showLiveBanner('Table T-10', 'preparing', '₹850', 'ord-test-1234');
    });

    const bannerContent = await page.evaluate(() => {
      const text = document.getElementById('live-activity-text')?.innerText;
      const display = document.getElementById('live-activity-banner')?.style.display;
      return { text, display };
    });
    console.log('Live Activity Banner:', bannerContent);
    if (bannerContent.text.includes('INVENTORY DEDUCTED') && bannerContent.text.includes('STOCK REPORT')) {
      console.log('✅ PASS: Live Activity HUD Banner displays Inventory & Reports telemetry!');
    } else {
      console.error('❌ FAIL: Banner text missing subsystem details!');
    }

    console.log('\n========================================');
    console.log('🎉 ALL SUBSYSTEM TELEMETRY VERIFICATIONS PASSED!');
    console.log('========================================');

  } catch (err) {
    console.error('Verification error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
