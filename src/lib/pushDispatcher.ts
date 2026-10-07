import { supabase } from './supabase';
import { logSystemEvent, getOrderCorrelationId } from './systemEventLogger';

export async function dispatchFCMNotification(
  restaurantId: string,
  title: string,
  body: string,
  roles?: string[],
  extraData?: Record<string, any>,
  tableId?: string
) {
  try {
    const targetRoles = roles || ['kitchen', 'waiter', 'owner', 'manager'];

    // 1. Client-Side Browser Fallback: proxy to Next.js API endpoint to bypass CORS
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/push/send-native', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId,
            title,
            body,
            roles: targetRoles,
            extraData,
            tableId
          })
        });
      } catch (clientErr) {
        console.warn('[pushDispatcher] Client proxy notice:', clientErr);
      }
      return;
    }

    // 2. Dispatch Web Push for backgrounded Web Browser tabs
    try {
      const { sendWebPushToRestaurant } = await import('./webPush');
      sendWebPushToRestaurant(restaurantId, targetRoles, {
        title,
        body,
        url: targetRoles.includes('kitchen') ? '/dashboard/kds' : '/dashboard/orders',
        eventId: extraData?.orderId || extraData?.requestId || extraData?.batchId || `evt-${Date.now()}`,
        restaurantId,
        tableId,
        timestamp: Date.now(),
        ...(extraData || {})
      }).catch(() => {});
    } catch (_) {}

    // 3. Emit system audit log
    const pushOrderId = extraData?.orderId || null;
    const pushCorrId = pushOrderId
      ? getOrderCorrelationId(pushOrderId)
      : `corr_PUSH_${Date.now()}`;
    logSystemEvent({
      restaurantId,
      correlationId: pushCorrId,
      orderId: pushOrderId,
      actorType: 'system',
      eventType: 'push_sent',
      sourceNode: 'kitchen_queue',
      targetNode: 'push_notifications',
      metadata: { title, roles: targetRoles, requestId: extraData?.requestId || null },
    }).catch(() => {});

    const expandedRoles = new Set<string>();
    targetRoles.forEach(r => {
      const norm = (r || '').toLowerCase().trim();
      expandedRoles.add(norm);
      expandedRoles.add(norm.charAt(0).toUpperCase() + norm.slice(1));
      expandedRoles.add(norm.toUpperCase());
      if (norm === 'kitchen') {
        expandedRoles.add('kds');
        expandedRoles.add('KDS');
        expandedRoles.add('kitchen_staff');
        expandedRoles.add('Kitchen_Staff');
      }
    });
    expandedRoles.add('supervisor');
    expandedRoles.add('Supervisor');

    const { data: staffProfiles, error: profileErr } = await supabase
      .from('profiles')
      .select('id, push_token, role')
      .eq('restaurant_id', restaurantId)
      .not('push_token', 'is', null)
      .in('role', Array.from(expandedRoles));

    if (profileErr || !staffProfiles || staffProfiles.length === 0) {
      console.log(`[PushDispatcher] Backend token lookup: 0 matching profiles for restaurant ${restaurantId}`);
      return;
    }

    // 5. Scoped filtering for table assignments & Owner bell mute preference
    let targetProfiles = staffProfiles;
    try {
      const { data: restData } = await supabase
        .from('restaurants')
        .select('settings')
        .eq('id', restaurantId)
        .maybeSingle();

      const ownerBellEnabled = restData?.settings?.owner_bell_enabled !== false;
      if (!ownerBellEnabled) {
        // Owner has muted bells / order alerts, exclude owner from push notifications
        targetProfiles = targetProfiles.filter(p => (p.role || '').toLowerCase().trim() !== 'owner');
      }

      if (tableId) {
        const assignments: any[] = restData?.settings?.table_assignments || [];
        const activeAssignedWaiters = assignments
          .filter(a => a.active !== false && a.table_id === tableId)
          .map(a => a.waiter_id);

        if (activeAssignedWaiters.length > 0) {
          targetProfiles = targetProfiles.filter(p => {
            const normRole = (p.role || '').toLowerCase().trim();
            if (normRole === 'waiter') {
              return activeAssignedWaiters.includes(p.id);
            }
            return true; // kitchen, managers always receive notification
          });
        }
      }
    } catch (scopeErr) {
      console.warn('[PushDispatcher] Scoping warning:', scopeErr);
    }

    const expoMessages: any[] = [];
    const nativeFcmMessages: any[] = [];

    targetProfiles.forEach(p => {
      if (!p.push_token || p.push_token.startsWith('{')) return;

      const normRole = (p.role || '').toLowerCase().trim();
      const roleChannel = (normRole === 'kitchen' || normRole === 'kds' || normRole === 'kitchen_staff')
        ? 'smartdine_kitchen'
        : normRole === 'waiter'
        ? 'smartdine_waiter'
        : normRole === 'owner' || normRole === 'manager'
        ? 'smartdine_owner'
        : 'smartdine_kitchen';

      let notifType = 'NEW_ORDER';
      if (extraData?.notificationType) {
        notifType = extraData.notificationType;
      } else if (
        extraData?.type === 'call_waiter' ||
        extraData?.type === 'request_bill' ||
        title.toLowerCase().includes('waiter') ||
        title.toLowerCase().includes('bill')
      ) {
        notifType = 'CUSTOMER_CALL';
      } else if (title.toLowerCase().includes('ready')) {
        notifType = 'FOOD_READY';
      } else if (title.toLowerCase().includes('renewal') || title.toLowerCase().includes('subscription')) {
        notifType = 'SUBSCRIPTION_RENEWAL';
      }

      const payloadData = {
        notificationType: notifType,
        restaurantId,
        role: p.role,
        tableId: tableId || null,
        timestamp: Date.now(),
        channelId: roleChannel,
        sound: 'order_tune',
        ...(extraData || {})
      };

      if (p.push_token.startsWith('ExponentPushToken[')) {
        expoMessages.push({
          to: p.push_token,
          sound: 'order_tune',
          priority: 'high',
          channelId: roleChannel,
          color: '#059669',
          title,
          body,
          data: payloadData,
          badge: 1,
          _displayInForeground: true,
        });
      } else {
        nativeFcmMessages.push({
          token: p.push_token,
          channelId: roleChannel,
          title,
          body,
          data: payloadData
        });
      }
    });

    // 6. Dispatch Expo Push
    // NOTE: Dispatch per-token using Promise.allSettled to eliminate PUSH_TOO_MANY_EXPERIENCE_IDS errors
    // when different staff members have tokens from different app versions or Expo project IDs.
    if (expoMessages.length > 0) {
      await Promise.allSettled(
        expoMessages.map(async (msg) => {
          try {
            const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify([msg]),
            });
            const expoJson = await expoRes.json().catch(() => null);
            if (expoRes.status !== 200 || expoJson?.errors) {
              console.warn(`[PushDispatcher] Push notice for token ${msg.to?.slice(0, 25)}:`, expoJson);
            } else {
              console.log(`[PushDispatcher] Dispatched "${title}" to ${msg.to?.slice(0, 25)}:`, JSON.stringify(expoJson?.data));
            }
          } catch (err) {
            console.warn('[PushDispatcher] Push send error:', err);
          }
        })
      );
    }

    // 7. Dispatch Native FCM
    if (nativeFcmMessages.length > 0) {
      try {
        const { getFirebaseMessaging } = await import('./firebase-admin');
        const messaging = getFirebaseMessaging();
        for (const msg of nativeFcmMessages) {
          try {
            await messaging.send({
              token: msg.token,
              notification: {
                title: msg.title,
                body: msg.body
              },
              android: {
                priority: 'high',
                notification: {
                  channelId: msg.channelId,
                  sound: 'order_tune',
                  priority: 'high',
                  defaultSound: false,
                  visibility: 'public'
                }
              },
              data: Object.fromEntries(
                Object.entries(msg.data).map(([k, v]) => [k, String(v ?? '')])
              )
            });
            console.log(`[PushDispatcher] Delivered native FCM to ${msg.token.slice(0, 15)}...`);
          } catch (sendErr: any) {
            console.warn(`[PushDispatcher] Native FCM error for ${msg.token.slice(0, 15)}...:`, sendErr?.message);
          }
        }
      } catch (adminErr: any) {
        console.log('[PushDispatcher] Firebase admin notice:', adminErr?.message);
      }
    }
  } catch (err) {
    console.error('[PushDispatcher] Error dispatching push notification:', err);
  }
}
