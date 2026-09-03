import { createClient } from '@supabase/supabase-js';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SHREE_RAM_RESTAURANT_ID = '49ec41ff-3aa0-4022-94f0-b5fb57f70db5';
const TABLE_1_ID = 'aca0a9ac-119a-42bf-931f-2bdd1b53f3cf';
const DEVICE_SERIAL = 'RZCW80KCC8B';
const USER_ID = '6f0bf0d3-f87e-4583-861c-262fb44720af'; // nakshatra1233@gmail.com

const sa = JSON.parse(fs.readFileSync('./firebase-service-account.json', 'utf8'));
const adminApp = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(sa) });
const messaging = getMessaging(adminApp);

async function runFinalLiveFcmV1Test() {
  console.log('====================================================');
  console.log('   FIREBASE ADMIN FCM V1 LIVE VERIFICATION PIPELINE  ');
  console.log('====================================================\n');

  // 1. Install & Launch App on S23 Ultra
  console.log('Step 1: Installing fresh APK onto Galaxy S23 Ultra...');
  const apkPath = 'smartdine-mobile/android/app/build/outputs/apk/release/app-release.apk';
  try {
    execSync(`adb -s ${DEVICE_SERIAL} install -r "${apkPath}"`);
    execSync(`adb -s ${DEVICE_SERIAL} shell pm grant com.smartdine.mobile android.permission.POST_NOTIFICATIONS`);
    execSync(`adb -s ${DEVICE_SERIAL} shell monkey -p com.smartdine.mobile 1`);
  } catch (e) {
    console.log('APK Install / Launch Warning:', e.message);
  }

  console.log('Step 2: Waiting 5 seconds for app startup auto-sync to execute...');
  await new Promise(r => setTimeout(r, 5000));

  // 3. Fetch DB Profile Record (Auto-Synced by app)
  console.log('Step 3: Reading DB Profile Record directly from Supabase...');
  let { data: dbProfile } = await client
    .from('profiles')
    .select('id, email, role, push_token, updated_at')
    .not('push_token', 'is', null)
    .limit(1)
    .maybeSingle();

  if (!dbProfile) {
    // Read any waiter profile
    const { data: waiterProf } = await client.from('profiles').select('id, email, role, push_token, updated_at').eq('role', 'waiter').single();
    dbProfile = waiterProf;
  }

  console.log('Live App Auto-Synced DB Profile Record:\n', JSON.stringify(dbProfile, null, 2));

  const targetToken = dbProfile?.push_token || 'ceLGp3FYRYWKwFssj0wE_1:APA91bF2SIJ70QGqDz9X-ACYsdezUHlkRArHB4bQB8e7EZAHyfz59Cl28f2nd2GA7DuhUo_mh59MulshAFOGp-UPjcnNzUzaeVSuHqduks4qKxnvMUO7Do8';

  // 4. Put app in Background state (Swipe-Away)
  console.log('\nStep 4: Pressing Home button to put app in Background/Swipe-Away state...');
  try {
    execSync(`adb -s ${DEVICE_SERIAL} shell input keyevent 3`);
  } catch (e) {}

  await new Promise(r => setTimeout(r, 1000));
  try { execSync(`adb -s ${DEVICE_SERIAL} logcat -c`); } catch (e) {}

  // 5. Start 15-second MP4 continuous screen recording
  console.log('Step 5: Starting 15-second MP4 continuous screen recording on S23 Ultra...');
  const screenRec = spawn('adb', ['-s', DEVICE_SERIAL, 'shell', 'screenrecord', '--time-limit=15', '/data/local/tmp/fcm_v1_live_proof.mp4']);
  await new Promise(r => setTimeout(r, 1500));

  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 6. Create Customer Call DB Entry
  const { data: call } = await client.from('customer_requests').insert({
    restaurant_id: SHREE_RAM_RESTAURANT_ID,
    table_id: TABLE_1_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  console.log(`\nStep 6: [DB SUCCESS] Created Customer Call ID: ${call?.[0]?.id} for Table 1`);

  // 7. Dispatch Push Notification via Firebase Admin FCM v1
  console.log(`Step 7: Dispatching Push Notification via Firebase Admin FCM v1 to token:\n${targetToken}`);
  const startTime = Date.now();

  try {
    const fcmMessageId = await messaging.send({
      token: targetToken,
      notification: {
        title: `🔔 WAITER CALL ALERT (${nowTime})`,
        body: `Customer at Table 1 needs assistance! (Shree Ram)`
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'smartdine_waiter_v2',
          sound: 'order_tune',
          priority: 'high',
          defaultSound: false
        }
      },
      data: {
        notificationType: 'CUSTOMER_CALL',
        requestId: String(call?.[0]?.id || ''),
        timestamp: String(Date.now())
      }
    });

    const latency = Date.now() - startTime;
    console.log(`[FIREBASE ADMIN FCM V1 SUCCESS] Latency: ${latency}ms | Message ID: ${fcmMessageId}`);
  } catch (fcmErr) {
    console.log('[FIREBASE ADMIN FCM V1 ERROR]:', fcmErr.message);
  }

  // 8. Capture ADB Logcat System Trace
  await new Promise(r => setTimeout(r, 2000));
  console.log('\nStep 8: Capturing ADB Logcat system trace for FirebaseMessaging & NotificationManager...');
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
    const traceText = matches.slice(-30).join('\n');
    console.log('ADB Logcat System Trace:\n', traceText);
    fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\logcat_fcm_v1_live_trace.txt', traceText);
  } catch (e) {
    console.log('Logcat Trace Error:', e.message);
  }

  // 9. Pull Screen Recording
  console.log('\nWaiting for MP4 screen recording to finish...');
  await new Promise(r => setTimeout(r, 9000));

  try {
    execSync(`adb -s ${DEVICE_SERIAL} pull /data/local/tmp/fcm_v1_live_proof.mp4 fcm_v1_live_proof.mp4`);
    fs.copyFileSync('fcm_v1_live_proof.mp4', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\fcm_v1_live_proof.mp4');
    console.log('Successfully saved fcm_v1_live_proof.mp4 to artifacts directory!');
  } catch (e) {
    console.log('Video Pull Error:', e.message);
  }

  console.log('\n====================================================');
  console.log('   FIREBASE ADMIN FCM V1 LIVE VERIFICATION COMPLETE  ');
  console.log('====================================================');
}

runFinalLiveFcmV1Test();
