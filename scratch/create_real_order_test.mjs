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
  const restaurantId = 'c1853f65-c10c-4f8a-b379-00a60f404ef9';
  const tableId = 'c0ef9a09-f509-4739-8e6b-921aa54f0a9f';

  console.log('[Test Order] Inserting new order into DB...');
  const { data: newOrder, error: orderErr } = await supabase
    .from('orders')
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      table_name: 'Table 1',
      status: 'new',
      special_instructions: 'KDS Background Notification Test Order',
      subtotal: 250,
      gst: 12.5,
      service_charge: 0,
      total: 262.5,
      order_type: 'dine_in'
    })
    .select()
    .single();

  if (orderErr) {
    console.error('Order creation failed:', orderErr.message);
    return;
  }

  console.log('✅ Real Order Created:', newOrder.id);

  // Insert Order Batch
  const { data: newBatch, error: batchErr } = await supabase
    .from('order_batches')
    .insert({
      order_id: newOrder.id,
      batch_number: 1,
      status: 'new',
      special_instructions: 'KDS Background Notification Test Order'
    })
    .select()
    .single();

  if (batchErr) {
    console.error('Batch creation failed:', batchErr.message);
    return;
  }

  console.log('✅ Order Batch 1 Created:', newBatch.id);

  // Dispatch FCM Push Notification (same as db.createOrder line 1036)
  await dispatchFCMNotification(
    restaurantId,
    '🔔 NEW KITCHEN ORDER!',
    `Table 1 • Dine-in • Total: ₹262.5`,
    ['kitchen', 'waiter', 'owner', 'manager']
  );
}

run().catch(console.error);
