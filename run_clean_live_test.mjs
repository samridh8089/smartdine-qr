import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WAITER_PUSH_TOKEN = 'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]';
const PKG_NAME = 'com.smartdine.mobile';

async function sendPushNotification(title, body) {
  const start = Date.now();
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      to: WAITER_PUSH_TOKEN,
      sound: 'order_tune',
      priority: 'high',
      channelId: 'smartdine_waiter',
      title: title,
      body: body,
      data: { notificationType: 'CUSTOMER_CALL', timestamp: start },
      badge: 1,
      _displayInForeground: true
    }])
  });
  const json = await res.json();
  const latency = Date.now() - start;
  console.log(`Push sent: ${title} | Status:`, json, `| Latency: ${latency}ms`);
  return { json, latency };
}

async function executeCleanLiveTest() {
  console.log('=== STARTING CLEAN LIVE 3-STEP TEST ===\n');

  // STEP 1: FOREGROUND
  console.log('--- TEST 1: FOREGROUND (App Open on Screen) ---');
  execSync(`adb shell monkey -p ${PKG_NAME} 1`);
  await new Promise(r => setTimeout(r, 2000));
  await sendPushNotification('🔔 TEST 1: FOREGROUND ALERT', 'Table 1: Customer Call');

  await new Promise(r => setTimeout(r, 3000));

  // STEP 2: BACKGROUND (MINIMIZED)
  console.log('\n--- TEST 2: BACKGROUND (App Minimized to Home Screen) ---');
  execSync('adb shell input keyevent KEYCODE_HOME');
  await new Promise(r => setTimeout(r, 1500));
  await sendPushNotification('🚨 TEST 2: BACKGROUND ALERT', 'Table 2: Customer Call');

  await new Promise(r => setTimeout(r, 3000));

  // STEP 3: KILLED STATE (APP FORCE-STOPPED)
  console.log('\n--- TEST 3: KILLED STATE (App Process Removed/Killed) ---');
  execSync(`adb shell am force-stop ${PKG_NAME}`);
  await new Promise(r => setTimeout(r, 1500));
  await sendPushNotification('🚨 TEST 3: KILLED APP ALERT', 'Table 3: Customer Call');

  await new Promise(r => setTimeout(r, 1500));

  // Capture final screen & statusbar
  execSync('adb shell cmd statusbar expand-notifications');
  execSync('adb shell screencap -p /data/local/tmp/clean_test.png');
  execSync('adb pull /data/local/tmp/clean_test.png screenshot_clean_test.png');
  fs.copyFileSync('screenshot_clean_test.png', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_clean_test.png');

  console.log('\n=== CLEAN TEST COMPLETE & SCREENSHOT PULLED ===');
}

executeCleanLiveTest();
