import webpush from 'web-push';
import { supabase } from './supabase';

// Standard VAPID keys for Web Push notification dispatch
const VAPID_SUBJECT = 'mailto:support@cleverops.in';

// Default fallback VAPID keypair if environment variables are not set
const DEFAULT_VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa45x4GqHkQ_MStF08K90v7Z7836q72z937-23423789423748239748923';
const DEFAULT_VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '4823794289374928374928374928374982374982374';

let vapidKeysConfigured = false;

function ensureVapidConfig() {
  if (vapidKeysConfigured) return;
  try {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BD9b2X5g43S7-oR2_aQ_b8yU6Z_0gL-36x1v0N5X5V0W-0w1X5V0W-0w1X5V0W-0';
    const privateKey = process.env.VAPID_PRIVATE_KEY || 'b8yU6Z_0gL-36x1v0N5X5V0W-0w1X5V0W-0w1X5V0W-0';
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    vapidKeysConfigured = true;
  } catch (e) {
    // Generate valid VAPID keys on runtime if configured ones fail format validation
    try {
      const generated = webpush.generateVAPIDKeys();
      webpush.setVapidDetails(VAPID_SUBJECT, generated.publicKey, generated.privateKey);
      vapidKeysConfigured = true;
    } catch (err) {
      console.warn('[WebPush] VAPID configuration error:', err);
    }
  }
}

export function getVapidPublicKey(): string {
  try {
    ensureVapidConfig();
  } catch (e) {}
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BD9b2X5g43S7-oR2_aQ_b8yU6Z_0gL-36x1v0N5X5V0W-0w1X5V0W-0w1X5V0W-0';
}

export interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  eventId?: string;
  notificationType?: string;
  restaurantId?: string;
  tableId?: string;
  timestamp?: number;
}

export async function sendWebPushToRestaurant(
  restaurantId: string,
  roles: string[],
  payload: WebPushPayload
): Promise<number> {
  ensureVapidConfig();
  let successCount = 0;

  try {
    // Lookup matching staff profiles with Web Push subscriptions stored in push_token or web_push_subscription
    const normRoles = roles.map(r => r.toLowerCase().trim());
    if (normRoles.includes('kitchen')) {
      normRoles.push('kds', 'kitchen_staff');
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, push_token, role')
      .eq('restaurant_id', restaurantId)
      .in('role', normRoles)
      .not('push_token', 'is', null);

    if (!profiles || profiles.length === 0) return 0;

    const pushPayloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard/kds',
      tag: payload.tag || `event-${payload.eventId || Date.now()}`,
      eventId: payload.eventId,
      data: payload,
    });

    for (const p of profiles) {
      if (!p.push_token) continue;

      // Check if push_token is a JSON Web Push Subscription object
      try {
        if (p.push_token.startsWith('{') && p.push_token.includes('endpoint')) {
          const sub = JSON.parse(p.push_token);
          if (sub.endpoint) {
            await webpush.sendNotification(sub, pushPayloadString, {
              TTL: 60,
              urgency: 'high',
            });
            successCount++;
          }
        }
      } catch (err: any) {
        console.warn(`[WebPush] Failed sending push to user ${p.id}:`, err?.message || err);
      }
    }
  } catch (e) {
    console.error('[WebPush] Error in sendWebPushToRestaurant:', e);
  }

  return successCount;
}
