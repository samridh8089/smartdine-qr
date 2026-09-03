import { createClient } from '@supabase/supabase-js';
import { execSync, spawn } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf';
const DEVICE_SERIAL = 'RZCW80KCC8B';
const EXPO_PUSH_TOKEN = 'ExponentPushToken[Y-KqkWOS3em9ahQAkskNBj]';

async function runKilledStateLiveTest() {
  console.log('====================================================');
  console.log('   USER KILLED STATE LIVE BELL ALERT TEST           ');
  console.log('====================================================\n');

  console.log(`Target Device: ${DEVICE_SERIAL}`);
  console.log(`Push Token: ${EXPO_PUSH_TOKEN}`);

  // Clear logcat for fresh trace
  try { execSync(`adb -s ${DEVICE_SERIAL} logcat -c`); } catch (e) {}

  // 1. Start 15-second MP4 screen recording on phone
  console.log('\nStep 1: Starting 15-second MP4 continuous screen recording on physical phone...');
  const screenRec = spawn('adb', ['-s', DEVICE_SERIAL, 'shell', 'screenrecord', '--time-limit=15', '/data/local/tmp/killed_state_live_proof.mp4']);
  await new Promise(r => setTimeout(r, 1500));

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 2. Create DB Customer Call
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`\nStep 2: [DB SUCCESS] Created Customer Call ID: ${call?.[0]?.id} for Table 1`);

  // 3. Dispatch Push Notification via Expo Push API
  console.log('Step 3: Dispatching Push Notification to user killed state app...');
  const start = Date.now();
  const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify([{
      to: EXPO_PUSH_TOKEN,
      sound: 'order_tune',
      title: `🔔 WAITER CALL ALERT (${now})`,
      body: `Customer at Table 1 needs assistance! (Shree Ram)`,
      data: {
        notificationType: 'CUSTOMER_CALL',
        requestId: call?.[0]?.id,
        timestamp: String(Date.now())
      },
      priority: 'high',
      channelId: 'smartdine_waiter_v2',
      _displayInForeground: true
    }])
  });

  const pushJson = await pushRes.json();
  const latency = Date.now() - start;
  console.log(`[PUSH DISPATCH RESPONSE] Latency: ${latency}ms | Response:`, JSON.stringify(pushJson, null, 2));

  // 4. Capture Logcat Trace
  await new Promise(r => setTimeout(r, 2000));
  console.log('\nStep 4: Capturing ADB Logcat trace for Killed State delivery...');
  try {
    const rawLogcat = execSync(`adb -s ${DEVICE_SERIAL} logcat -d`).toString();
    const matches = rawLogcat.split('\n').filter(l =>
      l.includes('FirebaseMessaging') ||
      l.includes('NotificationManager') ||
      l.includes('SoundCraft') ||
      l.includes('VibratorManagerService') ||
      l.includes('EdgeLightingScheduler') ||
      l.includes('smartdine')
    );
    const traceText = matches.slice(-25).join('\n');
    console.log('ADB Logcat Output:\n', traceText);
    fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\logcat_killed_state_live.txt', traceText);
  } catch (e) {
    console.log('Logcat Trace Error:', e.message);
  }

  // 5. Pull Screen Recording
  console.log('\nWaiting for MP4 screen recording to complete...');
  await new Promise(r => setTimeout(r, 9000));

  try {
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/killed_state_live_proof.mp4 killed_state_live_proof.mp4`);
    fs.copyFileSync('killed_state_live_proof.mp4', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\killed_state_live_proof.mp4');
    console.log('Successfully saved killed_state_live_proof.mp4 to artifacts directory!');
  } catch (e) {
    console.log('Video Pull Error:', e.message);
  }

  console.log('\n====================================================');
  console.log('   USER KILLED STATE LIVE TEST COMPLETE             ');
  console.log('====================================================');
}

runKilledStateLiveTest();
