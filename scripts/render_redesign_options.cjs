const fs = require('fs');
const puppeteer = require('puppeteer');

async function renderMockups() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artDir = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3';

  // =========================================================================
  // 1. SS1: TOP HEADER REFINED + STICKY CRYSTAL "MANAGE" BUTTON (FAB)
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
      .crystal-fab {
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1.5px solid rgba(255, 255, 255, 0.6);
        box-shadow: 0 14px 35px -6px rgba(15, 23, 42, 0.25), 0 4px 10px rgba(0, 0, 0, 0.06);
      }
    </style>
  </head>
  <body class="p-0 m-0 flex justify-center py-6">
    <div class="w-[390px] h-[830px] bg-white rounded-[44px] shadow-2xl border-4 border-slate-900 overflow-hidden relative flex flex-col">
      <!-- Phone Top Status Bar -->
      <div class="h-10 px-6 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span>9:11</span>
        <div class="w-24 h-4 bg-slate-900 rounded-full mx-auto"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold">5G</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-3 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- App Header: Safe Padding + Clean Spacing (NO MANAGE BUTTON AT TOP) -->
      <div class="bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 py-3 flex items-center justify-between shrink-0 shadow-2xs z-20">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-xs">
            B
          </div>
          <div>
            <div class="text-sm font-extrabold text-slate-900 leading-tight">The Bistro Cafe</div>
            <div class="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online Dashboard
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <div class="p-2 rounded-xl bg-slate-900 text-white shadow-xs cursor-pointer">
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
            <span class="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded">3 LOSS DISHES</span>
            <span class="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">1 Cost Increased</span>
          </div>
          <p class="text-xs text-slate-700 leading-relaxed font-semibold">
            3 recipes selling below food cost (Afghani Saffron Chicken Tikka, Dragon Momos...)
          </p>
          <div class="inline-flex items-center gap-1 text-xs font-bold text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            Review Recipes & Costing &rarr;
          </div>
        </div>

        <!-- Stat Card 1 -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>REVENUE TODAY</span>
            <span class="text-slate-500 font-semibold">Today</span>
          </div>
          <div class="text-2xl font-black text-slate-900 mt-1">₹474</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">9 valid orders</div>
        </div>

        <!-- Stat Card 2 -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-center text-xs font-bold text-slate-400">
            <span>TOTAL ORDERS</span>
            <span class="text-slate-500 font-semibold">Today</span>
          </div>
          <div class="text-2xl font-black text-slate-900 mt-1">9</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">9 non-cancelled</div>
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
          <div class="text-2xl font-black text-slate-900 mt-1">₹52.67</div>
          <div class="text-xs text-slate-500 font-medium mt-0.5">Per closed ticket</div>
        </div>
      </div>

      <!-- STICKY CRYSTAL FLOATING BUTTON (Positioned exactly at user marked 'M') -->
      <div class="absolute bottom-6 right-5 z-40">
        <button class="crystal-fab flex items-center gap-2.5 px-4 py-3 rounded-2xl cursor-pointer active:scale-95 transition-transform">
          <div class="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-sm">
            M
          </div>
          <div class="text-left pr-1">
            <div class="text-xs font-black text-slate-900 leading-tight">Manage</div>
            <div class="text-[9px] font-bold text-slate-500 leading-tight">Sidebar &bull; Navigation</div>
          </div>
          <svg class="w-4 h-4 text-slate-700 ml-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
      </div>

      <!-- Annotation Pill -->
      <div class="absolute bottom-24 left-4 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 z-50">
        <span>✨ Sticky Crystal FAB (Har page pe persistent)</span>
      </div>
    </div>
  </body>
  </html>
  `);
  await page1.screenshot({ path: artDir + '/ss1_header_and_crystal_manage_button.png' });
  await page1.close();
  console.log('Generated ss1_header_and_crystal_manage_button.png');

  // =========================================================================
  // 2. SS2 OPTION A: "FOOD ITEMS FIRST & COMPACT QUICK ACTIONS"
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
      <!-- Status Bar -->
      <div class="h-10 px-6 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span>9:12</span>
        <div class="w-24 h-4 bg-slate-900 rounded-full mx-auto"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold">5G</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-3 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- Screen Top Bar with Option Badge -->
      <div class="bg-indigo-600 text-white text-[11px] font-bold px-4 py-1.5 flex justify-between items-center shrink-0">
        <span>OPTION A: Food First + Clean Actions</span>
        <span class="bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded text-[10px]">Recommended</span>
      </div>

      <!-- Scrollable Order Details Container -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <!-- 1. BOLD TAPPABLE BACK BUTTON -->
        <button class="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 rounded-2xl py-3 px-4 flex items-center justify-center gap-2 text-slate-800 font-extrabold text-sm shadow-xs active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Orders List
        </button>

        <!-- 2. ORDER HEADER CARD -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-start">
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg font-black text-slate-900">Order #26D4687</h1>
                <span class="text-slate-400 cursor-pointer">📋</span>
              </div>
              <div class="text-xs font-bold text-slate-500 mt-1">
                TABLE 4 &bull; 27 OCT, 04:57 PM
              </div>
            </div>
            <button class="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs">
              <span>🖨️</span> Print
            </button>
          </div>
          <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Completed
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Paid Verified
            </span>
            <span class="ml-auto text-base font-black text-slate-900">₹45.00</span>
          </div>
        </div>

        <!-- 3. PRIMARY CONTENT: ORDERED FOOD ITEMS (FIRST!) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
          <div class="flex justify-between items-center mb-2.5">
            <span class="text-xs font-black tracking-wider text-slate-400 uppercase">ORDERED ITEMS (1)</span>
            <span class="text-xs font-extrabold text-slate-700">Total: ₹45</span>
          </div>
          <div class="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
            <div class="flex justify-between items-start">
              <div class="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <span class="text-emerald-600 font-black">✓</span> Kozhi Nirachathu (Full Chicken)
              </div>
              <span class="font-black text-sm text-slate-900">₹45</span>
            </div>
            <div class="flex justify-between items-center text-xs pt-1">
              <span class="bg-emerald-100/90 text-emerald-800 font-extrabold px-2 py-0.5 rounded text-[10px]">SERVED</span>
              <span class="text-slate-500 font-bold">1x @ ₹45</span>
            </div>
          </div>
        </div>

        <!-- 4. QUICK STATUS ACTIONS (DIRECTLY UNDER FOOD) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <span class="text-xs font-black tracking-wider text-slate-400 uppercase">UPDATE STATUS</span>
          <div class="grid grid-cols-2 gap-2">
            <button class="bg-emerald-600 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1">
              ✓ Paid (CASH)
            </button>
            <button class="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1">
              🔄 Refund
            </button>
          </div>
          <div class="text-[11px] text-slate-400 text-center font-medium">
            ⓘ This order is completed and finalized.
          </div>
        </div>

        <!-- 5. SECONDARY INFO: COLLAPSIBLE ACCORDION (Audit logs hidden by default) -->
        <div class="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div class="flex justify-between items-center cursor-pointer">
            <div class="flex items-center gap-2">
              <span class="text-sm">🕒</span>
              <span class="text-xs font-extrabold text-slate-700">Order Timeline & Staff Activity</span>
              <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">5 steps</span>
            </div>
            <span class="text-xs text-slate-400 font-bold">Show &darr;</span>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page2.screenshot({ path: artDir + '/ss2_order_detail_option_1.png' });
  await page2.close();
  console.log('Generated ss2_order_detail_option_1.png');

  // =========================================================================
  // 3. SS2 OPTION B: "POS ORDER SLIP / TICKET STYLE"
  // =========================================================================
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 440, height: 920, deviceScaleFactor: 2 });
  await page3.setContent(`
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
      <!-- Status Bar -->
      <div class="h-10 px-6 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span>9:12</span>
        <div class="w-24 h-4 bg-slate-900 rounded-full mx-auto"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold">5G</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-3 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- Screen Top Bar with Option Badge -->
      <div class="bg-amber-600 text-white text-[11px] font-bold px-4 py-1.5 flex justify-between items-center shrink-0">
        <span>OPTION B: POS Digital Ticket Style</span>
        <span class="bg-amber-800 text-amber-100 px-2 py-0.5 rounded text-[10px]">Restaurant Classic</span>
      </div>

      <!-- Top Header Navigation -->
      <div class="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
        <button class="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Orders
        </button>
        <div class="text-right">
          <div class="text-xs font-black text-slate-900">#26D4687</div>
          <div class="text-[10px] font-bold text-slate-400">TABLE 4 &bull; Dine-In</div>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <!-- Digital Receipt Ticket Card -->
        <div class="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm relative">
          <!-- Ticket Top -->
          <div class="text-center pb-3 border-b-2 border-dashed border-slate-200">
            <span class="inline-block bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase">
              Paid &amp; Completed
            </span>
            <div class="text-xs text-slate-400 font-bold mt-1.5">27 Oct 2026, 04:57 PM</div>
          </div>

          <!-- Items List -->
          <div class="py-4 space-y-3 border-b-2 border-dashed border-slate-200">
            <div class="flex justify-between items-start">
              <div>
                <div class="text-sm font-black text-slate-900">1x Kozhi Nirachathu (Full Chicken)</div>
                <div class="text-xs text-emerald-600 font-bold mt-0.5">Kitchen Status: SERVED</div>
              </div>
              <span class="text-sm font-black text-slate-900">₹45.00</span>
            </div>
          </div>

          <!-- Total Calculation -->
          <div class="pt-3 space-y-1.5 text-xs">
            <div class="flex justify-between text-slate-500 font-medium">
              <span>Item Subtotal</span>
              <span>₹45.00</span>
            </div>
            <div class="flex justify-between text-slate-500 font-medium">
              <span>Taxes &amp; Fees</span>
              <span>₹0.00</span>
            </div>
            <div class="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total</span>
              <span class="text-emerald-600">₹45.00</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="space-y-2">
          <button class="w-full bg-slate-900 text-white font-extrabold text-sm py-3 px-4 rounded-xl shadow-xs flex items-center justify-center gap-2">
            <span>🖨️</span> Print Kitchen KOT &amp; Bill
          </button>
          <button class="w-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5">
            <span>🔄</span> Issue Customer Refund
          </button>
        </div>

        <!-- Compact Staff Audit Link -->
        <div class="text-center pt-2">
          <button class="text-xs font-bold text-slate-400 hover:text-slate-600 underline">
            Staff Audit Log: Deepak Ji, Samridh Tomar &darr;
          </button>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page3.screenshot({ path: artDir + '/ss2_order_detail_option_2.png' });
  await page3.close();
  console.log('Generated ss2_order_detail_option_2.png');

  // =========================================================================
  // 4. SS2 OPTION C: "TABBED SPLIT VIEW (DISHES & ACTIONS vs AUDIT LOG)"
  // =========================================================================
  const page4 = await browser.newPage();
  await page4.setViewport({ width: 440, height: 920, deviceScaleFactor: 2 });
  await page4.setContent(`
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
      <!-- Status Bar -->
      <div class="h-10 px-6 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span>9:12</span>
        <div class="w-24 h-4 bg-slate-900 rounded-full mx-auto"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold">5G</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-3 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- Screen Top Bar with Option Badge -->
      <div class="bg-teal-600 text-white text-[11px] font-bold px-4 py-1.5 flex justify-between items-center shrink-0">
        <span>OPTION C: Tabbed Segmentation</span>
        <span class="bg-teal-800 text-teal-100 px-2 py-0.5 rounded text-[10px]">Zero Clutter</span>
      </div>

      <!-- Top Back Button -->
      <div class="p-3 bg-white border-b border-slate-200">
        <button class="w-full bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl py-2 px-3 flex items-center justify-center gap-2 text-slate-800 font-extrabold text-xs">
          &larr; Back to Orders List
        </button>
      </div>

      <!-- Order Summary Strip -->
      <div class="bg-white px-4 py-3 border-b border-slate-100 flex justify-between items-center">
        <div>
          <div class="text-sm font-black text-slate-900">Order #26D4687</div>
          <div class="text-xs font-bold text-slate-500">Table 4 &bull; ₹45.00</div>
        </div>
        <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-2.5 py-1 rounded-lg">
          Completed
        </span>
      </div>

      <!-- SEGMENTED TABS (Dishes vs History) -->
      <div class="bg-slate-200/80 p-1 mx-4 mt-3 rounded-xl grid grid-cols-2 gap-1 text-xs font-bold shrink-0">
        <button class="bg-white text-slate-900 py-1.5 rounded-lg shadow-xs text-center font-extrabold">
          🍽️ Dishes &amp; Status
        </button>
        <button class="text-slate-500 py-1.5 rounded-lg text-center font-bold">
          📋 Timeline &amp; Logs (5)
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <!-- Dish Items Card -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
          <div class="text-xs font-black text-slate-400 uppercase tracking-wider">Ordered Food Items</div>
          <div class="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
            <div>
              <div class="text-sm font-black text-slate-900">Kozhi Nirachathu (Full)</div>
              <div class="text-xs font-bold text-emerald-700 mt-0.5">Quantity: 1x &bull; Status: SERVED</div>
            </div>
            <span class="text-sm font-black text-slate-900">₹45</span>
          </div>
        </div>

        <!-- Action Card -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
          <div class="text-xs font-black text-slate-400 uppercase tracking-wider">Order Actions</div>
          <div class="space-y-2">
            <button class="w-full bg-emerald-600 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-xs">
              ✓ Paid (CASH)
            </button>
            <button class="w-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2 px-3 rounded-xl">
              🖨️ Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page4.screenshot({ path: artDir + '/ss2_order_detail_option_3.png' });
  await page4.close();
  console.log('Generated ss2_order_detail_option_3.png');

  // =========================================================================
  // 5. SS3: KDS & WAITER BOTTOM TAB BAR SAFE AREA FIX
  // =========================================================================
  const page5 = await browser.newPage();
  await page5.setViewport({ width: 860, height: 860, deviceScaleFactor: 2 });
  await page5.setContent(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0f172a; }</style>
  </head>
  <body class="p-0 m-0 flex flex-col items-center justify-center py-6 text-white">
    <div class="mb-4 text-center">
      <h2 class="text-xl font-black text-white">KDS &amp; Waiter Navigation Fix (SS3)</h2>
      <p class="text-xs text-slate-400 mt-1">Lifting tabs above Android 3-button navigation bar (||| O &lt;)</p>
    </div>

    <div class="flex gap-8 justify-center">
      <!-- BEFORE CARD -->
      <div class="w-[360px] bg-slate-900 rounded-3xl border-2 border-rose-500/60 p-4 flex flex-col shadow-2xl relative">
        <div class="bg-rose-500/20 text-rose-300 border border-rose-500/40 px-3 py-1 rounded-full text-xs font-black inline-block self-start mb-3">
          ❌ BEFORE: System Buttons Overlapping
        </div>

        <div class="flex-1 bg-white rounded-2xl flex flex-col justify-end overflow-hidden relative" style="height: 480px;">
          <!-- Empty Screen Body -->
          <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <span class="text-4xl mb-2">👨‍🍳</span>
            <div class="text-sm font-bold text-slate-700">Kitchen Display</div>
            <div class="text-xs text-slate-400">0 active orders</div>
          </div>

          <!-- Tab Bar touching bottom (NO PADDING) -->
          <div class="bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center relative">
            <div class="text-center opacity-60"><div class="text-xs">🍳</div><div class="text-[9px] font-bold text-slate-600">Kitchen</div></div>
            <div class="text-center opacity-40"><div class="text-xs">📖</div><div class="text-[9px] text-slate-400">Menu</div></div>
            <div class="text-center opacity-40"><div class="text-xs">📦</div><div class="text-[9px] text-slate-400">Stock</div></div>
            <div class="text-center opacity-40"><div class="text-xs">📷</div><div class="text-[9px] text-slate-400">Attend</div></div>
            <div class="text-center opacity-40"><div class="text-xs">👤</div><div class="text-[9px] text-slate-400">Account</div></div>

            <!-- ANDROID 3-BUTTON SYSTEM OVERLAY -->
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-around px-8 text-white text-lg font-bold border-t-2 border-rose-500">
              <span>|||</span>
              <span>◯</span>
              <span>&lt;</span>
            </div>
          </div>
        </div>

        <div class="mt-3 text-xs text-rose-300 font-semibold bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50">
          ⚠️ Android system bar covers tab labels. Touch clicks get intercepted by Android OS!
        </div>
      </div>

      <!-- AFTER CARD -->
      <div class="w-[360px] bg-slate-900 rounded-3xl border-2 border-emerald-500/80 p-4 flex flex-col shadow-2xl relative">
        <div class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-black inline-block self-start mb-3">
          ✅ AFTER: Safe Area Inset + Generous Touch
        </div>

        <div class="flex-1 bg-white rounded-2xl flex flex-col justify-end overflow-hidden relative" style="height: 480px;">
          <!-- Empty Screen Body -->
          <div class="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <span class="text-4xl mb-2">👨‍🍳</span>
            <div class="text-sm font-bold text-slate-700">Kitchen Display</div>
            <div class="text-xs text-emerald-600 font-bold">Safe Inset Active</div>
          </div>

          <!-- ELEVATED TAB BAR (Safe area bottom padding) -->
          <div class="bg-white border-t border-slate-200 px-2 pt-2.5 pb-2 flex justify-around items-center">
            <div class="text-center bg-emerald-50 px-2.5 py-1 rounded-xl">
              <div class="text-sm">👨‍🍳</div>
              <div class="text-[10px] font-extrabold text-emerald-700">Kitchen</div>
            </div>
            <div class="text-center">
              <div class="text-sm opacity-60">📖</div>
              <div class="text-[10px] font-bold text-slate-500">Smart Menu</div>
            </div>
            <div class="text-center">
              <div class="text-sm opacity-60">📦</div>
              <div class="text-[10px] font-bold text-slate-500">Stock</div>
            </div>
            <div class="text-center">
              <div class="text-sm opacity-60">📷</div>
              <div class="text-[10px] font-bold text-slate-500">Attendance</div>
            </div>
            <div class="text-center">
              <div class="text-sm opacity-60">👤</div>
              <div class="text-[10px] font-bold text-slate-500">Account</div>
            </div>
          </div>

          <!-- ANDROID 3-BUTTON NAVIGATION BAR (Cleanly separated beneath!) -->
          <div class="bg-slate-100 h-9 flex items-center justify-around px-8 text-slate-400 text-sm font-bold border-t border-slate-200 shrink-0">
            <span>|||</span>
            <span>◯</span>
            <span>&lt;</span>
          </div>
        </div>

        <div class="mt-3 text-xs text-emerald-300 font-semibold bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-900/50">
          ✨ Safe bottom height + insets! Tabs are completely above Android navigation bar and 100% clickable!
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page5.screenshot({ path: artDir + '/ss3_kds_waiter_tab_fix.png' });
  await page5.close();
  console.log('Generated ss3_kds_waiter_tab_fix.png');

  await browser.close();
}

renderMockups().catch(err => {
  console.error(err);
  process.exit(1);
});
