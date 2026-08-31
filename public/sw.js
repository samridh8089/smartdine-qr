const CACHE_NAME = 'smartdine-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
  '/manifest.json',
  '/sounds/order_tune.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return; // Do not cache dynamic API routes

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/') || Response.error();
        }
      });
    })
  );
});

// Push Notification Handler for Background Tab & Minimized Window Notifications
self.addEventListener('push', (event) => {
  let data = { title: '🚨 NEW ORDER RECEIVED!', body: 'New kitchen order needs attention.', url: '/dashboard/kds' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const notificationTag = data.tag || (data.eventId ? `order-${data.eventId}` : `order-${Date.now()}`);

  const options = {
    body: data.body || 'New order notification received.',
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200, 100, 200, 100, 400],
    tag: notificationTag,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: data.url || '/dashboard/kds',
      timestamp: Date.now(),
      eventId: data.eventId || null
    },
    actions: [
      { action: 'open', title: 'View Orders' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 NEW ORDER RECEIVED!', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard/kds';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
