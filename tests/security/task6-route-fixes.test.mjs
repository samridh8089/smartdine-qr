import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

async function checkServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}`, { method: 'GET' });
    return !!res;
  } catch {
    return false;
  }
}

test('TASK 6.1: ai-menu/upload-image SSRF protection blocks non-https and private/loopback IPs', async (t) => {
  if (!(await checkServerRunning())) {
    if (t?.skip) t.skip('Server not reachable at http://localhost:3000');
    return;
  }
  const resNoAuth = await fetch(`${BASE_URL}/api/ai-menu/upload-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: 'test-rest-id',
      imageUrl: 'http://127.0.0.1/secret.png'
    })
  });
  assert.ok(resNoAuth.status === 401 || resNoAuth.status === 400);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const resSSRF = await fetch(`${BASE_URL}/api/ai-menu/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`
      },
      body: JSON.stringify({
        restaurantId: 'test-rest-id',
        imageUrl: 'https://127.0.0.1:8080/admin/credentials'
      })
    });
    assert.strictEqual(resSSRF.status, 400);
    const json = await resSSRF.json();
    assert.ok(json.error?.includes('Invalid or restricted') || json.error?.includes('Invalid image URL'));
  }
});

test('TASK 6.2: ai-usage/check requires staff auth for both GET and POST', async (t) => {
  if (!(await checkServerRunning())) {
    if (t?.skip) t.skip('Server not reachable at http://localhost:3000');
    return;
  }
  const getRes = await fetch(`${BASE_URL}/api/ai-usage/check?restaurantId=dummy-rest`);
  assert.strictEqual(getRes.status, 401, 'GET /api/ai-usage/check must return 401 for unauthenticated caller');

  const postRes = await fetch(`${BASE_URL}/api/ai-usage/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurantId: 'dummy-rest',
      featureKey: 'ai_menu_analysis',
      consume: true,
      itemCount: 1
    })
  });
  assert.strictEqual(postRes.status, 401, 'POST /api/ai-usage/check must return 401 for unauthenticated caller');
});

test('TASK 6.3: auth/check-email-availability returns generic response without tenant leak', async (t) => {
  if (!(await checkServerRunning())) {
    if (t?.skip) t.skip('Server not reachable at http://localhost:3000');
    return;
  }
  const uniqueEmail = `test_${Date.now()}@example.com`;
  const res = await fetch(`${BASE_URL}/api/auth/check-email-availability?email=${encodeURIComponent(uniqueEmail)}`);
  assert.ok(res.status === 200 || res.status === 429);
  if (res.status === 200) {
    const data = await res.json();
    assert.strictEqual(data.checked, true);
    assert.strictEqual(data.userExists, undefined, 'Must not leak userExists enumeration bool');
    assert.strictEqual(data.restaurantId, undefined, 'Must not leak restaurantId');
  }
});

test('TASK 6.4: customer/orders sanitizes error responses without DB Error leak', async (t) => {
  if (!(await checkServerRunning())) {
    if (t?.skip) t.skip('Server not reachable at http://localhost:3000');
    return;
  }
  const res = await fetch(`${BASE_URL}/api/customer/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      restaurant_id: '00000000-0000-0000-0000-000000000000',
      table_number: '1',
      items: [{ menu_item_id: 'bad-item', quantity: 1, name: 'Item', price: 100 }],
      total_amount: 100
    })
  });
  assert.ok(res.status >= 400);
  const data = await res.json();
  const rawText = JSON.stringify(data);
  assert.ok(!rawText.includes('DB Error:'), 'Must never leak raw database error details');
});

test('TASK 6.5: payments/verify validates schema and rejects invalid payload', async (t) => {
  if (!(await checkServerRunning())) {
    if (t?.skip) t.skip('Server not reachable at http://localhost:3000');
    return;
  }
  const res = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: 'order_123'
    })
  });
  assert.strictEqual(res.status, 400);
});
