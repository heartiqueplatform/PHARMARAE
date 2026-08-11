// Service Worker for PHARMIENTA KENYA - Pharmacy Management System
// Version: 1.0.0 - Update this when releasing new versions
const APP_VERSION = '1.0.0';
const CACHE_NAME = `PHARMIENTA-${APP_VERSION}`;
const PRECACHE_NAME = `PHARMIENTA-precache-${APP_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.ico'
];

// URLs that should never be cached (dynamic content)
const SKIP_CACHE_URLS = [
  '/api/',
  '/supabase/',
  '/auth/'
];

// Check if URL should be skipped from caching
const shouldSkipCache = (url) => {
  return SKIP_CACHE_URLS.some(skipUrl => url.includes(skipUrl));
};

// ============================================
// INSTALL EVENT - Cache static assets
// ============================================
self.addEventListener('install', (event) => {
  console.log(`📦 Service Worker v${APP_VERSION}: Installing...`);

  event.waitUntil(
    caches.open(PRECACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log(` Service Worker v${APP_VERSION}: Installation complete`);
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed:', error);
      })
  );
});

// ============================================
// ACTIVATE EVENT - Clean up old caches
// ============================================
self.addEventListener('activate', (event) => {
  console.log(` Service Worker v${APP_VERSION}: Activating...`);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== PRECACHE_NAME &&
              cacheName !== CACHE_NAME &&
              cacheName.startsWith('PHARMIENTA-')) {
              console.log(`🗑️ Service Worker: Removing old cache:`, cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log(` Service Worker v${APP_VERSION}: Activation complete`);
        // Claim all clients to take control immediately
        return self.clients.claim();
      })
  );
});

// ============================================
// FETCH EVENT - Smart caching strategy
// ============================================
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip browser extension requests
  if (request.url.includes('chrome-extension')) {
    return;
  }

  // Skip analytics/tracking requests
  if (request.url.includes('analytics') || request.url.includes('tracking')) {
    return;
  }

  // For HTML pages - Network first, then cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh HTML
          const responseClone = response.clone();
          caches.open(PRECACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            })
            .catch((err) => {
              console.warn('⚠️ Service Worker: Cache HTML error:', err);
            });
          return response;
        })
        .catch(() => {
          // If network fails, serve cached HTML
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('📂 Service Worker: Serving HTML from cache');
                return cachedResponse;
              }
              // Fallback to index.html for SPA routing
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // For static assets (JS, CSS, images) - Cache first, then network
  if (request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached version immediately
            // Then fetch and update cache in background
            event.waitUntil(
              fetch(request)
                .then((networkResponse) => {
                  if (networkResponse.status === 200) {
                    caches.open(PRECACHE_NAME)
                      .then((cache) => {
                        cache.put(request, networkResponse);
                      });
                  }
                })
                .catch(() => {
                  // Silently fail - cache is fine
                })
            );
            return cachedResponse;
          }

          // Not in cache - fetch from network
          return fetch(request)
            .then((response) => {
              const responseClone = response.clone();
              if (response.status === 200) {
                caches.open(PRECACHE_NAME)
                  .then((cache) => {
                    cache.put(request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }

  // For everything else - Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses that aren't API calls
        if (response.status === 200 && !shouldSkipCache(request.url)) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseClone);
            })
            .catch((err) => {
              console.warn('⚠️ Service Worker: Cache put error:', err);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📂 Service Worker: Serving from cache:', request.url);
              return cachedResponse;
            }

            // Return offline page for HTML requests
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }

            // Return default offline response
            return new Response('Offline - Please connect to the internet', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// ============================================
// MESSAGE HANDLER - For update notifications
// ============================================
self.addEventListener('message', (event) => {
  console.log('💬 Service Worker: Message received:', event.data);

  if (event.data) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        console.log('⏭️ Service Worker: Skipping waiting...');
        self.skipWaiting();
        break;

      case 'CHECK_UPDATE':
        console.log('🔍 Service Worker: Checking for updates...');
        event.waitUntil(
          self.registration.update()
            .then(() => {
              event.ports[0].postMessage({
                type: 'UPDATE_CHECK_COMPLETE',
                version: APP_VERSION,
                hasUpdate: false
              });
            })
        );
        break;

      case 'GET_VERSION':
        event.ports[0].postMessage({
          type: 'VERSION_INFO',
          version: APP_VERSION,
          cacheName: PRECACHE_NAME
        });
        break;
    }
  }
});

// ============================================
// BACKGROUND SYNC - For offline data sync
// ============================================
self.addEventListener('sync', (event) => {
  console.log('🔄 Service Worker: Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      // Notify all clients about sync
      self.clients.matchAll()
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_TRIGGERED',
              timestamp: new Date().toISOString()
            });
          });
        })
        .then(() => {
          console.log(' Service Worker: Background sync complete');
        })
    );
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================
self.addEventListener('push', (event) => {
  console.log('🔔 Service Worker: Push notification received');

  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New update available for PHARMIENTA',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      date: new Date().toISOString()
    },
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'PHARMIENTA KENYA',
      options
    )
  );
});

// ============================================
// NOTIFICATION CLICK HANDLER
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Service Worker: Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
      .then((clientList) => {
        // If a client window exists, focus it
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        return clients.openWindow(event.notification.data.url || '/');
      })
  );
});

// ============================================
// PERIODIC SYNC (Chrome only)
// ============================================
self.addEventListener('periodicsync', (event) => {
  console.log('🔄 Service Worker: Periodic sync triggered:', event.tag);

  if (event.tag === 'periodic-sync') {
    event.waitUntil(
      // Check for updates
      self.registration.update()
        .then(() => {
          console.log(' Service Worker: Periodic check complete');
        })
    );
  }
});

// ============================================
// ERROR HANDLING
// ============================================
self.addEventListener('error', (event) => {
  console.error('❌ Service Worker Error:', event.message, event.filename, event.lineno);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Service Worker Unhandled Rejection:', event.reason);
});

// ============================================
// Log service worker version on startup
// ============================================
console.log(`🚀 Service Worker v${APP_VERSION} loaded`);
console.log(`📦 Cache: ${PRECACHE_NAME}`);