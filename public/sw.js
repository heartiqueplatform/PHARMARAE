// public/sw.js — FULLY UPDATED
// ============================================
// 🔥 BUMP APP_VERSION ON EVERY DEPLOY
// This is the ONLY thing that forces browsers to
// install the new service worker. Forget to bump it,
// and users keep running the old cached code.
// ============================================
const APP_VERSION = '1.0.33';
const CACHE_NAME = `Pharmienta-${APP_VERSION}`;
const PRECACHE_NAME = `Pharmienta-precache-${APP_VERSION}`;

// Static assets to cache on install.
// ⚠️ Do NOT precache '/' or '/index.html' — they must always
// be fetched fresh from the network so users get the newest
// <script src="..."> tags pointing at the latest JS bundle.
const STATIC_ASSETS = [
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.ico'
];

// ============================================
// INSTALL EVENT
// ============================================
self.addEventListener('install', (event) => {
  console.log(`📦 SW v${APP_VERSION}: Installing...`);
  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => console.error('❌ Installation failed:', error))
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================
self.addEventListener('activate', (event) => {
  console.log(`🚀 SW v${APP_VERSION}: Activating...`);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete ANY cache that isn't the current version
            if (cacheName !== PRECACHE_NAME && cacheName !== CACHE_NAME) {
              console.log(`🗑️ Removing old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        // Tell all open tabs "new SW is active, refresh if you want"
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_ACTIVATED', version: APP_VERSION });
          });
        });
      })
  );
});

// ============================================
// FETCH EVENT
// ============================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET or cross-origin
  if (request.method !== 'GET' || !url.origin.startsWith(self.location.origin)) {
    return;
  }

  // Skip API calls
  if (url.pathname.includes('/api/') || url.pathname.includes('/supabase/')) {
    return;
  }

  // ============================================
  // HTML - NETWORK ONLY (never serve stale HTML)
  // We don't cache HTML at all so users always get the latest
  // <script src="..."> tags pointing at the newest JS bundle.
  // Offline fallback only if we're truly offline.
  // ============================================
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/') || caches.match('/index.html');
      })
    );
    return;
  }

  // ============================================
  // Static assets - Stale-While-Revalidate
  // Vite/Webpack output filenames contain content hashes (app.abc123.js),
  // so each deploy produces NEW filenames. Old files are simply not
  // requested again — no risk of stale code.
  // ============================================
  if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((res) => {
            if (res.status === 200) {
              const clone = res.clone();
              caches.open(PRECACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);

        // If we have a cached copy, return it immediately (fast).
        // Otherwise wait for the network.
        return cached || networkFetch;
      })
    );
    return;
  }

  // ============================================
  // Default - Network first
  // ============================================
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================
// 🔔 PUSH NOTIFICATIONS - ENHANCED
// ============================================
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);

  let payload = {
    title: '📦 Pharmienta Kenya',
    body: 'New notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'Pharmienta-notification',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: '📱 Open App' },
      { action: 'dismiss', title: ' Dismiss' }
    ],
    data: {
      url: '/',
      type: 'default'
    }
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };

      if (parsed.data?.type === 'sale') {
        payload.tag = `sale-${parsed.data.saleId || Date.now()}`;
        payload.actions = [
          { action: 'view-sale', title: '💰 View Sale' },
          { action: 'dismiss', title: ' Dismiss' }
        ];
        payload.requireInteraction = true;
        payload.vibrate = [300, 150, 300, 150, 300];
      }

      if (parsed.data?.type === 'inventory') {
        payload.tag = `stock-${parsed.data.productId || Date.now()}`;
        payload.actions = [
          { action: 'view-stock', title: '📦 Check Stock' },
          { action: 'dismiss', title: ' Dismiss' }
        ];
        payload.vibrate = [200, 100, 200];
      }

    } catch (e) {
      console.warn('Could not parse push data, using defaults');
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: payload.renotify,
      requireInteraction: payload.requireInteraction,
      vibrate: payload.vibrate,
      data: payload.data,
      actions: payload.actions,
      silent: false
    })
  );
});

// ============================================
// 🔔 NOTIFICATION CLICK - ENHANCED
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.action);

  const notification = event.notification;
  notification.close();

  const action = event.action;

  if (action === 'dismiss') {
    return;
  }

  let targetUrl = notification.data?.url || '/';

  if (action === 'view-sale' && notification.data?.saleId) {
    targetUrl = `/?tab=sell&saleId=${notification.data.saleId}`;
  }

  if (action === 'view-stock' && notification.data?.productId) {
    targetUrl = `/?tab=stock&productId=${notification.data.productId}`;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' || client.url.includes('Pharmienta')) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              action: action,
              data: notification.data
            });
            return;
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});

// ============================================
// 📱 MESSAGE HANDLER
// ============================================
self.addEventListener('message', async (event) => {
  console.log('💬 SW Message received:', event.data);

  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      console.log('⏭️ Skipping waiting...');
      self.skipWaiting();
      break;

    case 'SHOW_NOTIFICATION': {
      const { payload } = event.data;
      console.log('📢 Showing notification:', payload);

      try {
        await self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/pwa-192x192.png',
          badge: payload.badge || '/pwa-192x192.png',
          tag: payload.tag || `notif-${Date.now()}`,
          renotify: true,
          requireInteraction: payload.requireInteraction !== false,
          vibrate: payload.vibrate || [200, 100, 200],
          data: payload.data || {},
          actions: payload.actions || [
            { action: 'open', title: '📱 Open App' },
            { action: 'dismiss', title: ' Dismiss' }
          ]
        });
        console.log('✅ Notification shown successfully');
      } catch (error) {
        console.error('❌ Error showing notification:', error);
      }
      break;
    }

    case 'GET_VERSION':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({
          type: 'VERSION_INFO',
          version: APP_VERSION
        });
      }
      break;
  }
});

// ============================================
// 🔄 BACKGROUND SYNC
// ============================================
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);

  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            timestamp: new Date().toISOString()
          });
        });
      })
    );
  }
});

console.log(`🚀 Service Worker v${APP_VERSION} loaded`);