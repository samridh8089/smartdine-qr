// Sprint 15 Bug Fixes Verification Script
import { checkBookingOverlap, formatLiveTimer, parseTimeToMinutes } from '../src/lib/utils';
import { execSync } from 'child_process';
import fs from 'fs';

async function main() {
  console.log('===============================================================');
  console.log('CLEVEROPS PRODUCTION BUG FIX SPRINT (15 BUGS VERIFICATION)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function verify(testName: string, ok: boolean, detail?: string) {
    if (ok) {
      console.log(`  [PASS] ${testName}${detail ? ` — ${detail}` : ''}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // 1. Invariant Check: Frozen Inventory
  const invDiff = execSync('git diff src/lib/inventoryEngine.ts src/lib/inventoryUnits.ts', { encoding: 'utf8' }).trim();
  verify('INVARIANT: Inventory Engine is Frozen (git diff = 0)', invDiff === '', 'diff lines: 0');

  // 2. Invariant Check: React Hooks Safety Guardrail
  const hookOutput = execSync('node scripts/audit-react-hooks.mjs --all', { encoding: 'utf8' });
  verify('INVARIANT: React Hook Safety Guardrail (0 violations)', hookOutput.includes('0 violations found') && hookOutput.includes('React Hook Safety Audit: PASS'), 'Audit: PASS');

  // 3. OP-004: Booking Overlap Validation
  verify('OP-004: parseTimeToMinutes("19:30") returns 1170', parseTimeToMinutes('19:30') === 1170);
  verify('OP-004: Overlapping times within 90 min (19:30 vs 19:45) returns true', checkBookingOverlap('19:30', '19:45', 90) === true);
  verify('OP-004: Overlapping times within 90 min (19:30 vs 20:30) returns true', checkBookingOverlap('19:30', '20:30', 90) === true);
  verify('OP-004: Adjacent times 90 min apart (19:30 vs 21:00) returns false', checkBookingOverlap('19:30', '21:00', 90) === false);
  verify('OP-004: Non-overlapping times (13:00 vs 19:30) returns false', checkBookingOverlap('13:00', '19:30', 90) === false);

  // 4. OP-005: Live Timer Persistence
  const baseTimestamp = 1773400000000;
  const fiftyMins = new Date(baseTimestamp - 50 * 60 * 1000).toISOString();
  const ninetyMins = new Date(baseTimestamp - 90 * 60 * 1000).toISOString();
  const twoHours = new Date(baseTimestamp - (2 * 3600 + 15 * 60 + 30) * 1000).toISOString();

  verify('OP-005: Timer under 1 hour outputs MM:SS ("50:00")', formatLiveTimer(fiftyMins, baseTimestamp) === '50:00');
  verify('OP-005: Timer over 1 hour outputs HH:MM:SS ("01:30:00")', formatLiveTimer(ninetyMins, baseTimestamp) === '01:30:00');
  verify('OP-005: Multi-hour timer outputs HH:MM:SS ("02:15:30")', formatLiveTimer(twoHours, baseTimestamp) === '02:15:30');

  // 5. Static & Code Pattern Audits for Sprint Fixes
  const kdsContent = fs.readFileSync('src/app/(dashboard)/dashboard/kds/page.tsx', 'utf8');
  verify('OP-001: KDS batch deduplication implemented (seenBatchIds Set)', kdsContent.includes('const seenBatchIds = new Set<string>()') && kdsContent.includes('seenBatchIds.has(batch.id)'));
  verify('OP-001: KDS hooks declared before loading early return', kdsContent.indexOf('useMemo(') < kdsContent.indexOf('if (loading)'));

  const tableQrContent = fs.readFileSync('src/components/floorplan/TableQRPopover.tsx', 'utf8');
  verify('OP-002: QR canonical URL format enforced (/menu/${restaurantSlug}/table/${tableId})', tableQrContent.includes('/menu/${restaurantSlug}/table/${tableId}'));

  const tablesContent = fs.readFileSync('src/app/(dashboard)/dashboard/tables/page.tsx', 'utf8');
  verify('OP-003: Waiter auto-reconnect listeners (online, focus, visibilitychange)', tablesContent.includes("'online'") && tablesContent.includes("'focus'") && tablesContent.includes("'visibilitychange'"));

  const dashboardLayout = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
  verify('OP-006: Staff strict path matching blocks /dashboard universal bypass', dashboardLayout.includes('pathname === p || pathname.startsWith(p + \'/\')') && !dashboardLayout.includes("p === '/dashboard' ? true"));

  const tableNodeContent = fs.readFileSync('src/components/floorplan/TableNode.tsx', 'utf8');
  verify('UX-001: TableNode ellipsis and responsive font size', tableNodeContent.includes('ellipsis={true}') && tableNodeContent.includes('fontSize={labelFontSize}'));

  const seatDrawerContent = fs.readFileSync('src/components/floorplan/SeatGuestDrawer.tsx', 'utf8');
  verify('UX-002: SeatGuestDrawer mobile responsive classes (flex-col sm:flex-row)', seatDrawerContent.includes('flex-col sm:flex-row') && seatDrawerContent.includes('grid-cols-1 sm:grid-cols-2'));

  const reportsContent = fs.readFileSync('src/app/(dashboard)/dashboard/reports/page.tsx', 'utf8');
  verify('UX-003: Reports filter persistence via sessionStorage', reportsContent.includes("sessionStorage.getItem('reports_time_range')") && reportsContent.includes("sessionStorage.setItem('reports_time_range'"));

  const cardExportContent = fs.readFileSync('src/components/qr-studio/cardCanvasExport.ts', 'utf8');
  verify('UI-001: QR print CSS centering and alignment', cardExportContent.includes('display: flex') && cardExportContent.includes('align-items: center') && cardExportContent.includes('justify-content: center'));

  const floorLayoutContent = fs.readFileSync('src/components/floorplan/FloorLayoutManager.tsx', 'utf8');
  verify('UI-002: Outdoor floor empty state guidance message', floorLayoutContent.includes('No tables placed in Outdoor seating area yet'));

  // 6. Test Live HTTP API Security Endpoints on port 3000
  const origin = 'http://localhost:3000';

  // CB-001: Staff List requires valid auth
  try {
    const res = await fetch(`${origin}/api/staff/list?restaurantId=test-rest`);
    verify('CB-001: Unauthenticated request to /api/staff/list rejected with 401', res.status === 401, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-001: Unauthenticated request to /api/staff/list', false, e.message);
  }

  // CB-001: System Events requires valid auth
  try {
    const res = await fetch(`${origin}/api/system-events?restaurantId=test-rest`);
    verify('CB-001: Unauthenticated request to /api/system-events rejected with 401', res.status === 401, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-001: Unauthenticated request to /api/system-events', false, e.message);
  }

  // CB-001: Push Dispatch requires valid auth
  try {
    const res = await fetch(`${origin}/api/push/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'test-rest', roles: ['waiter'], title: 'Test Alert' })
    });
    verify('CB-001: Unauthenticated push dispatch rejected with 401', res.status === 401, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-001: Unauthenticated push dispatch', false, e.message);
  }

  // CB-001: Live Sync requires valid auth
  try {
    const res = await fetch(`${origin}/api/admin/live-sync?restaurantId=test-rest`);
    verify('CB-001: Unauthenticated live-sync rejected with 401', res.status === 401, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-001: Unauthenticated live-sync', false, e.message);
  }

  // CB-001: Staff Invite privilege escalation blocked
  try {
    const res = await fetch(`${origin}/api/staff/create-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'test-rest', role: 'super_admin', email: 'hacker@test.com' })
    });
    verify('CB-001: Unauthenticated / escalated staff invite rejected with 401/403', res.status === 401 || res.status === 403, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-001: Staff invite check', false, e.message);
  }

  // CB-002: Factory Reset requires authenticated super admin
  try {
    const res = await fetch(`${origin}/api/admin/factory-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: 'demo-rest' })
    });
    verify('CB-002: Unauthorized factory reset rejected with 401', res.status === 401, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-002: Unauthorized factory reset', false, e.message);
  }

  // CB-003: Update order status requires valid staff session
  try {
    const res = await fetch(`${origin}/api/staff/update-order-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'ord-123', newStatus: 'preparing' })
    });
    verify('CB-003: Customer update order status rejected with 401', res.status === 401, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-003: Customer update order status', false, e.message);
  }

  // CB-004: Table assignments requires valid staff session
  try {
    const res = await fetch(`${origin}/api/staff/table-assignments?restaurantId=test-rest`);
    verify('CB-004: Unauthenticated table assignments rejected with 401', res.status === 401, `HTTP ${res.status}`);
  } catch (e: any) {
    verify('CB-004: Unauthenticated table assignments', false, e.message);
  }

  // 7. Test Live Page Rendering on port 3000
  const pagesToTest = [
    { path: '/', name: 'Landing Page' },
    { path: '/menu/demo-restaurant/table/table-1', name: 'Customer Menu Table 1' },
    { path: '/dashboard/tables', name: 'Staff Floor Layout / Tables Page' },
    { path: '/dashboard/kds', name: 'Kitchen Display System (KDS)' },
    { path: '/dashboard/reports', name: 'Analytics & Reports' }
  ];

  for (const p of pagesToTest) {
    try {
      const res = await fetch(`${origin}${p.path}`);
      verify(`PAGE: ${p.name} (${p.path}) renders successfully`, res.status === 200, `HTTP ${res.status}`);
    } catch (e: any) {
      verify(`PAGE: ${p.name} (${p.path}) renders successfully`, false, e.message);
    }
  }

  console.log('\n===============================================================');
  console.log(`SPRINT VERIFICATION: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


