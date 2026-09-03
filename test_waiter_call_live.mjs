import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf';

const PUSH_TOKENS = [
  'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]',
  'ExponentPushToken[zLCv9lGcbCydfqOfpBzjY0]'
];

async function triggerWaiterCallLive() {
  console.log('=== INITIATING LIVE WAITER CALL ALERT FOR SHREE RAM ===\n');
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Insert Customer Call in DB
  const { data: call, error } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  if (error) {
    console.error('DB Insert Error:', error.message);
  } else {
    console.log(`[DB SUCCESS] Created Customer Call ID: ${call?.[0]?.id} for Table 1 (Shree Ram)`);
  }

  // 2. Dispatch FCM Push Notifications to both phone tokens
  for (const token of PUSH_TOKENS) {
    const start = Date.now();
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        to: token,
        sound: 'order_tune',
        priority: 'high',
        channelId: 'smartdine_waiter',
        title: `🔔 WAITER CALL: Table 1 (${now})`,
        body: `Customer at Table 1 needs assistance! (Shree Ram)`,
        data: {
          notificationType: 'CUSTOMER_CALL',
          restaurantId: SHREE_RAM_RESTAURANT_ID,
          tableId: TABLE_1_ID,
          requestId: call?.[0]?.id,
          timestamp: start
        },
        badge: 1,
        _displayInForeground: true
      }])
    });

    const json = await res.json();
    const latency = Date.now() - start;
    console.log(`[FCM PUSH RESULT] Token: ${token} | Latency: ${latency}ms | Response:`, JSON.stringify(json));
  }

  // 3. Wait 1.5 seconds and pull device screenshot
  await new Promise(r => setTimeout(r, 1500));

  try {
    execSync('adb shell cmd statusbar expand-notifications');
    execSync('adb shell screencap -p /data/local/tmp/waiter_call.png');
    execSync('adb pull /data/local/tmp/waiter_call.png screenshot_waiter_call.png');
    fs.copyFileSync('screenshot_waiter_call.png', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_waiter_call.png');
    console.log('Successfully captured and saved live Waiter Call notification screenshot!');
  } catch (e) {
    console.log('Screenshot capture note:', e.message);
  }

  console.log('\n=== LIVE WAITER CALL TEST FINISHED ===');
}

triggerWaiterCallLive();
