const CACHE_NAME = 'smartdine-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/logo.png',
  '/manifest.json'
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
        // Stale-while-revalidate for static assets
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

// Push Notification Handler for Background Tab Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'CleverOps SmartDine', body: 'New order update received!' };
  try {
    if (event.data) data = event.data.json();
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body || 'New order update received!',
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || '/dashboard/kds' },
    actions: [
      { action: 'open', title: 'View Orders' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'New Order Notification', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data?.url || '/dashboard/kds';
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
