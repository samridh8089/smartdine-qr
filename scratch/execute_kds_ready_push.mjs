import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tiuwfhkrjvtkshebdwlp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function dispatchFCMNotification(restaurantId, title, body, roles) {
  try {
    let query = supabase
      .from('profiles')
      .select('push_token, role')
      .eq('restaurant_id', restaurantId)
      .not('push_token', 'is', null);

    if (roles && roles.length > 0) {
      query = query.in('role', roles);
    }

    const { data: staffProfiles } = await query;
    if (!staffProfiles || staffProfiles.length === 0) {
      console.log('[NotificationDiagnostics] Backend token lookup: NOT FOUND (0 staff profiles)');
      return;
    }

    const tokens = staffProfiles.map(p => p.push_token).filter(Boolean);
    if (tokens.length === 0) {
      console.log('[NotificationDiagnostics] Backend token lookup: NOT FOUND (0 valid tokens)');
      return;
    }

    console.log(`[NotificationDiagnostics] Backend token lookup: FOUND (${tokens.length} staff token(s))`);

    const messages = tokens.map(token => ({
      to: token,
      sound: 'order_tune',
      priority: 'high',
      channelId: 'smartdine-urgent-v3',
      title,
      body,
      data: { restaurantId, timestamp: Date.now() },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const resJson = await response.json();
    console.log('[Expo Push API] Response status:', response.status);
    console.log('[Expo Push API] Response body:', JSON.stringify(resJson, null, 2));
    console.log(`[FCM PUSH] Dispatched "${title}" to ${tokens.length} staff device(s).`);
  } catch (err) {
    console.error('Error dispatching FCM push notification:', err);
  }
}

async function run() {
  const orderId = '8f845a25-50c2-461d-83aa-ca99495a0745';
  const batchId = 'b581b3f7-2d83-4fad-aba7-6193ac8bddc1';
  const restaurantId = 'c1853f65-c10c-4f8a-b379-00a60f404ef9';

  console.log('[Test Ready] Transitioning Batch & Order to READY...');
  await supabase.from('order_batches').update({ status: 'ready', ready_at: new Date().toISOString() }).eq('id', batchId);
  await supabase.from('orders').update({ status: 'ready' }).eq('id', orderId);

  console.log('✅ Batch & Order set to READY in DB!');

  // Dispatch FCM Push Notification for READY status (same as db.ts line 1533)
  await dispatchFCMNotification(
    restaurantId,
    '🍽️ FOOD READY TO SERVE!',
    'Table 1 - Order #' + orderId.slice(-4).toUpperCase() + ' is ready!',
    ['waiter', 'owner', 'manager']
  );
}

run().catch(console.error);
