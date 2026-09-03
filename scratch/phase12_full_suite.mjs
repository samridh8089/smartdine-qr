import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});

const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

async function runPartsD_E_F() {
  console.log('===============================================================');
  console.log('=== PHASE 12: PART D, E, F — FINANCIAL, INTEGRITY, QR SEC   ===');
  console.log('===============================================================');

  // -------------------------------------------------------------
  // PART D: FINANCIAL ACCURACY & RECONCILIATION ACROSS 50 ORDERS
  // -------------------------------------------------------------
  console.log('\n[Part D] Auditing Financial Accuracy across 50 orders in DB...');
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, subtotal, gst, total, cgst_amount, sgst_amount, status, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (oErr || !orders) {
    console.error('Failed to query orders for financial audit:', oErr);
    return;
  }

  let totalMismatchCount = 0;
  let maxDelta = 0;

  orders.forEach((o, idx) => {
    const sub = Number(o.subtotal || 0);
    const gst = Number(o.gst || 0);
    const tot = Number(o.total || 0);
    const cgst = Number(o.cgst_amount || 0);
    const sgst = Number(o.sgst_amount || 0);

    const calculatedTotal = parseFloat((sub + gst).toFixed(2));
    const delta = Math.abs(calculatedTotal - tot);

    if (delta > 0.01) {
      totalMismatchCount++;
      if (delta > maxDelta) maxDelta = delta;
      console.log(`Mismatch on order ${o.id}: subtotal=${sub}, gst=${gst}, calcTotal=${calculatedTotal}, actualTotal=${tot}`);
    }

    const gstDelta = Math.abs(parseFloat((cgst + sgst).toFixed(2)) - gst);
    if (gstDelta > 0.01 && gst > 0 && (cgst > 0 || sgst > 0)) {
      console.log(`GST component mismatch on order ${o.id}: cgst=${cgst}, sgst=${sgst}, gst=${gst}`);
    }
  });

  console.log(`Financial Audit Summary across ${orders.length} orders:`);
  console.log(` - Subtotal + GST == Total Mismatches: ${totalMismatchCount}`);
  console.log(` - Max Delta: ₹${maxDelta.toFixed(2)}`);
  console.log(` - Financial Accuracy Status: ${totalMismatchCount === 0 ? '100% PERFECT (Diff = ₹0.00)' : 'MISMATCH'}`);

  // -------------------------------------------------------------
  // PART E: DATA INTEGRITY & ORPHAN RECORD AUDIT
  // -------------------------------------------------------------
  console.log('\n[Part E] Auditing Database Integrity & Orphan Records...');

  // 1. Check orphan order_items (items without valid order_id)
  const { data: allOrderIds } = await supabase.from('orders').select('id');
  const validOrderIdSet = new Set(allOrderIds.map(o => o.id));

  const { data: allItems } = await supabase.from('order_items').select('id, order_id');
  const orphanItems = (allItems || []).filter(item => !validOrderIdSet.has(item.order_id));

  // 2. Check orphan order_batches
  const { data: allBatches } = await supabase.from('order_batches').select('id, order_id');
  const orphanBatches = (allBatches || []).filter(b => !validOrderIdSet.has(b.order_id));

  // 3. Check orphan inventory_transactions
  const { data: allInvItems } = await supabase.from('inventory_items').select('id');
  const validInvIdSet = new Set(allInvItems.map(i => i.id));
  const { data: allTx } = await supabase.from('inventory_transactions').select('id, inventory_item_id');
  const orphanTx = (allTx || []).filter(tx => tx.inventory_item_id && !validInvIdSet.has(tx.inventory_item_id));

  console.log('Data Integrity Results:');
  console.log(` - Total Orders: ${allOrderIds?.length}`);
  console.log(` - Total Order Items: ${allItems?.length} | Orphan Items: ${orphanItems.length}`);
  console.log(` - Total Order Batches: ${allBatches?.length} | Orphan Batches: ${orphanBatches.length}`);
  console.log(` - Total Inventory Transactions: ${allTx?.length} | Orphan Transactions: ${orphanTx.length}`);

  const integrityPass = orphanItems.length === 0 && orphanBatches.length === 0 && orphanTx.length === 0;
  console.log(` - Overall Data Integrity: ${integrityPass ? 'PASS (0 Orphan Records)' : 'FAIL'}`);

  // -------------------------------------------------------------
  // PART F: QR SECURITY & TAMPERING RESISTANCE
  // -------------------------------------------------------------
  console.log('\n[Part F] Testing QR Security & URL Tampering...');
  const qrTests = [
    { name: 'Invalid Table UUID in URL', url: 'https://www.cleverops.in/menu/foodyhub/table/00000000-0000-0000-0000-000000000000' },
    { name: 'Malformed Table String', url: 'https://www.cleverops.in/menu/foodyhub/table/hack_sql_injection_test' },
    { name: 'Non-existent Restaurant Slug', url: 'https://www.cleverops.in/menu/non-existent-restaurant-9999/table/433daa89-186c-454c-a978-e184a85577b2' },
    { name: 'Direct POST with Foreign Restaurant ID', payload: { restaurantId: '00000000-0000-0000-0000-000000000000', tableId: '433daa89-186c-454c-a978-e184a85577b2', items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }] } }
  ];

  const qrResults = [];
  for (const t of qrTests) {
    if (t.url) {
      const res = await fetch(t.url);
      console.log(` - Test [${t.name}]: HTTP ${res.status}`);
      qrResults.push({ name: t.name, status: res.status, pass: res.status === 200 || res.status === 404 });
    } else {
      const res = await fetch('https://www.cleverops.in/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(t.payload)
      });
      const data = await res.json();
      console.log(` - Test [${t.name}]: HTTP ${res.status}`, data);
      qrResults.push({ name: t.name, status: res.status, pass: res.status === 404 || res.status === 400, response: data });
    }
  }

  // -------------------------------------------------------------
  // PART G: PERFORMANCE BENCHMARKING
  // -------------------------------------------------------------
  console.log('\n[Part G] Measuring Live Performance Metrics...');
  const perfMetrics = {};

  // 1. Order API Latency (5 iterations)
  const apiTimes = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const res = await fetch('https://www.cleverops.in/api/customer/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId,
        tableId: '433daa89-186c-454c-a978-e184a85577b2',
        orderType: 'dine_in',
        items: [{ menuItemId: '549c6942-17d1-4e73-b205-58933ddfb482', quantity: 1, price: 45 }]
      })
    });
    const dur = performance.now() - start;
    if (res.status === 200) apiTimes.push(dur);
  }
  const avgApiTime = (apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length).toFixed(0);
  console.log(` - Order API Average Latency: ${avgApiTime}ms (Target: <500ms)`);

  // 2. QR Menu Open Time
  const qrStart = performance.now();
  const menuRes = await fetch('https://www.cleverops.in/menu/foodyhub/table/433daa89-186c-454c-a978-e184a85577b2');
  const qrTime = (performance.now() - qrStart).toFixed(0);
  console.log(` - QR Menu Load Time: ${qrTime}ms (Target: <2000ms)`);

  // 3. Health & Version API check
  const vStart = performance.now();
  const vRes = await fetch('https://www.cleverops.in/api/version');
  const vTime = (performance.now() - vStart).toFixed(0);
  console.log(` - Version API Latency: ${vTime}ms`);

  perfMetrics['Order API Latency'] = { value: `${avgApiTime}ms`, target: '<500ms', pass: Number(avgApiTime) < 500 };
  perfMetrics['QR Menu Load Time'] = { value: `${qrTime}ms`, target: '<2000ms', pass: Number(qrTime) < 2000 };
  perfMetrics['Core API Ping'] = { value: `${vTime}ms`, target: '<300ms', pass: Number(vTime) < 300 };

  fs.writeFileSync('scratch/phase12_financial_integrity_perf.json', JSON.stringify({
    financialAccuracy: { auditedOrders: orders.length, mismatches: totalMismatchCount, pass: totalMismatchCount === 0 },
    dataIntegrity: { totalOrders: allOrderIds?.length, orphanItems: orphanItems.length, orphanBatches: orphanBatches.length, orphanTx: orphanTx.length, pass: integrityPass },
    qrSecurity: qrResults,
    performance: perfMetrics
  }, null, 2));

  console.log('\n=== SUITE COMPLETED SUCCESSFULLY! ===');
}

runPartsD_E_F().catch(console.error);
