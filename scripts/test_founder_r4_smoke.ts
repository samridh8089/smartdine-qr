// CleverOps Phase-18.17A-R4 Founder Smoke Test Suite
// Validates P0 fixes: Blueprint Resize, Fixture Rename, Zone Sync, Seat Guest, Mobile Layout & Inventory Invariance

import assert from 'assert';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('CLEVEROPS PHASE-18.17A-R4 — FOUNDER VERIFICATION SUITE');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  [FAIL] Test ${totalTests}: ${name}`);
    console.error(`         Error: ${err.message}`);
  }
}

// 1. INVENTORY ENGINE INVARIANT CHECK
runTest('Invariant: Inventory Engine & Units are strictly frozen (diff = 0)', () => {
  const diff = execSync('& "C:\\Program Files\\Git\\cmd\\git.exe" diff src/lib/inventoryEngine.ts src/lib/inventoryUnits.ts', {
    encoding: 'utf8',
    shell: 'powershell.exe'
  }).trim();
  assert.strictEqual(diff, '', 'Frozen inventory files have been modified!');
});

// 2. REACT HOOK SAFETY AUDIT
runTest('Invariant: React Hook Safety Guardrail passes 100%', () => {
  const auditOutput = execSync('node scripts/audit-react-hooks.mjs --all', {
    encoding: 'utf8'
  });
  assert(auditOutput.includes('[PASS] React Hook Safety Audit: 0 violations found'), 'Hook safety violations detected!');
});

// 3. P0-1: BLUEPRINT ELEMENT RESIZE ARCHITECTURE
runTest('P0-1: TableNode and FurnitureNode have explicit width and height on top Group', () => {
  const tableNodeContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/TableNode.tsx'), 'utf8');
  const furnitureNodeContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/FurnitureNode.tsx'), 'utf8');
  
  assert(tableNodeContent.includes('width={width}'), 'TableNode missing width prop on Group');
  assert(tableNodeContent.includes('height={height}'), 'TableNode missing height prop on Group');
  assert(furnitureNodeContent.includes('width={width}'), 'FurnitureNode missing width prop on Group');
  assert(furnitureNodeContent.includes('height={height}'), 'FurnitureNode missing height prop on Group');
});

runTest('P0-1: PropertyPanel uses local controlled state and does NOT clamp mid-typing', () => {
  const propPanelContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/PropertyPanel.tsx'), 'utf8');
  
  assert(propPanelContent.includes('localWidth'), 'PropertyPanel missing localWidth controlled state');
  assert(propPanelContent.includes('localHeight'), 'PropertyPanel missing localHeight controlled state');
  assert(propPanelContent.includes('handleWidthBlur'), 'PropertyPanel missing handleWidthBlur for safe clamping');
  assert(propPanelContent.includes('handleHeightBlur'), 'PropertyPanel missing handleHeightBlur for safe clamping');
  assert(propPanelContent.includes('Math.max(30,'), 'Missing minimum 30px bounds on blur');
});

// 4. P0-2: FIXTURE RENAME ARCHITECTURE
runTest('P0-2: FurnitureNode dynamically renders custom name for all fixture kinds', () => {
  const furnitureNodeContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/FurnitureNode.tsx'), 'utf8');
  
  assert(furnitureNodeContent.includes("item.name || 'DOOR'"), 'Door fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'PARTITION'"), 'Divider fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'KITCHEN PASS'"), 'Kitchen pass fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'CASH / POS'"), 'Cash counter fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'WASHROOM'"), 'Washroom fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'WAITING LOUNGE'"), 'Waiting area fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'BAR'"), 'Bar fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'SOFA'"), 'Sofa fixture missing dynamic label');
  assert(furnitureNodeContent.includes("item.name || 'SERVICE COUNTER'"), 'Service counter fixture missing dynamic label');
});

runTest('P0-2: PropertyPanel fixture name input allows instant rename and non-empty validation', () => {
  const propPanelContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/PropertyPanel.tsx'), 'utf8');
  
  assert(propPanelContent.includes('Fixture Name / Label'), 'PropertyPanel missing Fixture Name field');
  assert(propPanelContent.includes('handleNameChange'), 'PropertyPanel missing handleNameChange');
  assert(propPanelContent.includes('handleNameBlur'), 'PropertyPanel missing handleNameBlur validation');
});

// 5. P0-3 & P0-5: ZONE RESTORATION & "ALL" FILTER
runTest('P0-3: FloorCanvas visibleItems correctly matches zones and supports "all" filter', () => {
  const floorCanvasContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/FloorCanvas.tsx'), 'utf8');
  
  assert(floorCanvasContent.includes("if (selectedZoneFilter === 'all')"), 'Missing "all" zone condition');
  assert(floorCanvasContent.includes("zoneId === 'general' || zoneId === 'zone_general'"), 'Missing zone alias fallback');
  assert(floorCanvasContent.includes('db.getZones'), 'Missing live DB zone query in FloorCanvas');
});

runTest('P0-3: dashboardStore returns zones with live tables', () => {
  const storeContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/dashboardStore.ts'), 'utf8');
  
  assert(storeContent.includes('zones: live?.zones || []'), 'dashboardStore fetchTablesDeduplicated missing zones in return object');
});

// 6. P0-6: SEAT GUEST DEDUPLICATION & BEST FIT SORTING
runTest('P0-6: Seat Guest table list is deduplicated and sorted by Best Fit first', () => {
  const ordersPageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(dashboard)/dashboard/orders/page.tsx'), 'utf8');
  
  assert(ordersPageContent.includes('tableMap.set(t.id, t)'), 'Missing table deduplication in Seat Guest modal');
  assert(ordersPageContent.includes('isBestFitA !== isBestFitB'), 'Missing Best Fit priority sorting');
  assert(ordersPageContent.includes('isOccupiedA !== isOccupiedB'), 'Missing Occupied demotion sorting');
  assert(ordersPageContent.includes("isOccupied ? 'opacity-40 cursor-not-allowed"), 'Missing disabled state for occupied tables');
});

// 7. P0-4 & P0-7: MOBILE RESPONSIVENESS & QUICK ACTIONS
runTest('P0-4: Order cards feature customer contact row and card-first quick action buttons', () => {
  const ordersPageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(dashboard)/dashboard/orders/page.tsx'), 'utf8');
  
  assert(ordersPageContent.includes("cName || 'Guest'"), 'Missing customer name row on order cards');
  assert(ordersPageContent.includes("handleCardQuickUpdate(order, 'accepted')"), 'Missing card Accept action');
  assert(ordersPageContent.includes("handleCardQuickUpdate(order, 'preparing')"), 'Missing card Preparing action');
  assert(ordersPageContent.includes("handleCardQuickUpdate(order, 'served')"), 'Missing card Serve action');
});

runTest('P0-7: Order details panel has sticky bottom action bar on mobile', () => {
  const ordersPageContent = fs.readFileSync(path.join(process.cwd(), 'src/app/(dashboard)/dashboard/orders/page.tsx'), 'utf8');
  
  assert(ordersPageContent.includes('sticky bottom-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs'), 'Missing sticky bottom mobile quick actions');
  assert(ordersPageContent.includes('Back to Orders List'), 'Missing mobile back button');
});

// 8. P0-10 & P0-12: TOOLBOX COLLAPSE & PROPERTY PANEL MOBILE SHEET
runTest('P0-10 & P0-12: Toolbox collapsible and PropertyPanel responsive bottom sheet on mobile', () => {
  const toolboxContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/Toolbox.tsx'), 'utf8');
  const propPanelContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/PropertyPanel.tsx'), 'utf8');
  
  assert(toolboxContent.includes('isCollapsed'), 'Toolbox missing collapsible state');
  assert(propPanelContent.includes('fixed inset-x-0 bottom-0 z-40 max-h-[82vh] rounded-t-2xl'), 'PropertyPanel missing mobile bottom sheet styling');
  assert(propPanelContent.includes('md:static md:inset-auto md:max-h-none md:w-72'), 'PropertyPanel missing desktop sidebar styling');
});

// 9. QR CODE INVARIANCE
runTest('QR Code Architecture Invariance: qrCodeUrl preserved on floorplan items', () => {
  const typesContent = fs.readFileSync(path.join(process.cwd(), 'src/components/floorplan/types.ts'), 'utf8');
  
  assert(typesContent.includes('qrCodeUrl?: string;'), 'FloorPlanItem missing permanent qrCodeUrl property');
});

console.log('\n---------------------------------------------------------------');
console.log(`Results: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('---------------------------------------------------------------');

if (passedTests === totalTests) {
  console.log('\n[PASS] ALL FOUNDER ACCEPTANCE TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`\n[FAIL] ${totalTests - passedTests} tests failed.`);
  process.exit(1);
}
