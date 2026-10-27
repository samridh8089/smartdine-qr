const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/app/(dashboard)/dashboard/orders/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Original content length:', content.length);

// 1. In loadInitialData: don't auto-select on mobile (<768px)
const target1 = `} else if (filteredForRole.length > 0 && !selectedOrderIdRef.current) {\r\n      setSelectedOrderId(filteredForRole[0].id);`;
const replacement1 = `} else if (filteredForRole.length > 0 && !selectedOrderIdRef.current) {\r\n      // Only auto-select on desktop (>= 768px). On mobile, always open Orders List (SS1) first!\r\n      if (typeof window !== 'undefined' && window.innerWidth >= 768) {\r\n        setSelectedOrderId(filteredForRole[0].id);\r\n      }`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log('Applied Patch 1: Auto-select on desktop only');
} else {
  // Try LF variant
  const target1LF = `} else if (filteredForRole.length > 0 && !selectedOrderIdRef.current) {\n      setSelectedOrderId(filteredForRole[0].id);`;
  const replacement1LF = `} else if (filteredForRole.length > 0 && !selectedOrderIdRef.current) {\n      // Only auto-select on desktop (>= 768px). On mobile, always open Orders List (SS1) first!\n      if (typeof window !== 'undefined' && window.innerWidth >= 768) {\n        setSelectedOrderId(filteredForRole[0].id);\n      }`;
  if (content.includes(target1LF)) {
    content = content.replace(target1LF, replacement1LF);
    console.log('Applied Patch 1 (LF): Auto-select on desktop only');
  } else {
    console.error('Target 1 NOT found!');
  }
}

// 2. Queue tabs click: don't auto-select on mobile
const queueTarget = `if (nextOrders.length > 0 && (!selectedOrderId || !nextOrders.some(o => o.id === selectedOrderId))) {\r\n                    setSelectedOrderId(nextOrders[0].id);\r\n                  }`;
const queueReplacement = `if (typeof window !== 'undefined' && window.innerWidth >= 768) {\r\n                    if (nextOrders.length > 0 && (!selectedOrderId || !nextOrders.some(o => o.id === selectedOrderId))) {\r\n                      setSelectedOrderId(nextOrders[0].id);\r\n                    }\r\n                  }`;

const queueTargetLF = `if (nextOrders.length > 0 && (!selectedOrderId || !nextOrders.some(o => o.id === selectedOrderId))) {\n                    setSelectedOrderId(nextOrders[0].id);\n                  }`;
const queueReplacementLF = `if (typeof window !== 'undefined' && window.innerWidth >= 768) {\n                    if (nextOrders.length > 0 && (!selectedOrderId || !nextOrders.some(o => o.id === selectedOrderId))) {\n                      setSelectedOrderId(nextOrders[0].id);\n                    }\n                  }`;

let queueMatches = 0;
while (content.includes(queueTarget)) {
  content = content.replace(queueTarget, queueReplacement);
  queueMatches++;
}
while (content.includes(queueTargetLF)) {
  content = content.replace(queueTargetLF, queueReplacementLF);
  queueMatches++;
}
console.log('Applied Patch 2: Queue tabs desktop check applied to', queueMatches, 'tabs');

// 3. SS2: Isolate horizontal scroll on filter toolbar
const filterRowTarget = `<div className="flex items-center gap-1.5">`;
const filterRowReplacement = `<div className="flex items-center gap-1.5 w-full max-w-full overflow-x-auto no-scrollbar py-0.5 shrink-0" style={{ WebkitOverflowScrolling: 'touch' }}>`;
if (content.includes(filterRowTarget)) {
  content = content.replace(filterRowTarget, filterRowReplacement);
  console.log('Applied Patch 3: Isolated horizontal scroll on date filter toolbar');
} else {
  console.error('Filter row target NOT found!');
}

// Ensure order list container has overflow-x-hidden max-w-full
const orderListContTarget = `className={\`\${selectedOrderId ? 'hidden md:flex' : 'flex'} w-full md:w-5/12 lg:w-4/12 flex-col space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs md:sticky md:top-6 md:max-h-[calc(100vh-140px)] md:overflow-y-auto\``;
const orderListContReplacement = `className={\`\${selectedOrderId ? 'hidden md:flex' : 'flex'} w-full md:w-5/12 lg:w-4/12 flex-col space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs md:sticky md:top-6 md:max-h-[calc(100vh-140px)] md:overflow-y-auto overflow-x-hidden max-w-full\``;
if (content.includes(orderListContTarget)) {
  content = content.replace(orderListContTarget, orderListContReplacement);
  console.log('Applied Patch 3b: Locked order list container overflow-x');
}

// 4. SS3: Prominent Back Button
const oldBackButtonPattern = /<div className="md:hidden pb-1">\s*<Button[\s\S]*?Back to Orders List[\s\S]*?<\/Button>\s*<\/div>/;
const newBackButton = `<div className="md:hidden w-full pb-2">
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
                    </div>`;

if (oldBackButtonPattern.test(content)) {
  content = content.replace(oldBackButtonPattern, newBackButton);
  console.log('Applied Patch 4: Prominent Back Button');
} else {
  console.error('Old back button NOT found!');
}

// 5. SS3: Detail container flex flex-col and remove disruptive sticky floating box
const detailContainerTarget = `<div className="p-4 sm:p-5 space-y-4">`;
const detailContainerReplacement = `<div className="p-4 sm:p-5 flex flex-col space-y-4">`;
if (content.includes(detailContainerTarget)) {
  content = content.replace(detailContainerTarget, detailContainerReplacement);
  console.log('Applied Patch 5a: Detail container flex flex-col');
}

// Remove disruptive sticky bottom floating styles from Quick Action box
const quickActionOld = `className="sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 p-4 -mx-6 -mb-6 mt-4 shadow-lg md:static md:bg-slate-50 md:dark:bg-slate-950/20 md:border md:border-slate-100 md:dark:border-slate-800 md:rounded-xl md:p-4 md:m-0 md:shadow-none flex flex-col gap-3"`;
const quickActionNew = `className="order-3 md:order-none static bg-slate-50/90 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl p-4 m-0 shadow-none flex flex-col gap-3"`;
if (content.includes(quickActionOld)) {
  content = content.replace(quickActionOld, quickActionNew);
  console.log('Applied Patch 5b: Quick Action box non-sticky and order-3');
} else {
  console.error('Quick action target NOT found!');
}

// Make Ordered Items section order-2 (Top on mobile!)
const orderedItemsTarget = `<div className="space-y-4">\r\n                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>`;
const orderedItemsReplacement = `<div className="space-y-4 order-2 md:order-none">\r\n                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>`;
const orderedItemsTargetLF = `<div className="space-y-4">\n                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>`;
const orderedItemsReplacementLF = `<div className="space-y-4 order-2 md:order-none">\n                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>`;

if (content.includes(orderedItemsTarget)) {
  content = content.replace(orderedItemsTarget, orderedItemsReplacement);
  console.log('Applied Patch 5c: Ordered Items set to order-2 (top on mobile)');
} else if (content.includes(orderedItemsTargetLF)) {
  content = content.replace(orderedItemsTargetLF, orderedItemsReplacementLF);
  console.log('Applied Patch 5c (LF): Ordered Items set to order-2 (top on mobile)');
} else {
  console.error('Ordered Items target NOT found!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('File successfully updated! New length:', content.length);
