const fs = require('fs');
const puppeteer = require('puppeteer');

async function renderMockups() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artDir = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3';

  // =========================================================================
  // 1. MOCKUP: SS1 TOP HEADER SAFE SPACING + PURE "Manage" CRYSTAL PILL
  // =========================================================================
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 440, height: 920, deviceScaleFactor: 2 });
  await page1.setContent(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Plus Jakarta Sans', sans-serif; background: #e2e8f0; }
      .pure-crystal-btn {
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1.5px solid rgba(255, 255, 255, 0.75);
        box-shadow: 0 12px 30px -4px rgba(15, 23, 42, 0.22), 0 4px 10px rgba(0, 0, 0, 0.05);
      }
    </style>
  </head>
  <body class="p-0 m-0 flex justify-center py-6">
    <div class="w-[390px] h-[830px] bg-slate-50 rounded-[44px] shadow-2xl border-4 border-slate-900 overflow-hidden relative flex flex-col">
      <!-- Phone Top Status Bar (With camera punch hole & generous spacing) -->
      <div class="h-12 px-6 pt-2 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span class="text-sm font-black">11:12</span>
        <div class="w-4 h-4 bg-slate-900 rounded-full mx-auto shadow-inner"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold text-slate-500">5G</span>
          <span class="text-[11px] font-bold text-slate-700">30%</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-2 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- SPACIOUS APP HEADER: Generous Breathing Room from Status Bar & Screen Curves -->
      <div class="bg-white border-b border-slate-100 px-5 pt-3 pb-3.5 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 flex items-center justify-center font-black text-xs shadow-2xs">
            🔥 Grill
          </div>
          <div>
            <div class="text-base font-black text-slate-900 tracking-tight leading-tight">The Bistro Cafe</div>
            <div class="text-[10px] font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Safe Top Spacing Active
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 pr-1">
          <div class="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs cursor-pointer active:scale-95 transition-transform">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          </div>
        </div>
      </div>

      <!-- Scrollable Overview Content -->
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <h2 class="text-2xl font-black text-slate-900 tracking-tight">Overview Dashboard</h2>
          <div class="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 mt-2">
            Tue, 27 Oct, 2026
          </div>
        </div>

        <!-- Recipe Alert Card -->
        <div class="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 space-y-2">
          <div class="flex gap-2">
            <span class="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded">1 LOSS DISH</span>
            <span class="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">2 Cost Increased</span>
          </div>
          <p class="text-xs text-slate-700 leading-relaxed font-semibold">
            1 recipe selling below food cost (Afghani Saffron Chicken Tikka (8 Pc))
          </p>
          <div class="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            Review Recipes &amp; Costing &rarr;
          </div>
        </div>

        <!-- Stat Card 1 -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>REVENUE TODAY</span>
            <span class="text-slate-500 font-semibold">Today</span>
          </div>
          <div class="text-2xl font-black text-slate-900 mt-1">₹696</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">10 valid orders</div>
        </div>

        <!-- Stat Card 2 -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>TOTAL ORDERS</span>
            <span class="text-slate-500 font-semibold">Today</span>
          </div>
          <div class="text-2xl font-black text-slate-900 mt-1">10</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">10 non-cancelled</div>
        </div>

        <!-- Stat Card 3 (Behind the Floating Crystal Manage Button) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>ACTIVE TABLES</span>
            <span class="text-emerald-600 font-bold">Live</span>
          </div>
          <div class="text-2xl font-black text-slate-900 mt-1">0</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">0 dining now</div>
        </div>

        <!-- Stat Card 4 -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>AVG ORDER VALUE</span>
            <span class="text-slate-500 font-semibold">Per Order</span>
          </div>
          <div class="text-2xl font-black text-slate-900 mt-1">₹69.60</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">Per closed ticket</div>
        </div>
      </div>

      <!-- REDESIGNED PURE "Manage" CRYSTAL PILL (No 'M' box, No '☰' 3 lines, No subtitles) -->
      <div class="absolute bottom-6 right-5 z-40">
        <button class="pure-crystal-btn px-5 py-2.5 rounded-full cursor-pointer active:scale-95 transition-transform flex items-center justify-center">
          <span class="text-sm font-black text-slate-900 tracking-wide">Manage</span>
        </button>
      </div>

      <!-- Visual Callout Badge -->
      <div class="absolute bottom-20 right-5 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 z-50">
        <span>✨ Pure "Manage" Pill (Translucent Glass)</span>
      </div>
    </div>
  </body>
  </html>
  `);
  await page1.screenshot({ path: artDir + '/ss1_redesigned_header_and_pure_manage.png' });
  await page1.close();
  console.log('Generated ss1_redesigned_header_and_pure_manage.png');

  // =========================================================================
  // 2. MOCKUP: SS2 ORDER DETAIL WITH GRAND TOTAL AT THE VERY TOP!
  // =========================================================================
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 440, height: 920, deviceScaleFactor: 2 });
  await page2.setContent(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background: #e2e8f0; }</style>
  </head>
  <body class="p-0 m-0 flex justify-center py-6">
    <div class="w-[390px] h-[830px] bg-slate-50 rounded-[44px] shadow-2xl border-4 border-slate-900 overflow-hidden relative flex flex-col">
      <!-- Phone Top Status Bar -->
      <div class="h-11 px-6 pt-2 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span class="text-sm font-black">11:13</span>
        <div class="w-4 h-4 bg-slate-900 rounded-full mx-auto shadow-inner"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold text-slate-500">5G</span>
          <span class="text-[11px] font-bold text-slate-700">30%</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-2 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- Feature Highlight Bar -->
      <div class="bg-emerald-600 text-white text-[11px] font-black px-4 py-1.5 flex justify-between items-center shrink-0">
        <span>✨ REDESIGN: Grand Total at TOP + Dishes First</span>
        <span class="bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded text-[10px]">Owner Priority</span>
      </div>

      <!-- Scrollable Order Detail Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <!-- 1. BOLD TAPPABLE BACK BUTTON -->
        <button class="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-slate-800 font-extrabold text-sm shadow-xs active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Orders List
        </button>

        <!-- 2. ORDER HEADER WITH GRAND TOTAL AT THE VERY TOP! -->
        <div class="bg-white border-2 border-emerald-500/30 rounded-2xl p-4 shadow-sm space-y-3">
          <!-- Top Row: Order ID, Table & Grand Total Highlight -->
          <div class="flex justify-between items-start gap-2">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg font-black text-slate-900">Order #26D4687</h1>
                <span class="text-slate-400 cursor-pointer">📋</span>
              </div>
              <div class="text-xs font-bold text-slate-500 mt-0.5">
                TABLE 4 &bull; 27 OCT, 04:57 PM
              </div>
            </div>

            <!-- ★ GRAND TOTAL AT THE TOP (HIGH-VISIBILITY BADGE) ★ -->
            <div class="text-right bg-emerald-50 border-2 border-emerald-500/40 px-3.5 py-1.5 rounded-xl shrink-0 shadow-2xs">
              <span class="block text-[9px] font-black text-emerald-700 uppercase tracking-wider">Grand Total</span>
              <span class="text-xl font-black text-emerald-700 leading-tight">₹45.00</span>
            </div>
          </div>

          <!-- Bottom Row: Badges & Print Bill Button -->
          <div class="flex items-center justify-between pt-2.5 border-t border-slate-100 flex-wrap gap-2">
            <div class="flex items-center gap-1.5">
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Completed
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Paid Verified
              </span>
            </div>
            <button class="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
              <span>🖨️</span> Print Bill
            </button>
          </div>
        </div>

        <!-- 3. PRIMARY CONTENT: ORDERED FOOD ITEMS (DISHES FIRST!) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-black tracking-wider text-slate-400 uppercase">ORDERED ITEMS (1)</span>
            <span class="text-xs font-extrabold text-slate-700">Amount: ₹45.00</span>
          </div>
          
          <div class="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
            <div class="flex justify-between items-start">
              <div class="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span class="text-emerald-600 font-black">✓</span> Kozhi Nirachathu (Full Chicken)
              </div>
              <span class="font-black text-sm text-slate-900">₹45.00</span>
            </div>
            <div class="flex justify-between items-center text-xs pt-1">
              <span class="bg-emerald-100/90 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-[10px]">SERVED</span>
              <span class="text-slate-500 font-bold">1x @ ₹45.00</span>
            </div>
          </div>
        </div>

        <!-- 4. QUICK STATUS ACTIONS (DIRECTLY UNDER FOOD) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <span class="text-xs font-black tracking-wider text-slate-400 uppercase">QUICK ACTIONS</span>
          <div class="grid grid-cols-2 gap-2">
            <button class="bg-emerald-600 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1">
              ✓ Paid (CASH)
            </button>
            <button class="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1">
              🔄 Issue Refund
            </button>
          </div>
          <div class="text-[11px] text-slate-400 text-center font-medium">
            ⓘ This order has been finalized and cannot be edited.
          </div>
        </div>

        <!-- 5. SECONDARY INFO: COLLAPSIBLE AUDIT LOG (Zero clutter) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div class="flex justify-between items-center cursor-pointer">
            <div class="flex items-center gap-2">
              <span class="text-sm">🕒</span>
              <span class="text-xs font-extrabold text-slate-700">Order Timeline &amp; Staff Activity</span>
              <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">5 entries</span>
            </div>
            <span class="text-xs text-slate-400 font-bold">View details &darr;</span>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page2.screenshot({ path: artDir + '/ss2_order_detail_grand_total_top.png' });
  await page2.close();
  console.log('Generated ss2_order_detail_grand_total_top.png');

  await browser.close();
}

renderMockups().catch(err => {
  console.error(err);
  process.exit(1);
});
