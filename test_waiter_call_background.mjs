import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_2_ID = '96c6f0e0-e22e-4712-83ae-a99c09f6b49b';

const PUSH_TOKENS = [
  'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]',
  'ExponentPushToken[zLCv9lGcbCydfqOfpBzjY0]'
];

async function triggerWaiterCallBackground() {
  console.log('=== INITIATING TEST 2: BACKGROUND WAITER CALL ALERT ===\n');
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Insert Customer Call in DB for Table 2
  const { data: call, error } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_2_ID,
    table_name: 'Table 2',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  if (error) {
    console.error('DB Insert Error:', error.message);
  } else {
    console.log(`[DB SUCCESS] Created Background Customer Call ID: ${call?.[0]?.id} for Table 2`);
  }

  // 2. Dispatch FCM Push Notifications
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
        title: `🚨 BACKGROUND WAITER ALERT: Table 2 (${now})`,
        body: `Customer at Table 2 requested Waiter assistance! (Shree Ram)`,
        data: {
          notificationType: 'CUSTOMER_CALL',
          restaurantId: SHREE_RAM_RESTAURANT_ID,
          tableId: TABLE_2_ID,
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

  // 3. Wait 1.5s, expand notification bar and capture screenshot
  await new Promise(r => setTimeout(r, 1500));

  try {
    execSync('adb shell cmd statusbar expand-notifications');
    execSync('adb shell screencap -p /data/local/tmp/waiter_bg.png');
    execSync('adb pull /data/local/tmp/waiter_bg.png screenshot_waiter_bg.png');
    fs.copyFileSync('screenshot_waiter_bg.png', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_waiter_bg.png');
    console.log('Successfully captured live Background notification screenshot!');
  } catch (e) {
    console.log('Screenshot capture note:', e.message);
  }

  console.log('\n=== TEST 2 FINISHED ===');
}

triggerWaiterCallBackground();
