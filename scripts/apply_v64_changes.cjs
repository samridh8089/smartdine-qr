const fs = require('fs');

// =========================================================================
// 1. PATCH smartdine-mobile/src/screens/OwnerWebScreen.js (SS1 Header safe spacing)
// =========================================================================
const ownerWebPath = 'smartdine-mobile/src/screens/OwnerWebScreen.js';
let ownerWebContent = fs.readFileSync(ownerWebPath, 'utf8').replace(/\r\n/g, '\n');

const ownerOldPadding = `container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },`;

const ownerNewPadding = `container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? Math.max(StatusBar.currentHeight || 0, 38) + 6 : 0,
  },`;

if (ownerWebContent.includes(ownerOldPadding)) {
  ownerWebContent = ownerWebContent.replace(ownerOldPadding, ownerNewPadding);
  console.log('[OwnerWebScreen.js] Successfully increased Android top safe padding.');
} else {
  console.log('[OwnerWebScreen.js] ownerOldPadding not found or already updated.');
}

fs.writeFileSync(ownerWebPath, ownerWebContent.replace(/\n/g, '\r\n'), 'utf8');

// =========================================================================
// 2. PATCH src/app/(dashboard)/layout.tsx (SS1 Header & Pure Manage Pill)
// =========================================================================
const layoutPath = 'src/app/(dashboard)/layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n');

// A. Header padding & breathing room
const layoutHeaderOld = `<header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 pt-1 sm:pt-0 flex items-center justify-between px-3.5 sm:px-6 shrink-0 sticky top-0 z-30 transition-colors">`;
const layoutHeaderNew = `<header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 pt-2 pb-2 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 transition-colors">`;

if (layoutContent.includes(layoutHeaderOld)) {
  layoutContent = layoutContent.replace(layoutHeaderOld, layoutHeaderNew);
  console.log('[layout.tsx] Successfully adjusted header padding.');
}

// B. Pure Manage Crystal Pill (Remove 'M' box, 3-lines, and subtitle)
const manageFabRegex = /{\/\* Sticky Frosted Crystal Floating Manage Button \(M\) for Mobile \*\/}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/PreviewModeProvider>/;

const manageFabNew = `{/* Pure Frosted Crystal Floating Manage Button for Mobile (Only 'Manage' Text) */}
            <div className="fixed bottom-6 right-5 z-40 lg:hidden pointer-events-auto">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="px-5 py-2.5 rounded-full cursor-pointer active:scale-95 transition-all backdrop-blur-md bg-white/80 dark:bg-slate-900/85 border border-white/70 dark:border-slate-700/70 shadow-xl flex items-center justify-center"
                aria-label="Open navigation menu"
              >
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
                  Manage
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </PreviewModeProvider>`;

if (manageFabRegex.test(layoutContent)) {
  layoutContent = layoutContent.replace(manageFabRegex, manageFabNew);
  console.log('[layout.tsx] Successfully converted floating button to pure Manage crystal pill.');
} else {
  console.error('[layout.tsx] manageFabRegex did not match!');
}

fs.writeFileSync(layoutPath, layoutContent.replace(/\n/g, '\r\n'), 'utf8');

// =========================================================================
// 3. PATCH src/app/(dashboard)/dashboard/orders/page.tsx (SS2 Option 4: Grand Total at TOP)
// =========================================================================
const ordersPath = 'src/app/(dashboard)/dashboard/orders/page.tsx';
let ordersContent = fs.readFileSync(ordersPath, 'utf8').replace(/\r\n/g, '\n');

// Top Order Header Bar with prominent Grand Total Badge
const orderHeaderOld = `<div className="space-y-1">
                    {/* Mobile Back Button */}
                    <div className="md:hidden w-full pb-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(null)}
                        className="flex items-center gap-2.5 w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 dark:text-white shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 shrink-0">
                          <ArrowLeft className="h-4 w-4" />
                        </div>
                        <span>Back to Orders List</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-950 dark:text-white text-lg">
                        Order {getFormattedOrderId(selectedOrder, restaurant?.name || '', orders)}
                      </h3>`;

const orderHeaderNew = `<div className="space-y-2 w-full">
                    {/* Mobile Back Button */}
                    <div className="md:hidden w-full pb-1">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(null)}
                        className="flex items-center gap-2.5 w-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 dark:text-white shadow-xs hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.99] transition-all cursor-pointer"
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 shrink-0">
                          <ArrowLeft className="h-4 w-4" />
                        </div>
                        <span>Back to Orders List</span>
                      </button>
                    </div>

                    {/* Top Row: Order ID, Table & PROMINENT GRAND TOTAL AT TOP */}
                    <div className="flex justify-between items-start gap-2 w-full">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-950 dark:text-white text-lg">
                            Order {getFormattedOrderId(selectedOrder, restaurant?.name || '', orders)}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                          {selectedOrder.table_name ? (selectedOrder.table_name.startsWith('Table') ? selectedOrder.table_name : \`Table \${selectedOrder.table_name}\`) : 'Dine-In Table'} &bull; {selectedOrder.created_at ? formatDate(selectedOrder.created_at) : 'Live'}
                        </p>
                      </div>

                      {/* ★ GRAND TOTAL AT THE VERY TOP (Option 4 Emerald Badge) ★ */}
                      <div className="text-right bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 dark:border-emerald-700/60 px-3.5 py-1.5 rounded-xl shrink-0 shadow-2xs">
                        <span className="block text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          Grand Total
                        </span>
                        <span className="text-xl font-black text-emerald-700 dark:text-emerald-200 leading-tight">
                          {formatPrice(selectedOrder.total, restaurant?.settings?.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">`;

if (ordersContent.includes(orderHeaderOld)) {
  ordersContent = ordersContent.replace(orderHeaderOld, orderHeaderNew);
  console.log('[orders/page.tsx] Successfully integrated Grand Total prominently at the top of Order Detail.');
} else {
  console.error('[orders/page.tsx] orderHeaderOld not found!');
}

fs.writeFileSync(ordersPath, ordersContent.replace(/\n/g, '\r\n'), 'utf8');

// =========================================================================
// 4. BUMP VERSION TO 64 IN smartdine-mobile (app.json & package.json)
// =========================================================================
const appJsonPath = 'smartdine-mobile/app.json';
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = '2.1.7';
appJson.expo.android.versionCode = 64;
if (appJson.expo.runtimeVersion) {
  appJson.expo.runtimeVersion = '2.1.7';
}
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log('[app.json] Bumped to version 2.1.7 (versionCode: 64)');

const pkgPath = 'smartdine-mobile/package.json';
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '2.1.7';
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log('[package.json] Bumped to version 2.1.7');

console.log('All changes successfully applied!');
