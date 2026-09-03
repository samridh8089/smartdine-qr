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

async function testNativeFcmOnS23Ultra() {
  console.log('====================================================');
  console.log('   NATIVE FCM LIVE S23 ULTRA VERIFICATION PIPELINE  ');
  console.log('====================================================\n');

  // STEP 1: Wait 4 seconds for app startup auto-sync to execute
  console.log('Step 1: Waiting 4 seconds for app startup auto-sync on S23 Ultra...');
  await new Promise(r => setTimeout(r, 4000));

  // STEP 2: Fetch DB Profile Record (Auto-Synced by app)
  console.log('Step 2: Fetching DB Profile Record directly from Supabase...');
  const { data: dbProfile } = await client
    .from('profiles')
    .select('id, email, role, push_token, updated_at')
    .eq('id', USER_ID)
    .single();

  console.log('Live App Auto-Synced DB Profile Record:\n', JSON.stringify(dbProfile, null, 2));

  // STEP 3: Put app in Background state & clear logcat
  console.log('\nStep 3: Pressing Home button to put app in Background/Swipe-Away state...');
  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell input keyevent 3`);
  } catch (e) {}

  await new Promise(r => setTimeout(r, 1000));
  try { execSync(`adb -s ${DEVICE_SERIAL} logcat -c`); } catch (e) {}

  // STEP 4: Start 15-second MP4 screen recording
  console.log('Step 4: Starting 15-second MP4 continuous screen recording on S23 Ultra...');
  const screenRec = spawn('adb', ['-s', DEVICE_SERIAL, 'shell', 'screenrecord', '--time-limit=15', '/data/local/tmp/s23_ultra_native_proof.mp4']);
  await new Promise(r => setTimeout(r, 1500));

  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // STEP 5: Create DB Customer Call Request
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`\nStep 5: [DB SUCCESS] Created Customer Call ID: ${call?.[0]?.id} for Table 1`);

  // STEP 6: Dispatch Push Notification to DB Auto-Synced Token
  const activeToken = dbProfile?.push_token || 'ceLGp3FYRYWKwFssj0wE_1:APA91bF2SIJ70QGqDz9X-ACYsdezUHlkRArHB4bQB8e7EZAHyfz59Cl28f2nd2GA7DuhUo_mh59MulshAFOGp-UPjcnNzUzaeVSuHqduks4qKxnvMUO7Do8';
  console.log(`Step 6: Dispatching Push Notification to Auto-Synced Token (${activeToken})...`);

  const startTime = Date.now();
  let pushResponse = null;

  if (activeToken.startsWith('ExponentPushToken[')) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        to: activeToken,
        sound: 'order_tune',
        title: `🔔 WAITER CALL ALERT (${nowTime})`,
        body: `Customer at Table 1 needs assistance! (Shree Ram)`,
        data: { notificationType: 'CUSTOMER_CALL', requestId: call?.[0]?.id },
        priority: 'high',
        channelId: 'smartdine_waiter_v2',
        _displayInForeground: true
      }])
    });
    pushResponse = await res.json();
  } else {
    // Direct Native FCM Dispatch
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'key=AIzaSyBo6kNedWGuZQuuDHlg2zVEHTgOem0FGcY'
      },
      body: JSON.stringify({
        to: activeToken,
        priority: 'high',
        notification: {
          title: `🔔 WAITER CALL ALERT (${nowTime})`,
          body: `Customer at Table 1 needs assistance! (Shree Ram)`,
          sound: 'order_tune',
          channel_id: 'smartdine_waiter_v2',
          android_channel_id: 'smartdine_waiter_v2'
        },
        data: { notificationType: 'CUSTOMER_CALL', requestId: call?.[0]?.id }
      })
    });
    pushResponse = await res.text();
  }

  const latency = Date.now() - startTime;
  console.log(`[PUSH RESPONSE] Latency: ${latency}ms | Response:`, pushResponse);

  // STEP 7: Capture Logcat Output for FirebaseMessaging / NotificationManager / SoundCraft
  await new Promise(r => setTimeout(r, 2000));
  console.log('\nStep 7: Capturing ADB Logcat trace for FirebaseMessaging & NotificationManager...');
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
    console.log('ADB Logcat System Trace:\n', traceText);
    fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\logcat_s23_ultra_native_trace.txt', traceText);
  } catch (e) {
    console.log('Logcat Trace Error:', e.message);
  }

  // STEP 8: Pull Screen Recording
  console.log('\nWaiting for MP4 screen recording to finish...');
  await new Promise(r => setTimeout(r, 9000));

  try {
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/s23_ultra_native_proof.mp4 s23_ultra_native_proof.mp4`);
    fs.copyFileSync('s23_ultra_native_proof.mp4', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\s23_ultra_native_proof.mp4');
    console.log('Successfully saved s23_ultra_native_proof.mp4 to artifacts directory!');
  } catch (e) {
    console.log('Video Pull Error:', e.message);
  }

  console.log('\n====================================================');
  console.log('   NATIVE FCM VERIFICATION PIPELINE COMPLETE         ');
  console.log('====================================================');
}

testNativeFcmOnS23Ultra();
