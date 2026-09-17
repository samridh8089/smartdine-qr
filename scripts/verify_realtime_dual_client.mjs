import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

global.WebSocket = WebSocket;

// Load env
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
let supabaseUrl = '', supabaseAnonKey = '';
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseAnonKey = trimmed.split('=')[1].trim();
}

const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

async function testRealtime() {
  console.log('--- Connecting Dual Realtime Clients ---');
  const mobileClient = createClient(supabaseUrl, supabaseAnonKey);
  const webClient = createClient(supabaseUrl, supabaseAnonKey);

  // Authenticate mobile client
  const { data: auth } = await mobileClient.auth.signInWithPassword({
    email: 'dsoni1281@gmail.com',
    password: '123456'
  });

  const channelName = `staff_${restaurantId}`;
  const mobileChannel = mobileClient.channel(channelName, {
    config: { broadcast: { self: true } }
  });

  const webChannel = webClient.channel(channelName, {
    config: { broadcast: { self: true } }
  });

  const results = [];

  const broadcastPromise = new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ success: false, reason: 'Timeout' });
    }, 10000);

    const startTime = Date.now();
    mobileChannel
      .on('broadcast', { event: 'staff-updated' }, (payload) => {
        const receivedAt = Date.now();
        const latency = receivedAt - (payload.payload?.timestamp || startTime);
        console.log(`[Mobile APK Listener] Received staff-updated! Action: ${payload.payload?.action}, Latency: ${latency}ms`);
        results.push({ action: payload.payload?.action, latency, payload: payload.payload });
        if (results.length >= 3) {
          clearTimeout(timeout);
          resolve({ success: true, results });
        }
      });

    mobileChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Mobile APK Listener] Subscribed to realtime channel.');
        webChannel.subscribe(async (webStatus) => {
          if (webStatus === 'SUBSCRIBED') {
            console.log('[Web Dashboard Broadcaster] Subscribed to realtime channel.');

            // Test 1: Create
            console.log('Broadcasting ACTION: create...');
            await webChannel.send({
              type: 'broadcast',
              event: 'staff-updated',
              payload: {
                action: 'create',
                restaurantId,
                staffProfile: { id: 'test-1', full_name: 'Vikram Singh', role: 'waiter' },
                timestamp: Date.now()
              }
            });

            await new Promise(r => setTimeout(r, 500));

            // Test 2: Update Role
            console.log('Broadcasting ACTION: update...');
            await webChannel.send({
              type: 'broadcast',
              event: 'staff-updated',
              payload: {
                action: 'update',
                restaurantId,
                staffProfile: { id: 'test-1', full_name: 'Vikram Singh', role: 'manager' },
                timestamp: Date.now()
              }
            });

            await new Promise(r => setTimeout(r, 500));

            // Test 3: Delete
            console.log('Broadcasting ACTION: delete...');
            await webChannel.send({
              type: 'broadcast',
              event: 'staff-updated',
              payload: {
                action: 'delete',
                restaurantId,
                staffProfile: { id: 'test-1' },
                timestamp: Date.now()
              }
            });
          }
        });
      }
    });
  });

  const outcome = await broadcastPromise;
  console.log('\n--- Realtime Dual-Device Synchronization Summary ---');
  console.table(results.map(r => ({
    Action: r.action,
    'Sync Latency (ms)': `${r.latency} ms`,
    'Status': r.latency < 2000 ? 'PASS (< 2s instant)' : 'WARN'
  })));

  mobileClient.removeChannel(mobileChannel);
  webClient.removeChannel(webChannel);
  process.exit(0);
}

testRealtime().catch(console.error);
