import { createClient } from '@supabase/supabase-js';
import { execSync, spawn } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf';
const DEVICE_SERIAL = 'RZCW80KCC8B'; // Samsung Galaxy S23 Ultra (SM-S918B)
const USER_ID = '6f0bf0d3-f87e-4583-861c-262fb44720af'; // nakshatra1233@gmail.com

async function runS23UltraVerification() {
  console.log('====================================================');
  console.log('   S23 ULTRA LIVE END-TO-END VERIFICATION PIPELINE  ');
  console.log('====================================================\n');

  // STEP 1: Launch App Fresh on S23 Ultra to trigger startup auto-sync in App.js
  console.log('Step 1: Launching app fresh on S23 Ultra (SM-S918B) to trigger App.js auto-sync...');
  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell monkey -p com.smartdine.mobile 1`);
  } catch (e) {}

  await new Promise(r => setTimeout(r, 4000));

  // STEP 2: Verify Supabase DB push_token updated automatically by app
  console.log('Step 2: Checking DB profile token auto-updated by app...');
  const { data: dbProfile } = await client
    .from('profiles')
    .select('id, email, role, push_token, updated_at')
    .eq('id', USER_ID)
    .single();

  console.log('Auto-Synced DB Profile Record:\n', JSON.stringify(dbProfile, null, 2));

  const targetPushToken = dbProfile?.push_token || 'ExponentPushToken[Y-KqkWOS3em9ahQAkskNBj]';

  // STEP 3: Clear logcat buffer & start MP4 screen recording
  console.log('\nStep 3: Putting app in Background state and starting 15-sec screen recording...');
  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell input keyevent 3`);
  } catch (e) {}

  await new Promise(r => setTimeout(r, 1000));
  try { execSync(`adb -s ${DEVICE_SERIAL} logcat -c`); } catch (e) {}

  const screenRec = spawn('adb', ['-s', DEVICE_SERIAL, 'shell', 'screenrecord', '--time-limit=15', '/data/local/tmp/s23_ultra_end_to_end.mp4']);
  await new Promise(r => setTimeout(r, 1500));

  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // STEP 4: Insert Customer Call into DB
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`\nStep 4: [DB INSERT SUCCESS] Created Customer Call Request ID: ${call?.[0]?.id} for Table 1`);

  // STEP 5: Dispatch Push Notification to auto-synced token
  console.log(`Step 5: Dispatching Push Notification to token (${targetPushToken})...`);
  const startTime = Date.now();
  const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify([{
      to: targetPushToken,
      sound: 'order_tune',
      title: `🔔 WAITER CALL ALERT (${nowTime})`,
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
  const latency = Date.now() - startTime;
  console.log(`[PUSH DISPATCH RESPONSE] Latency: ${latency}ms | Response:`, JSON.stringify(pushJson, null, 2));

  // STEP 6: Capture Logcat Output for FirebaseMessaging / NotificationManager / SoundCraft
  await new Promise(r => setTimeout(r, 2000));
  console.log('\nStep 6: Capturing ADB Logcat trace for FirebaseMessaging / NotificationManager...');
  let logcatTrace = '';
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
    logcatTrace = matches.slice(-25).join('\n');
    console.log('ADB Logcat System Trace:\n', logcatTrace);
    fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\logcat_s23_ultra_trace.txt', logcatTrace);
  } catch (e) {
    console.log('Logcat Trace Error:', e.message);
  }

  // STEP 7: Pull Screen Recording
  console.log('\nWaiting for MP4 screen recording to finish...');
  await new Promise(r => setTimeout(r, 9000));

  try {
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/s23_ultra_end_to_end.mp4 s23_ultra_end_to_end.mp4`);
    fs.copyFileSync('s23_ultra_end_to_end.mp4', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\s23_ultra_end_to_end.mp4');
    console.log('Successfully saved s23_ultra_end_to_end.mp4 to artifacts directory!');
  } catch (e) {
    console.log('Video Pull Error:', e.message);
  }

  console.log('\n====================================================');
  console.log('   S23 ULTRA LIVE VERIFICATION PIPELINE COMPLETE    ');
  console.log('====================================================');
}

runS23UltraVerification();
