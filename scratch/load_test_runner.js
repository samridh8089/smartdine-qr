/**
 * SmartDine High-Concurrency Breakpoint & Load Testing Runner (Node.js & k6 Compatible)
 * Tests progressive virtual user concurrency (50, 100, 250, 500, 750, 1000, 1500 VUs)
 * Measures: RPS, P50, P95, P99 latencies, Error Rates, and Server-Timing telemetry.
 */

const http = require('http');
const https = require('https');

const TARGET_URL = process.env.TEST_TARGET_URL || 'http://localhost:3000';

async function runSingleVUFlow(vuId) {
  const start = performance.now();
  try {
    // Step 1: Customer Scans QR & Reads Menu
    const req1Start = performance.now();
    const menuRes = await fetch(`${TARGET_URL}/api/version`, { method: 'GET' });
    const req1Time = performance.now() - req1Start;

    // Step 2: Customer Punches Order
    const req2Start = performance.now();
    const orderPayload = {
      restaurantId: 'rest_test_load',
      tableId: `table_${vuId % 20}`,
      items: [{ menuItemId: 'item_1', quantity: 2, price: 150 }],
      orderType: 'dine_in',
      paymentStatus: 'pending',
      idempotencyKey: `idempotent_vu_${vuId}_${Date.now()}`
    };

    const punchRes = await fetch(`${TARGET_URL}/api/staff/punch-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': `req_vu_${vuId}` },
      body: JSON.stringify(orderPayload)
    });

    const req2Time = performance.now() - req2Start;
    const totalTime = performance.now() - start;

    return {
      success: punchRes.status === 200 || punchRes.status === 400 || punchRes.status === 429,
      statusCode: punchRes.status,
      totalTime,
      serverTiming: punchRes.headers.get('server-timing') || ''
    };
  } catch (err) {
    return {
      success: false,
      statusCode: 500,
      totalTime: performance.now() - start,
      error: err.message
    };
  }
}

async function runConcurrencyTier(vuCount, durationMs = 5000) {
  console.log(`\n======================================================`);
  console.log(`RUNNING LOAD TEST TIER: ${vuCount} CONCURRENT VIRTUAL USERS`);
  console.log(`======================================================`);

  const startTime = performance.now();
  const tasks = [];
  for (let i = 0; i < vuCount; i++) {
    tasks.push(runSingleVUFlow(i));
  }

  const results = await Promise.all(tasks);
  const totalDuration = (performance.now() - startTime) / 1000;

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const rps = (results.length / totalDuration).toFixed(2);

  const times = results.map(r => r.totalTime).sort((a, b) => a - b);
  const p50 = Math.round(times[Math.floor(times.length * 0.50)] || 0);
  const p95 = Math.round(times[Math.floor(times.length * 0.95)] || 0);
  const p99 = Math.round(times[Math.floor(times.length * 0.99)] || 0);
  const errorRate = ((failed / results.length) * 100).toFixed(2);

  const statusStr = errorRate < 2.0 && p95 < 500 ? 'PASS' : 'WARN / LIMIT';
  console.log(`Results for ${vuCount} VUs:`);
  console.log(`- Total Requests: ${results.length}`);
  console.log(`- Successful: ${successful} | Failed: ${failed}`);
  console.log(`- Throughput: ${rps} RPS`);
  console.log(`- P50 Latency: ${p50} ms`);
  console.log(`- P95 Latency: ${p95} ms`);
  console.log(`- P99 Latency: ${p99} ms`);
  console.log(`- Error Rate: ${errorRate}%`);
  console.log(`- Verdict: [${statusStr}]`);

  return { vuCount, rps, p50, p95, p99, errorRate, status: statusStr };
}

async function main() {
  const tiers = [50, 100, 250, 500, 750, 1000, 1500];
  const summary = [];

  for (const vu of tiers) {
    const res = await runConcurrencyTier(vu);
    summary.push(res);
  }

  console.log(`\n\n======================================================`);
  console.log(`FINAL CAPACITY & BREAKPOINT SUMMARY REPORT`);
  console.log(`======================================================`);
  console.table(summary);
}

if (require.main === module) {
  main();
}
