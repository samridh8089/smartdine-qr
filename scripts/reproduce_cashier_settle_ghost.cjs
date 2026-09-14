const fs = require('fs');

async function verifyCashierSettleGhost() {
  console.log('=== VERIFYING P0-CASHIER: SETTLE BILL DOES NOT PERSIST TO DB ===\n');

  // 1. Inspect OpenBillsDrawer onSettleBill signature and implementation
  const drawerSource = fs.readFileSync('src/components/floorplan/OpenBillsDrawer.tsx', 'utf8');
  const canvasSource = fs.readFileSync('src/components/floorplan/FloorCanvas.tsx', 'utf8');

  console.log('1. Checking OpenBillsDrawer onSettleBill wiring:');
  const drawerWired = drawerSource.includes('onSettleBill?.(table, method === \'split\' ? \'card\' : method)');
  console.log(`   Drawer calls onSettleBill with method: ${drawerWired}`);

  console.log('\n2. Checking FloorCanvas onSettleBill prop passing:');
  const canvasMatches = canvasSource.match(/onSettleBill=\{([^}]+)\}/);
  console.log(`   FloorCanvas onSettleBill handler: ${canvasMatches ? canvasMatches[0] : 'NOT FOUND'}`);

  console.log('\n3. Inspecting handleClearTable implementation in FloorCanvas:');
  const clearStart = canvasSource.indexOf('const handleClearTable = useCallback');
  const clearEnd = canvasSource.indexOf('}, [items, updateItemsWithHistory]);', clearStart);
  const clearFnBody = canvasSource.substring(clearStart, clearEnd + 37);
  console.log(clearFnBody);

  const hasDbCall = clearFnBody.includes('fetch') || clearFnBody.includes('supabase') || clearFnBody.includes('db.') || clearFnBody.includes('api');
  console.log(`\n   Does handleClearTable call ANY database or API? ${hasDbCall}`);

  if (!hasDbCall && canvasMatches && canvasMatches[0].includes('handleClearTable')) {
    console.log('\n❌ [VERIFIED P0 BUG]: Settle Bill in OpenBillsDrawer ONLY clears in-memory Konva item state. Zero API/DB calls are made! All orders remain unpaid in backend, session remains open, and state reverts upon reload.');
  }
}

verifyCashierSettleGhost().catch(console.error);
