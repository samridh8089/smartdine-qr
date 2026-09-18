import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

// Load env
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
let supabaseUrl = '', supabaseAnonKey = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseAnonKey = trimmed.split('=')[1].trim();
}

const baseUrl = 'https://www.cleverops.in';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProduction() {
  console.log('=== TESTING LIVE PRODUCTION SERVER: https://www.cleverops.in ===\n');

  // 1. Authenticate with production Supabase
  console.log('1. Authenticating as Owner on Production...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'dsoni1281@gmail.com',
    password: '123456'
  });

  let session = authData?.session;
  if (!session) {
    const { data: authData2 } = await supabase.auth.signInWithPassword({
      email: 'dsoni1281@gmail.com',
      password: '123456'
    });
    session = authData2?.session;
  }

  if (!session) {
    console.error('Failed to sign in:', authError);
    process.exit(1);
  }

  const token = session.access_token;
  console.log('Production User Authenticated:', session.user.id);

  // Fetch restaurant
  const { data: profile } = await supabase
    .from('profiles')
    .select('restaurant_id, role')
    .eq('id', session.user.id)
    .single();

  const restaurantId = profile?.restaurant_id || '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';
  console.log('Restaurant ID:', restaurantId, 'Role:', profile?.role);

  // Fetch menu item
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .eq('restaurant_id', restaurantId)
    .limit(1);
  const item = menuItems?.[0];

  const results = [];

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

  // A. Unauthenticated tests
  console.log('\n2. Testing Endpoints Without Token (Expected 401 UNAUTHORIZED)...');
  results.push(await testEndpoint('Punch Order (No Token)', `${baseUrl}/api/staff/punch-order`, 'POST', {
    restaurantId,
    tableId: 'takeaway',
    customerName: 'Unauth Probe',
    orderType: 'takeaway',
    items: [{ id: item?.id, name: item?.name, price: item?.price, quantity: 1 }]
  }, false));

  results.push(await testEndpoint('Create Staff Invite (No Token)', `${baseUrl}/api/staff/create-invite`, 'POST', {
    restaurantId,
    email: 'unauth@test.com',
    name: 'Unauth Staff',
    role: 'waiter'
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

  // B. Authenticated tests
  console.log('\n3. Testing Endpoints With Bearer Token (Expected 200 OK)...');
  const punchRes = await testEndpoint('Punch Order (With Token)', `${baseUrl}/api/staff/punch-order`, 'POST', {
    restaurantId,
    tableId: 'takeaway',
    customerName: 'Prod Test Soni',
    customerPhone: '9876543210',
    orderType: 'takeaway',
    items: [{ id: item?.id, name: item?.name, price: item?.price, quantity: 1 }]
  }, true);
  results.push(punchRes);
  const createdOrderId = punchRes.response?.order?.id;
  console.log('Production Punched Order ID:', createdOrderId);

  if (createdOrderId) {
    const updateRes = await testEndpoint('Update Order Status (With Token)', `${baseUrl}/api/staff/update-order-status`, 'POST', {
      orderId: createdOrderId,
      restaurantId,
      status: 'accepted'
    }, true);
    results.push(updateRes);
  }

  const listRes = await testEndpoint('Get Staff List (With Token)', `${baseUrl}/api/staff/list?restaurantId=${restaurantId}`, 'GET', null, true);
  results.push(listRes);

  console.log('\n================ LIVE PRODUCTION VALIDATION MATRIX ================');
  console.table(results.map(r => ({
    Endpoint: r.name,
    Method: r.method,
    'Auth Header': r.sendToken ? 'Bearer <token>' : 'None',
    Status: r.status,
    'Latency (ms)': `${r.latency} ms`,
    'Outcome': r.status === 200 ? 'PASS (200 OK)' : (r.status === 401 ? 'PASS (401 UNAUTHORIZED)' : `STATUS ${r.status}`)
  })));

  setTimeout(() => process.exit(0), 500);
}

testProduction().catch(e => {
  console.error(e);
  process.exit(1);
});
