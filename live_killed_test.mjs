import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5'; // Shree ram
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf'; // Table 1
const PUSH_TOKEN = 'ExponentPushToken[zLCv9lGcbCydfqOfpBzjY0]';

async function runLiveKilledTest() {
  console.log('=== LIVE KILLED APP TEST INITIATED ===');
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
  // 1. Insert DB record
  const { data: req, error } = await client.from('customer_requests').insert({
    restaurant_id: RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log('DB Customer Call Inserted:', req?.[0]?.id || error);

  // 2. Dispatch FCM Push Notification
  const start = Date.now();
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      to: PUSH_TOKEN,
      sound: 'order_tune',
      priority: 'high',
      channelId: 'smartdine_waiter',
      title: '🚨 LIVE KILLED TEST: WAITER CALL!',
      body: `Table 1 called Waiter assistance at ${now}`,
      data: {
        notificationType: 'CUSTOMER_CALL',
        restaurantId: RESTAURANT_ID,
        tableId: TABLE_1_ID,
        requestId: req?.[0]?.id,
        timestamp: start
      },
      badge: 1,
      _displayInForeground: true
    }])
  });

  const json = await res.json();
  const latency = Date.now() - start;
  console.log(`FCM Dispatch Response (Latency: ${latency}ms):`, json);

  // 3. Wait 1.5 seconds for system notification sound to play on phone
  await new Promise(r => setTimeout(r, 1500));

  // 4. Expand notification bar and take screenshot & UI dump
  console.log('Expanding notification bar and capturing screenshot...');
  execSync('adb shell cmd statusbar expand-notifications');
  execSync('adb shell screencap -p /sdcard/live_killed_shot.png');
  execSync('adb pull /sdcard/live_killed_shot.png screenshot_killed_after.png');
  execSync('adb shell uiautomator dump /sdcard/live_killed_xml.xml');
  execSync('adb pull /sdcard/live_killed_xml.xml dump_live_killed.xml');

  console.log('=== TEST CAPTURE COMPLETE ===');
}

runLiveKilledTest();
