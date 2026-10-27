const fs = require('fs');
const puppeteer = require('puppeteer');

async function renderMockups() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const artDir = 'C:/Users/dsoni/.gemini/antigravity/brain/5af12929-c8fe-4e93-97e3-95af2fb0b7c3';

  // =========================================================================
  // OPTION 1: "HERO TOTAL BANNER & DISHES FIRST" (Executive Summary)
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
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; background: #e2e8f0; }</style>
  </head>
  <body class="p-0 m-0 flex justify-center py-6">
    <div class="w-[390px] h-[830px] bg-slate-50 rounded-[44px] shadow-2xl border-4 border-slate-900 overflow-hidden relative flex flex-col">
      <!-- Status Bar -->
      <div class="h-10 px-6 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span>11:28</span>
        <div class="w-24 h-4 bg-slate-900 rounded-full mx-auto"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold text-slate-500">5G</span>
          <span class="text-[11px] font-bold text-slate-700">30%</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-2 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- Feature Pill Banner -->
      <div class="bg-indigo-600 text-white text-[11px] font-extrabold px-4 py-1.5 flex justify-between items-center shrink-0">
        <span>OPTION 1: Hero Banner with Grand Total at TOP</span>
        <span class="bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded text-[10px]">Executive Flow</span>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <!-- 1. BACK BUTTON -->
        <button class="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 rounded-2xl py-2.5 px-4 flex items-center justify-center gap-2 text-slate-800 font-extrabold text-xs shadow-xs active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Orders List
        </button>

        <!-- 2. HERO TOTAL BANNER CARD (All key info right at the top!) -->
        <div class="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-4 shadow-lg relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <!-- Top Row -->
          <div class="flex justify-between items-start">
            <div>
              <span class="inline-block bg-white/10 text-slate-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-white/10 uppercase tracking-wide">
                Table 4 &bull; Dine-In
              </span>
              <h2 class="text-base font-black text-white mt-1 flex items-center gap-2">
                Order #26D4687
                <span class="text-slate-400 text-xs cursor-pointer">📋</span>
              </h2>
              <div class="text-[11px] font-medium text-slate-400 mt-0.5">27 Oct, 04:57 PM</div>
            </div>

            <!-- ★ BIG PROMINENT GRAND TOTAL AT TOP ★ -->
            <div class="text-right bg-emerald-500/20 border border-emerald-400/40 rounded-2xl px-3.5 py-2 shrink-0">
              <span class="text-[9px] font-black uppercase tracking-wider text-emerald-300 block">Grand Total</span>
              <span class="text-2xl font-black text-emerald-400 leading-tight">₹45.00</span>
            </div>
          </div>

          <!-- Status & Print Row -->
          <div class="flex justify-between items-center mt-3 pt-3 border-t border-white/10">
            <div class="flex items-center gap-1.5">
              <span class="bg-emerald-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-xs">Completed</span>
              <span class="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold text-[10px] px-2 py-0.5 rounded-md">Paid Verified</span>
            </div>
            <button class="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5 shadow-2xs">
              <span>🖨️</span> Print Bill
            </button>
          </div>
        </div>

        <!-- 3. PRIMARY CONTENT: ORDERED DISHES (FIRST!) -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <div class="flex justify-between items-center">
            <span class="text-xs font-black tracking-wider text-slate-400 uppercase">Ordered Dishes (1)</span>
            <span class="text-xs font-bold text-slate-700">Subtotal: ₹45.00</span>
          </div>
          
          <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
            <div class="space-y-0.5">
              <div class="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <span class="text-emerald-600 font-black">✓</span> Kozhi Nirachathu (Full Chicken)
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5 rounded">SERVED</span>
                <span class="text-slate-500 font-bold">1x @ ₹45.00</span>
              </div>
            </div>
            <span class="text-sm font-black text-slate-900">₹45.00</span>
          </div>
        </div>

        <!-- 4. QUICK ACTIONS -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <span class="text-xs font-black tracking-wider text-slate-400 uppercase">Order Actions</span>
          <div class="grid grid-cols-2 gap-2">
            <button class="bg-emerald-600 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1">
              ✓ Paid (CASH)
            </button>
            <button class="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1">
              🔄 Issue Refund
            </button>
          </div>
        </div>

        <!-- 5. COLLAPSIBLE ACCORDION -->
        <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex justify-between items-center cursor-pointer">
          <div class="flex items-center gap-2">
            <span class="text-sm">🕒</span>
            <span class="text-xs font-extrabold text-slate-700">Timeline &amp; Staff Activity</span>
            <span class="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">5 steps</span>
          </div>
          <span class="text-xs text-slate-400 font-bold">&darr;</span>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page1.screenshot({ path: artDir + '/ss2_option_hero_banner.png' });
  await page1.close();
  console.log('Generated ss2_option_hero_banner.png');

  // =========================================================================
  // OPTION 2: "MODERN POS KOT RECEIPT STYLE" (Classic Restaurant Ticket)
  // =========================================================================
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 440, height: 920, deviceScaleFactor: 2 });
  await page2.setContent(`
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
      body { font-family: 'Plus Jakarta Sans', sans-serif; background: #e2e8f0; }
      .mono-price { font-family: 'Space Mono', monospace; }
      .receipt-card {
        background: #ffffff;
        border: 2px dashed #cbd5e1;
        position: relative;
      }
    </style>
  </head>
  <body class="p-0 m-0 flex justify-center py-6">
    <div class="w-[390px] h-[830px] bg-slate-50 rounded-[44px] shadow-2xl border-4 border-slate-900 overflow-hidden relative flex flex-col">
      <!-- Status Bar -->
      <div class="h-10 px-6 flex items-center justify-between text-xs font-bold text-slate-800 bg-white shrink-0 z-30">
        <span>11:28</span>
        <div class="w-24 h-4 bg-slate-900 rounded-full mx-auto"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold text-slate-500">5G</span>
          <span class="text-[11px] font-bold text-slate-700">30%</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-2 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- Feature Pill Banner -->
      <div class="bg-amber-600 text-white text-[11px] font-extrabold px-4 py-1.5 flex justify-between items-center shrink-0">
        <span>OPTION 2: Digital POS Ticket / Thermal KOT Style</span>
        <span class="bg-amber-800 text-amber-200 px-2 py-0.5 rounded text-[10px]">Restaurant Classic</span>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <!-- 1. BACK BUTTON -->
        <button class="w-full bg-white hover:bg-slate-50 border-2 border-slate-300 rounded-2xl py-2.5 px-4 flex items-center justify-center gap-2 text-slate-800 font-extrabold text-xs shadow-xs active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Orders List
        </button>

        <!-- 2. DIGITAL RECEIPT / KOT TICKET -->
        <div class="receipt-card rounded-3xl p-5 shadow-sm space-y-4">
          <!-- Ticket Top: Table & Grand Total Header -->
          <div class="flex justify-between items-center pb-3 border-b-2 border-dashed border-slate-200">
            <div class="flex items-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center font-black">
                <span class="text-[9px] uppercase tracking-wider text-slate-400">TBL</span>
                <span class="text-base leading-none">4</span>
              </div>
              <div>
                <div class="text-sm font-black text-slate-900">#26D4687</div>
                <div class="text-[11px] font-bold text-slate-400">27 Oct, 04:57 PM</div>
              </div>
            </div>

            <!-- ★ GRAND TOTAL AT THE TOP (RECEIPT STYLE) ★ -->
            <div class="text-right">
              <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grand Total</div>
              <div class="text-2xl font-black text-slate-900 mono-price">₹45.00</div>
              <span class="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full mt-0.5">PAID</span>
            </div>
          </div>

          <!-- Ticket Dishes Itemized List -->
          <div class="space-y-2.5 pb-3 border-b-2 border-dashed border-slate-200">
            <div class="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Item &amp; Qty</span>
              <span>Price</span>
            </div>
            
            <div class="flex justify-between items-start">
              <div>
                <div class="text-sm font-extrabold text-slate-900">1x Kozhi Nirachathu (Full)</div>
                <div class="text-[11px] font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                  <span>✔</span> Status: SERVED
                </div>
              </div>
              <span class="text-sm font-bold text-slate-900 mono-price">₹45.00</span>
            </div>
          </div>

          <!-- Total Calculation Breakdown -->
          <div class="space-y-1 text-xs pt-1">
            <div class="flex justify-between text-slate-500 font-semibold">
              <span>Items Total (1 item)</span>
              <span class="mono-price">₹45.00</span>
            </div>
            <div class="flex justify-between text-slate-500 font-semibold">
              <span>GST &amp; Taxes</span>
              <span class="mono-price">₹0.00</span>
            </div>
            <div class="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>NET PAYABLE</span>
              <span class="text-emerald-700 mono-price">₹45.00</span>
            </div>
          </div>
        </div>

        <!-- 3. ACTIONS -->
        <div class="grid grid-cols-2 gap-2">
          <button class="bg-slate-900 text-white font-extrabold text-xs py-3 px-3 rounded-2xl shadow-xs flex items-center justify-center gap-1.5">
            <span>🖨️</span> Print KOT / Bill
          </button>
          <button class="bg-emerald-600 text-white font-extrabold text-xs py-3 px-3 rounded-2xl shadow-xs flex items-center justify-center gap-1.5">
            <span>✓</span> Paid (CASH)
          </button>
        </div>

        <!-- 4. FOOTER AUDIT LINK -->
        <div class="text-center pt-1">
          <button class="text-xs font-bold text-slate-400 hover:text-slate-600 underline">
            Staff Log: Deepak Ji, Samridh Tomar &darr;
          </button>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page2.screenshot({ path: artDir + '/ss2_option_pos_receipt.png' });
  await page2.close();
  console.log('Generated ss2_option_pos_receipt.png');

  // =========================================================================
  // OPTION 3: "MODERN CARD FLOW WITH TOP SUMMARY CHIPS & BOTTOM ACTION STRIP"
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
        <span>11:28</span>
        <div class="w-24 h-4 bg-slate-900 rounded-full mx-auto"></div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-extrabold text-slate-500">5G</span>
          <span class="text-[11px] font-bold text-slate-700">30%</span>
          <div class="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5"><div class="w-2 h-full bg-slate-800"></div></div>
        </div>
      </div>

      <!-- Feature Pill Banner -->
      <div class="bg-teal-600 text-white text-[11px] font-extrabold px-4 py-1.5 flex justify-between items-center shrink-0">
        <span>OPTION 3: App-First Cards + Direct Total Chip</span>
        <span class="bg-teal-800 text-teal-200 px-2 py-0.5 rounded text-[10px]">App Native</span>
      </div>

      <!-- Header Navigation Strip (Compact & Clean) -->
      <div class="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs">
        <button class="flex items-center gap-1.5 text-xs font-extrabold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-200">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back
        </button>

        <!-- ★ INTEGRATED TOP CHIPS WITH GRAND TOTAL ★ -->
        <div class="flex items-center gap-2">
          <span class="bg-slate-900 text-white text-xs font-black px-2.5 py-1 rounded-xl">
            Table 4
          </span>
          <span class="bg-emerald-50 text-emerald-800 border-2 border-emerald-500/40 text-sm font-black px-3 py-1 rounded-xl shadow-2xs">
            ₹45.00
          </span>
        </div>
      </div>

      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
        <!-- Order Meta Summary -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex justify-between items-center">
          <div>
            <div class="text-sm font-black text-slate-900">Order #26D4687</div>
            <div class="text-xs font-semibold text-slate-400 mt-0.5">Dine-In &bull; 27 Oct, 04:57 PM</div>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-2.5 py-0.5 rounded-lg">
              Completed
            </span>
          </div>
        </div>

        <!-- Food Item Rich Cards -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-xs font-black text-slate-400 uppercase tracking-wider">Ordered Food Items (1)</span>
            <span class="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Total: ₹45.00</span>
          </div>

          <!-- Dish Card -->
          <div class="border border-slate-200 rounded-xl p-3.5 bg-gradient-to-r from-emerald-50/50 to-white flex justify-between items-center">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-xs border-2 border-rose-600 p-0.5 flex items-center justify-center"><span class="w-1.5 h-1.5 rounded-full bg-rose-600"></span></span>
                <span class="text-sm font-black text-slate-900">Kozhi Nirachathu</span>
              </div>
              <div class="text-xs text-slate-500 font-bold">
                Portion: <span class="text-slate-800">Full Chicken</span> &bull; 1x @ ₹45
              </div>
              <span class="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">SERVED</span>
            </div>
            <div class="text-base font-black text-slate-900">₹45.00</div>
          </div>
        </div>

        <!-- Quick Status Actions -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
          <span class="text-xs font-black text-slate-400 uppercase tracking-wider">Order Actions</span>
          <div class="grid grid-cols-2 gap-2">
            <button class="bg-emerald-600 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl shadow-xs">
              ✓ Paid (CASH)
            </button>
            <button class="bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs py-2.5 px-3 rounded-xl">
              🖨️ Print Receipt
            </button>
          </div>
        </div>

        <!-- Collapsible Timeline -->
        <div class="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex justify-between items-center cursor-pointer">
          <div class="flex items-center gap-2 text-xs font-bold text-slate-700">
            <span>🕒 Timeline &amp; Staff Logs (5)</span>
          </div>
          <span class="text-xs text-slate-400 font-bold">&darr;</span>
        </div>
      </div>
    </div>
  </body>
  </html>
  `);
  await page3.screenshot({ path: artDir + '/ss2_option_app_cards.png' });
  await page3.close();
  console.log('Generated ss2_option_app_cards.png');

  await browser.close();
}

renderMockups().catch(err => {
  console.error(err);
  process.exit(1);
});
