// ======================================
// EDAS PWA Service Worker
// Handles: caching, offline support, push notifications, auto-update
// ======================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `edas-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `edas-dynamic-${CACHE_VERSION}`;
const API_CACHE = `edas-api-${CACHE_VERSION}`;

// Files to pre-cache on install (app shell)
const APP_SHELL = [
  '/',
  '/app',
  '/auth',
  '/manifest.json',
  '/offline.html',
];

// ── INSTALL ──
// Pre-cache the app shell, then immediately activate
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      // Do NOT skipWaiting here — let the app control when to activate
  );
});

// ── ACTIVATE ──
// Clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // Take control of all pages immediately
  );

  // Notify all clients that an update happened
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
    });
  });
});

// ── FETCH ──
// Network-first for API/navigation, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension, analytics, and Supabase realtime requests
  if (
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('analytics') ||
    url.pathname.includes('/realtime/') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/') ||
    url.hostname.includes('supabase')
  ) return;

  // For navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache the latest version of each page
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/offline.html')))
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts): cache-first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot)$/) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request)
      .then(response => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', (event) => {
  const options = event.data ? event.data.json() : {};
  const title = options.title || 'EDAS';
  const body = options.body || '';
  const icon = options.icon || '/icons/icon-192x192.png';
  const badge = options.badge || '/icons/icon-72x72.png';
  const tag = options.tag || 'default';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: options.data || {},
      actions: options.actions || [],
      silent: options.silent || false,
    })
  );
});

// ── MESSAGE HANDLER ──
// Receive messages from the main thread (show notification, skip waiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data, actions, requireInteraction, silent } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/icons/icon-192x192.png',
        badge: badge || '/icons/icon-72x72.png',
        tag: tag || 'default',
        requireInteraction: requireInteraction || false,
        vibrate: [200, 100, 200, 100, 200],
        data: data || {},
        actions: actions || [],
        silent: silent || false,
      })
    );
  }

  // When the app detects a new SW version, it can tell us to activate immediately
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            if (notificationData.url) client.navigate(notificationData.url);
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
  );
});
