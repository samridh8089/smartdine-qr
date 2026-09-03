import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf';
const DEVICE_SERIAL = 'RZCW80KCC8B';

// ACTUAL PUSH TOKEN FOR PHYSICAL DEVICE REGISTERED IN DB
const ACTUAL_TOKEN = 'ExponentPushToken[Y-KqkWOS3em9ahQAkskNBj]';

async function testActualTokenPush() {
  console.log('=== SENDING PUSH TO ACTUAL PHYSICAL DEVICE TOKEN ===\n');

  // 1. Force stop app to ensure Killed State
  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell am force-stop com.smartdine.mobile`);
  } catch (e) {}

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 2. Insert DB Call
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`[DB SUCCESS] Created Customer Call ID: ${call?.[0]?.id} for Table 1`);

  // 3. Dispatch Expo Push to ACTUAL Token
  const start = Date.now();
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      {
        to: ACTUAL_TOKEN,
        sound: 'order_tune',
        priority: 'high',
        channelId: 'smartdine_waiter_v2',
        title: `🔔 WAITER CALL ALERT (${now})`,
        body: `Table 1 requested assistance! (Shree Ram)`,
        data: { notificationType: 'CUSTOMER_CALL', requestId: call?.[0]?.id },
        badge: 1,
        ttl: 0,
        _displayInForeground: true
      }
    ])
  });

  const json = await res.json();
  const latency = Date.now() - start;
  console.log(`[FCM PUSH SUCCESS] Target Token: ${ACTUAL_TOKEN} | Latency: ${latency}ms | Response:`, JSON.stringify(json));

  // 4. Wait 1.5s and pull screenshot
  await new Promise(r => setTimeout(r, 1500));

  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell cmd statusbar expand-notifications`);
    execSync(`adb -s ${DEVICE_SERIAL} shell screencap -p /data/local/tmp/actual_token_killed.png`);
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/actual_token_killed.png screenshot_actual_token_killed.png`);
    fs.copyFileSync('screenshot_actual_token_killed.png', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_actual_token_killed.png');
    console.log('Successfully captured notification screenshot for actual token!');
  } catch (e) {
    console.log('Capture note:', e.message);
  }

  console.log('\n=== TEST COMPLETE ===');
}

testActualTokenPush();
