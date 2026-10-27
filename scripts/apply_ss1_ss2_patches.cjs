const fs = require('fs');

// =========================================================================
// 1. PATCH src/app/(dashboard)/layout.tsx (SS1)
// =========================================================================
const layoutPath = 'src/app/(dashboard)/layout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8').replace(/\r\n/g, '\n');

// A. Remove Manage button from header & add safe top padding
const oldHeaderRegex = /<header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 flex items-center justify-between px-3.5 sm:px-6 shrink-0 sticky top-0 z-30 transition-colors">\s*<div className="flex items-center gap-2.5 sm:gap-4 min-w-0">\s*<button\s+onClick=\{\(\) => setSidebarOpen\(true\)\}[\s\S]*?<\/button>/;

const newHeader = `<header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 h-16 pt-1 sm:pt-0 flex items-center justify-between px-3.5 sm:px-6 shrink-0 sticky top-0 z-30 transition-colors">
              <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">`;

if (oldHeaderRegex.test(layoutContent)) {
  layoutContent = layoutContent.replace(oldHeaderRegex, newHeader);
  console.log('[layout.tsx] Successfully removed top Manage button & added safe top padding.');
} else {
  console.error('[layout.tsx] oldHeaderRegex did not match!');
}

// B. Add Sticky Frosted Crystal Manage FAB before closing </main></div>
const endMarker = `</main>
          </div>
        </div>
      </div>
      </PreviewModeProvider>`;

const fabSnippet = `</main>

            {/* Sticky Frosted Crystal Floating Manage Button (M) for Mobile */}
            <div className="fixed bottom-6 right-5 z-40 lg:hidden pointer-events-auto">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl cursor-pointer active:scale-95 transition-all backdrop-blur-md bg-white/75 dark:bg-slate-900/80 border border-white/60 dark:border-slate-700/60 shadow-xl"
                aria-label="Open navigation menu"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-emerald-600 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                  M
                </div>
                <div className="text-left pr-0.5">
                  <div className="text-xs font-black text-slate-900 dark:text-white leading-tight">Manage</div>
                  <div className="text-[9px] font-bold text-slate-500 dark:text-slate-400 leading-tight">Menu • Nav</div>
                </div>
                <MenuIcon className="w-4 h-4 text-slate-700 dark:text-slate-300 ml-0.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>
      </PreviewModeProvider>`;

if (layoutContent.includes(endMarker)) {
  layoutContent = layoutContent.replace(endMarker, fabSnippet);
  console.log('[layout.tsx] Successfully added Sticky Crystal Manage FAB.');
} else {
  console.error('[layout.tsx] endMarker not found!');
}

fs.writeFileSync(layoutPath, layoutContent.replace(/\n/g, '\r\n'), 'utf8');

// =========================================================================
// 2. PATCH src/app/(dashboard)/dashboard/orders/page.tsx (SS2)
// =========================================================================
const ordersPath = 'src/app/(dashboard)/dashboard/orders/page.tsx';
let ordersContent = fs.readFileSync(ordersPath, 'utf8').replace(/\r\n/g, '\n');

// A. In rawSelectedOrder, do not fallback to first order on mobile (< 768px)!
const rawFallbackRegex = /\/\/ 3\. Fallback to the first order of the currently visible queue\s*return filteredOrders\.length > 0 \? filteredOrders\[0\] : \(effectiveOrders\.length > 0 \? effectiveOrders\[0\] : null\);/;

const rawFallbackCode = `// 3. Fallback to the first order of the currently visible queue ONLY on desktop!
    // On mobile (< 768px), fallback must remain null so Orders List (SS1) stays open until user taps an order!
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return null;
    }
    return filteredOrders.length > 0 ? filteredOrders[0] : (effectiveOrders.length > 0 ? effectiveOrders[0] : null);`;

if (rawFallbackRegex.test(ordersContent)) {
  ordersContent = ordersContent.replace(rawFallbackRegex, rawFallbackCode);
  console.log('[orders/page.tsx] Successfully updated rawSelectedOrder to prevent mobile auto-fallback.');
} else {
  console.log('[orders/page.tsx] rawFallbackRegex did not match or already updated.');
}

// B. In useEffect for rawSelectedOrder, only sync on desktop (>= 768px)
const syncRegex = /useEffect\(\(\) => \{\s*if \(rawSelectedOrder && rawSelectedOrder\.id !== selectedOrderId\) \{\s*setSelectedOrderId\(rawSelectedOrder\.id\);\s*\}\s*\}, \[rawSelectedOrder\?\.id\]\);/;

const syncCode = `useEffect(() => {
    if (rawSelectedOrder && rawSelectedOrder.id !== selectedOrderId) {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setSelectedOrderId(rawSelectedOrder.id);
      }
    }
  }, [rawSelectedOrder?.id]);`;

if (syncRegex.test(ordersContent)) {
  ordersContent = ordersContent.replace(syncRegex, syncCode);
  console.log('[orders/page.tsx] Successfully guarded rawSelectedOrder useEffect for desktop only.');
} else {
  console.log('[orders/page.tsx] syncRegex did not match or already updated.');
}

// C. Ordered Items order-1 md:order-none (Dishes appear FIRST at top on mobile)
const orderedItemsRegex = /<div className="space-y-4 order-2 md:order-none">\s*<h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items<\/h4>/;

const orderedItemsCode = `<div className="space-y-4 order-1 md:order-none">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        Food Items First
                      </span>
                    </div>`;

if (orderedItemsRegex.test(ordersContent)) {
  ordersContent = ordersContent.replace(orderedItemsRegex, orderedItemsCode);
  console.log('[orders/page.tsx] Successfully placed Ordered Items at order-1 md:order-none.');
} else {
  console.log('[orders/page.tsx] orderedItemsRegex did not match or already updated.');
}

// D. Quick Action order-3 md:order-none
const quickActionRegex = /className="p-4 sm:p-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm space-y-3 order-3 md:order-none"/;
if (quickActionRegex.test(ordersContent)) {
  console.log('[orders/page.tsx] Quick action is already order-3 md:order-none.');
}

// E. Activity Log order-5 md:order-none
const activityLogRegex = /<div className="space-y-3 order-6 md:order-none">/;
if (activityLogRegex.test(ordersContent)) {
  ordersContent = ordersContent.replace(activityLogRegex, `<div className="space-y-3 order-5 md:order-none">`);
  console.log('[orders/page.tsx] Set Activity Log to order-5 md:order-none.');
}

fs.writeFileSync(ordersPath, ordersContent.replace(/\n/g, '\r\n'), 'utf8');
console.log('Finished updating layout.tsx and orders/page.tsx.');
