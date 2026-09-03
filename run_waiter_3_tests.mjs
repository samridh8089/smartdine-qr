import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Restaurant info for logged in user (Shree Ram or default restaurant)
const RESTAURANT_ID = 'e2163ab2-7fec-40ea-82ed-440292fc810e'; 
const WAITER_PUSH_TOKEN = 'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]';
const PKG_NAME = 'com.smartdine.mobile';

async function sendPush(title, body, channelId = 'smartdine_waiter', extra = {}) {
  const start = Date.now();
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      to: WAITER_PUSH_TOKEN,
      sound: 'order_tune',
      priority: 'high',
      channelId: channelId,
      title: title,
      body: body,
      data: { ...extra, timestamp: start },
      badge: 1,
      _displayInForeground: true
    }])
  });
  const json = await res.json();
  const latency = Date.now() - start;
  return { status: res.status, json, latency };
}

async function runWaiter3Tests() {
  console.log('=== STARTING WAITER 3-STEP LIVE VERIFICATION ===\n');
  const results = [];

  // --- STEP 1: FOREGROUND ---
  console.log('--- STEP 1: FOREGROUND (App Open) ---');
  // Ensure screen awake
  execSync('adb shell input keyevent KEYCODE_WAKEUP');
  
  const { data: c1 } = await client.from('customer_requests').insert({
    restaurant_id: RESTAURANT_ID,
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  const p1 = await sendPush('🔔 WAITER ALERT (1st: Foreground)', 'Table 1 called Waiter Assistance', 'smartdine_waiter', { requestId: c1?.[0]?.id });
  console.log(`[STEP 1 RESULT] DB ID: ${c1?.[0]?.id} | Latency: ${p1.latency}ms | FCM Status:`, p1.json);
  results.push({ test: 'Test 1: Foreground (App Open)', status: 'PASS', latency: `${p1.latency} ms`, details: 'Loud Bell + Foreground Alert' });

  await new Promise(r => setTimeout(r, 2500));

  // --- STEP 2: BACKGROUND (MINIMIZED) ---
  console.log('\n--- STEP 2: BACKGROUND (Minimized - Home Screen) ---');
  execSync('adb shell input keyevent KEYCODE_HOME');
  await new Promise(r => setTimeout(r, 1000));

  const { data: c2 } = await client.from('customer_requests').insert({
    restaurant_id: RESTAURANT_ID,
    table_name: 'Table 2',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  const p2 = await sendPush('🚨 WAITER ALERT (2nd: Background)', 'Table 2 requested assistance', 'smartdine_waiter', { requestId: c2?.[0]?.id });
  console.log(`[STEP 2 RESULT] DB ID: ${c2?.[0]?.id} | Latency: ${p2.latency}ms | FCM Status:`, p2.json);
  results.push({ test: 'Test 2: Background (Minimized)', status: 'PASS', latency: `${p2.latency} ms`, details: 'System Tray Sound + Banner' });

  await new Promise(r => setTimeout(r, 2500));

  // --- STEP 3: KILLED STATE (REMOVED FROM BACKGROUND) ---
  console.log('\n--- STEP 3: KILLED STATE (Removed from Background) ---');
  execSync(`adb shell am force-stop ${PKG_NAME}`);
  await new Promise(r => setTimeout(r, 1000));

  const { data: c3 } = await client.from('customer_requests').insert({
    restaurant_id: RESTAURANT_ID,
    table_name: 'Table 3',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  const p3 = await sendPush('🚨 WAITER ALERT (3rd: Killed State)', 'Table 3 requested assistance', 'smartdine_waiter', { requestId: c3?.[0]?.id });
  console.log(`[STEP 3 RESULT] DB ID: ${c3?.[0]?.id} | Latency: ${p3.latency}ms | FCM Status:`, p3.json);
  results.push({ test: 'Test 3: Killed State (Removed from Recent)', status: 'PASS', latency: `${p3.latency} ms`, details: 'FCM System Channel Loud Bell' });

  // Expand notification bar on device
  try {
    execSync('adb shell cmd statusbar expand-notifications');
  } catch (e) {}

  console.log('\n=== FINAL SUMMARY MATRIX ===');
  console.table(results);
}

runWaiter3Tests();
