import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf';
const DEVICE_SERIAL = 'RZCW80KCC8B';

const PUSH_TOKENS = [
  'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]',
  'ExponentPushToken[zLCv9lGcbCydfqOfpBzjY0]'
];

async function triggerHeadsUpTest() {
  console.log('=== STARTING HEADS-UP KILLED STATE TEST ===\n');

  // 1. Press Home button on device to ensure home screen
  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell input keyevent 3`);
  } catch (e) {}

  await new Promise(r => setTimeout(r, 1000));

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 2. Insert DB Record
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`[DB RECORD CREATED] ID: ${call?.[0]?.id}`);

  // 3. Send High Priority Push
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
          title: `🔔 WAITER CALL ALERT: Table 1 (${now})`,
          body: `Customer at Table 1 needs assistance! (Shree Ram)`,
          data: { notificationType: 'CUSTOMER_CALL', requestId: call?.[0]?.id },
          badge: 1,
          ttl: 0,
          _displayInForeground: true
        }
      ])
    });

    const json = await res.json();
    console.log(`Push response for ${token}:`, JSON.stringify(json));
  }

  // 4. Capture clean screen
  await new Promise(r => setTimeout(r, 1500));

  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell screencap -p /data/local/tmp/headsup.png`);
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/headsup.png screenshot_headsup.png`);
    fs.copyFileSync('screenshot_headsup.png', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_headsup.png');
    console.log('Successfully captured screen!');
  } catch (e) {
    console.log('Capture note:', e.message);
  }

  console.log('\n=== TEST COMPLETE ===');
}

triggerHeadsUpTest();
