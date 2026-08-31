const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BD9b2X5g43S7-oR2_aQ_b8yU6Z_0gL-36x1v0N5X5V0W-0w1X5V0W-0w1X5V0W-0';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorkerAndPush(
  userId?: string,
  restaurantId?: string,
  role: string = 'kitchen'
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[WebPush] Service Worker registered with scope:', registration.scope);

    if (!('Notification' in window)) return registration;

    if (Notification.permission === 'granted' && userId && restaurantId) {
      await subscribeUserToPush(registration, userId, restaurantId, role);
    }

    return registration;
  } catch (e: any) {
    console.warn('[WebPush] SW Registration failed:', e?.message || e);
    return null;
  }
}

export async function subscribeUserToPush(
  registration: ServiceWorkerRegistration,
  userId: string,
  restaurantId: string,
  role: string
): Promise<PushSubscription | null> {
  try {
    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        console.log('[WebPush] Permission denied by user');
        return null;
      }
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    if (subscription && userId && restaurantId) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId,
          restaurantId,
          role,
        }),
      });
      console.log('[WebPush] Push subscription synced to server');
    }

    return subscription;
  } catch (e: any) {
    console.warn('[WebPush] Subscription error:', e?.message || e);
    return null;
  }
}
