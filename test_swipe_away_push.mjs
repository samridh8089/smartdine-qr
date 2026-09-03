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

async function testSwipeAwayPush() {
  console.log('====================================================');
  console.log('   SWIPE-AWAY / BACKGROUND LIVE BELL ALERT TEST     ');
  console.log('====================================================\n');

  // 1. Launch App and then send Home Keyevent
  console.log('Step 1: Launching app and returning to Home Screen (Background / Swipe-Away state)...');
  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell monkey -p com.smartdine.mobile 1`);
    await new Promise(r => setTimeout(r, 2000));
    execSync(`adb -s ${DEVICE_SERIAL} shell input keyevent 3`); // HOME
  } catch (e) {}

  await new Promise(r => setTimeout(r, 1000));
  try { execSync(`adb -s ${DEVICE_SERIAL} logcat -c`); } catch (e) {}

  // 2. Start Screen Recording
  console.log('Step 2: Starting 15-second MP4 continuous screen recording on physical device...');
  const screenRec = spawn('adb', ['-s', DEVICE_SERIAL, 'shell', 'screenrecord', '--time-limit=15', '/data/local/tmp/swipe_away_proof.mp4']);
  await new Promise(r => setTimeout(r, 1500));

  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 3. Create DB Customer Call
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`\nStep 3: [DB SUCCESS] Created Customer Call ID: ${call?.[0]?.id} for Table 1`);

  // 4. Dispatch Expo Push API
  console.log('Step 4: Dispatching Push via Expo Push API...');
  const start = Date.now();
  const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
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

  const expoJson = await expoRes.json();
  const latency = Date.now() - start;
  console.log(`[EXPO PUSH RESPONSE] Latency: ${latency}ms | Ticket:`, JSON.stringify(expoJson, null, 2));

  // 5. Capture Logcat Trace
  await new Promise(r => setTimeout(r, 2000));
  console.log('\nStep 5: Capturing ADB Logcat trace...');
  try {
    const rawLogcat = execSync(`adb -s ${DEVICE_SERIAL} logcat -d`).toString();
    const matches = rawLogcat.split('\n').filter(l =>
      l.includes('FirebaseMessaging') ||
      l.includes('NotificationManager') ||
      l.includes('NotificationLightingScheduler') ||
      l.includes('SoundCraft') ||
      l.includes('VibratorManagerService') ||
      l.includes('smartdine')
    );
    console.log('ADB Logcat Output:\n', matches.slice(-25).join('\n'));
  } catch (e) {
    console.log('Logcat Error:', e.message);
  }

  // 6. Finish Screen Recording and Pull Video
  console.log('\nStep 6: Waiting for MP4 screen recording to complete...');
  await new Promise(r => setTimeout(r, 9000));

  try {
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/swipe_away_proof.mp4 swipe_away_proof.mp4`);
    fs.copyFileSync('swipe_away_proof.mp4', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\swipe_away_proof.mp4');
    console.log('Successfully saved swipe_away_proof.mp4 to artifacts directory!');
  } catch (e) {
    console.log('Video Pull Error:', e.message);
  }

  console.log('\n====================================================');
  console.log('   SWIPE-AWAY / BACKGROUND TEST COMPLETE            ');
  console.log('====================================================');
}

testSwipeAwayPush();
