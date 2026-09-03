import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf';
const PKG_NAME = 'com.smartdine.mobile';

const PUSH_TOKENS = [
  'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]',
  'ExponentPushToken[zLCv9lGcbCydfqOfpBzjY0]'
];

async function triggerUltimateKilledPush() {
  console.log('=== ULTIMATE KILLED STATE PUSH TEST ===\n');

  // Force stop app
  try {
    execSync(`adb shell am force-stop ${PKG_NAME}`);
  } catch (e) {}

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // DB Insert
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`Created DB Customer Call ID: ${call?.[0]?.id}`);

  // Send push payloads to both registered tokens
  for (const token of PUSH_TOKENS) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          to: token,
          sound: 'order_tune',
          priority: 'high',
          channelId: 'smartdine_waiter',
          title: `🔔 LOUD BELL ALERT (Table 1 - ${now})`,
          body: `Customer at Table 1 requested Waiter assistance!`,
          data: { notificationType: 'CUSTOMER_CALL', requestId: call?.[0]?.id, timestamp: Date.now() },
          badge: 1,
          ttl: 0,
          _displayInForeground: true
        },
        {
          to: token,
          sound: 'default',
          priority: 'high',
          channelId: 'smartdine_waiter',
          title: `🚨 WAITER CALL (${now})`,
          body: `Table 1 requested assistance! (Shree Ram)`,
          data: { notificationType: 'CUSTOMER_CALL', requestId: call?.[0]?.id, timestamp: Date.now() },
          badge: 1,
          ttl: 0,
          _displayInForeground: true
        }
      ])
    });

    const json = await res.json();
    console.log(`Push sent to ${token}:`, JSON.stringify(json));
  }

  await new Promise(r => setTimeout(r, 2000));

  try {
    execSync('adb shell cmd statusbar expand-notifications');
    execSync('adb shell screencap -p /data/local/tmp/ultimate_killed.png');
    execSync('adb pull /data/local/tmp/ultimate_killed.png screenshot_ultimate_killed.png');
    fs.copyFileSync('screenshot_ultimate_killed.png', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_ultimate_killed.png');
    console.log('Successfully saved ultimate killed state screenshot!');
  } catch (e) {
    console.log('Screenshot note:', e.message);
  }
}

triggerUltimateKilledPush();
