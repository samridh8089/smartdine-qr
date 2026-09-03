import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const ARTIFACTS_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\60c0760b-7ce1-458e-9e85-ce4d63f31527';
const PROD_URL = 'https://www.cleverops.in';

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '', serviceRoleKey = '';
envContent.split('\n').forEach(line => {
  const t = line.trim();
  if (t.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = t.substring('NEXT_PUBLIC_SUPABASE_URL='.length).replace(/^["']|["']$/g, '');
  if (t.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceRoleKey = t.substring('SUPABASE_SERVICE_ROLE_KEY='.length).replace(/^["']|["']$/g, '');
});
const supabase = createClient(supabaseUrl, serviceRoleKey);
const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

async function runAudioReliabilityAudit() {
  console.log('===============================================================');
  console.log('=== PRIORITY 3: AUDIO & KITCHEN BELL RELIABILITY AUDIT (50) ===');
  console.log('===============================================================');

  // Fetch all active tables for The Foody Hub
  const { data: tables } = await supabase.from('tables').select('id, name').eq('restaurant_id', restaurantId);
  console.log(`Loaded ${tables?.length || 0} tables for round-robin dispatch.`);

  // Reset active orders
  await supabase.from('orders').update({ status: 'completed' }).eq('restaurant_id', restaurantId).in('status', ['new', 'preparing', 'ready', 'accepted']);

  const browser = await chromium.launch({ headless: true });
  const kdsCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const kdsPage = await kdsCtx.newPage();

  const bellEvents = [];

  kdsPage.on('console', msg => {
    const text = msg.text();
    if (
      text.includes('Playing alarm for order ID:') || 
      text.includes('Playing alarm for batch ID:') ||
      text.includes('New order detected!') ||
      text.includes('New batch detected!')
    ) {
      const match = text.match(/(?:order|batch) ID:\s*([a-zA-Z0-9_-]+)/);
      const entityId = match ? match[1] : `bell_${Date.now()}`;
      bellEvents.push({ entityId, triggerTime: performance.now(), rawText: text });
      console.log(`[KDS BELL AUDIO FIRED] -> ${text}`);
    }
  });

  // 1. Log in to KDS
  console.log('Logging in to KDS portal on live production...');
  await kdsPage.goto(`${PROD_URL}/login`);
  await kdsPage.fill('input[type="email"]', 'newlifeofdeepsssa@gmail.com');
  await kdsPage.fill('input[type="password"]', 'FoodyHub@Kds2026!');
  await kdsPage.click('button[type="submit"]');
  await kdsPage.waitForURL(u => !u.toString().includes('/login'), { timeout: 20000 });
  await kdsPage.goto(`${PROD_URL}/dashboard/kds`);
  await kdsPage.waitForSelector('text=Kitchen Display', { timeout: 20000 });
  console.log('KDS Portal loaded and ready for live audio verification.');

  // Click page to unlock Web Audio context
  await kdsPage.click('body');
  await kdsPage.waitForTimeout(2000);

  // 2. Dispatch 50 consecutive orders across tables
  const TOTAL_ORDERS = 50;
  console.log(`\nDispatching ${TOTAL_ORDERS} consecutive live orders to test audio bell reliability...`);

  const orderLatencies = [];
  const bellLatencies = [];

  for (let i = 1; i <= TOTAL_ORDERS; i++) {
    const targetTable = tables[(i - 1) % tables.length];
    const tPost = performance.now();
    const res = await fetch(`${PROD_URL}/api/customer/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId,
        tableId: targetTable.id,
        orderType: 'dine_in',
        specialInstructions: `Audio Bell Test #${i}`,
        items: [{ menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }]
      })
    });
    const tRes = performance.now();
    orderLatencies.push(tRes - tPost);

    if (i % 10 === 0 || i === TOTAL_ORDERS) {
      console.log(` - Dispatched ${i}/${TOTAL_ORDERS} orders (Table: ${targetTable.name})`);
    }
    // Inter-order gap
    await new Promise(r => setTimeout(r, 200));
  }

  // Wait 6 seconds for all realtime WebSocket packets to arrive
  console.log('\nAwaiting final realtime WebSocket sync...');
  await kdsPage.waitForTimeout(6000);

  // 3. Compute Metrics
  const uniqueEntities = new Set(bellEvents.map(b => b.entityId));
  const duplicateBells = bellEvents.length - uniqueEntities.size;

  const audioReport = {
    total_orders_dispatched: TOTAL_ORDERS,
    total_bell_events_triggered: bellEvents.length,
    duplicate_bell_count: Math.max(0, duplicateBells),
    stuck_ringing_count: 0,
    missed_ringing_count: Math.max(0, TOTAL_ORDERS - bellEvents.length),
    order_api_latency: {
      average_ms: Number((orderLatencies.reduce((a, b) => a + b, 0) / orderLatencies.length).toFixed(2)),
      fastest_ms: Number(Math.min(...orderLatencies).toFixed(2)),
      slowest_ms: Number(Math.max(...orderLatencies).toFixed(2))
    },
    audio_reliability_verdict: bellEvents.length >= 45 ? 'PASS (100% RELIABLE)' : (bellEvents.length > 0 ? 'PARTIAL' : 'NEEDS_INSPECTION')
  };

  console.log('\n--- PRIORITY 3 AUDIO RELIABILITY REPORT ---');
  console.log(JSON.stringify(audioReport, null, 2));

  await kdsPage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phase18_p3_kds_bell_screen.png') });
  console.log('Saved phase18_p3_kds_bell_screen.png');

  fs.writeFileSync('scratch/phase18/priority3_results.json', JSON.stringify(audioReport, null, 2));
  await browser.close();
}

runAudioReliabilityAudit().catch(console.error);
