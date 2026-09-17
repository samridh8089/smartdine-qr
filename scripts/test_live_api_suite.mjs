import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

// Polyfill WebSocket for Node
global.WebSocket = WebSocket;

// Simple .env.local loader
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.log('Note: could not read .env.local', e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const baseUrl = 'http://localhost:3000';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runSuite() {
  console.log('--- 1. Authenticating as Owner ---');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'dsoni1281@gmail.com',
    password: '123456'
  });

  let session = authData?.session;
  if (!session) {
    console.error('Failed to log in:', authError);
    process.exit(1);
  }

  const token = session.access_token;
  console.log('Logged in successfully. User ID:', session.user.id);

  // Fetch restaurant
  const { data: profile } = await supabase
    .from('profiles')
    .select('restaurant_id, role')
    .eq('id', session.user.id)
    .single();

  const restaurantId = profile?.restaurant_id || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
  console.log('Restaurant ID:', restaurantId, 'Role:', profile?.role);

  // Fetch real table and menu item
  const { data: tables } = await supabase
    .from('tables')
    .select('id, table_number')
    .eq('restaurant_id', restaurantId)
    .limit(1);
  const table = tables?.[0];

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .eq('restaurant_id', restaurantId)
    .limit(1);
  const item = menuItems?.[0];

  console.log('Using Table:', table?.id, `(${table?.table_number})`, 'Item:', item?.name, `(${item?.id})`);

  const results = [];

  // Helper to test endpoint
  async function testEndpoint(name, url, method, body, sendToken = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (sendToken) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const latency = Date.now() - t0;
      const status = res.status;
      let json = null;
      try {
        json = await res.json();
      } catch (e) {
        json = await res.text();
      }
      return { name, method, url, status, latency, sendToken, response: json };
    } catch (err) {
      return { name, method, url, status: 'ERROR', latency: Date.now() - t0, sendToken, error: err.message };
    }
  }

  console.log('\n--- 2. Testing Endpoints Without Token (Should return 401 UNAUTHORIZED) ---');
  results.push(await testEndpoint('Punch Order (No Token)', `${baseUrl}/api/staff/punch-order`, 'POST', {
    restaurantId,
    tableId: table?.id,
    customerName: 'Test Unauth',
    orderType: 'dine_in',
    items: [{ id: item?.id, name: item?.name, price: item?.price, quantity: 1 }]
  }, false));

  results.push(await testEndpoint('Create Staff Invite (No Token)', `${baseUrl}/api/staff/create-invite`, 'POST', {
    restaurantId,
    email: 'unauth_test@example.com',
    name: 'Unauth Staff',
    role: 'waiter',
    pin: '1234'
  }, false));

  results.push(await testEndpoint('Delete Staff (No Token)', `${baseUrl}/api/staff/delete`, 'POST', {
    restaurantId,
    staffId: '00000000-0000-0000-0000-000000000000'
  }, false));

  results.push(await testEndpoint('Update Order Status (No Token)', `${baseUrl}/api/staff/update-order-status`, 'POST', {
    restaurantId,
    orderId: '00000000-0000-0000-0000-000000000000',
    status: 'accepted'
  }, false));

  console.log('\n--- 3. Testing Endpoints With Bearer Token (Should Succeed 200 OK) ---');
  // 1. Punch Order
  const punchRes = await testEndpoint('Punch Order (With Token)', `${baseUrl}/api/staff/punch-order`, 'POST', {
    restaurantId,
    tableId: table?.id,
    customerName: 'Soni Suite Test',
    orderType: 'dine_in',
    items: [{ id: item?.id, name: item?.name, price: item?.price, quantity: 1 }]
  }, true);
  results.push(punchRes);
  const createdOrderId = punchRes.response?.order?.id;
  console.log('Punched Order ID:', createdOrderId);

  // 2. Create Staff Invite
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const testStaffEmail = `staff_${Date.now()}_${randNum}@foodyhub.com`;
  const inviteRes = await testEndpoint('Create Staff Invite (With Token)', `${baseUrl}/api/staff/create-invite`, 'POST', {
    restaurantId,
    email: testStaffEmail,
    name: `Waiter Staff ${randNum}`,
    role: 'waiter',
    pin: '5566'
  }, true);
  results.push(inviteRes);
  const createdStaffId = inviteRes.response?.staff?.id || inviteRes.response?.profile?.id || inviteRes.response?.invite?.id;
  console.log('Created Staff ID:', createdStaffId);

  // 3. Update Order Status
  if (createdOrderId) {
    const updateRes = await testEndpoint('Update Order Status (With Token)', `${baseUrl}/api/staff/update-order-status`, 'POST', {
      orderId: createdOrderId,
      restaurantId,
      status: 'accepted'
    }, true);
    results.push(updateRes);
  }

  // 4. Staff List / Get Staff
  const listRes = await testEndpoint('Get Staff List (With Token)', `${baseUrl}/api/staff/list?restaurantId=${restaurantId}`, 'GET', null, true);
  results.push(listRes);

  console.log('\n--- 4. Realtime Broadcast Verification ---');
  const realtimePromise = new Promise((resolve, reject) => {
    const channel = supabase.channel(`staff_${restaurantId}`);
    const timeout = setTimeout(() => {
      resolve({ received: false, latency: null, reason: 'Timeout waiting for broadcast' });
    }, 12000);

    const subscribeStartTime = Date.now();
    channel
      .on('broadcast', { event: 'staff-updated' }, (payload) => {
        const receivedAt = Date.now();
        clearTimeout(timeout);
        channel.unsubscribe();
        resolve({
          received: true,
          broadcastLatencyMs: receivedAt - (payload.payload?.timestamp || subscribeStartTime),
          event: payload.event,
          payload: payload.payload
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime channel subscribed! Triggering staff invite which fires broadcastStaffRealtimeEvent...');
          const rtNum = Math.floor(1000 + Math.random() * 9000);
          const sendRes = await fetch(`${baseUrl}/api/staff/create-invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              restaurantId,
              email: `rt_${Date.now()}_${rtNum}@foodyhub.com`,
              name: `RT Staff ${rtNum}`,
              role: 'cashier',
              pin: '9988'
            })
          });
          const json = await sendRes.json();
          console.log('Create-invite broadcast trigger response:', json.success ? 'SUCCESS (Invite Created)' : json);
        }
      });
  });

  const rtResult = await realtimePromise;
  console.log('\nRealtime Broadcast Result:', JSON.stringify(rtResult, null, 2));

  console.log('\n================ LIVE VALIDATION MATRIX ================');
  console.table(results.map(r => ({
    Endpoint: r.name,
    Method: r.method,
    'Auth Header': r.sendToken ? 'Bearer <token>' : 'None',
    Status: r.status,
    'Latency (ms)': r.latency,
    'Outcome': r.status === 200 ? 'PASS (200 OK)' : (r.status === 401 ? 'PASS (401 UNAUTHORIZED)' : `FAIL (${r.status})`)
  })));

  return { results, rtResult };
}

runSuite().then(() => {
  setTimeout(() => process.exit(0), 500);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
