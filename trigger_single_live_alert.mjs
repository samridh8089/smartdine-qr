import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';

const SUPABASE_URL = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PUSH_TOKENS = [
  'ExponentPushToken[Afc0VyMBwcJB2HD6wCdZTJ]',
  'ExponentPushToken[_dReUUJFyPKa0KD48_ssEq]'
];

async function triggerLiveAlert() {
  console.log('=== TRIGGERING LIVE PUSH NOTIFICATION ALERT ===');
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // 1. Insert DB record
  const { data: req } = await client.from('customer_requests').insert({
    restaurant_id: 'e2163ab2-7fec-40ea-82ed-440292fc810e',
    table_name: 'Table 1',
    type: 'call_waiter',
    status: 'pending',
    created_at: new Date().toISOString()
  }).select();

  // 2. Dispatch FCM Push Notifications
  for (const token of PUSH_TOKENS) {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        to: token,
        sound: 'default',
        priority: 'high',
        channelId: 'smartdine_waiter',
        title: `🚨 LOUD BELL ALERT (${now})`,
        body: `Table 1 requested Waiter assistance at ${now}`,
        data: {
          notificationType: 'CUSTOMER_CALL',
          requestId: req?.[0]?.id,
          timestamp: Date.now()
        },
        badge: 1,
        _displayInForeground: true
      }])
    });
    const json = await res.json();
    console.log(`Push sent to ${token}:`, json);
  }

  // 3. Wait 1 second
  await new Promise(r => setTimeout(r, 1000));

  // 4. Expand status bar notification shade on device
  try {
    execSync('adb shell cmd statusbar expand-notifications');
    execSync('adb shell screencap -p /data/local/tmp/shade.png');
    execSync('adb pull /data/local/tmp/shade.png screenshot_live_shade.png');
    fs.copyFileSync('screenshot_live_shade.png', 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\af631f2d-472c-4b1a-a400-9353bd6e2483\\screenshot_live_shade.png');
    console.log('Successfully captured and copied live notification shade screenshot!');
  } catch (e) {
    console.log('Capture error:', e.message);
  }
}

triggerLiveAlert();
