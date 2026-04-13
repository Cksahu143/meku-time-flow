// ======================================
// EDAS PWA Service Worker
// Handles: caching, offline support, push notifications, auto-update
// ======================================

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `edas-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `edas-dynamic-${CACHE_VERSION}`;
const API_CACHE = `edas-api-${CACHE_VERSION}`;

const APP_SHELL = [
  '/',
  '/app',
  '/auth',
  '/manifest.json',
  '/offline.html',
];

// ── INSTALL ──
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(APP_SHELL))
  );
});

// ── ACTIVATE ──
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
    ).then(() => self.clients.claim())
  );

  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
    });
  });
});

// ── FETCH ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (
    url.protocol === 'chrome-extension:' ||
    url.hostname.includes('analytics') ||
    url.pathname.includes('/realtime/') ||
    url.pathname.includes('/rest/') ||
    url.pathname.includes('/auth/') ||
    url.hostname.includes('supabase')
  ) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/offline.html')))
    );
    return;
  }

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
  let options = {};
  
  try {
    if (event.data) {
      const text = event.data.text();
      if (text) {
        options = JSON.parse(text);
      }
    }
  } catch (e) {
    console.warn('[SW] Could not parse push data:', e);
  }

  const title = options.title || 'EDAS';
  const body = options.body || 'You have a new notification';
  const icon = options.icon || '/favicon.ico';
  const badge = options.badge || '/favicon.ico';
  const tag = options.tag || 'default';
  const data = options.data || {};
  const actions = options.actions || [];
  const requireInteraction = options.requireInteraction || false;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      requireInteraction,
      vibrate: [200, 100, 200, 100, 200],
      data,
      actions,
      silent: false,
    })
  );
});

// ── MESSAGE HANDLER ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data, actions, requireInteraction, silent } = event.data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: badge || '/favicon.ico',
        tag: tag || 'default',
        requireInteraction: requireInteraction || false,
        vibrate: [200, 100, 200, 100, 200],
        data: data || {},
        actions: actions || [],
        silent: silent || false,
      })
    );
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── NOTIFICATION CLICK ──
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/app';

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            if (action === 'answer' || action === 'reject') {
              client.postMessage({
                type: 'CALL_ACTION',
                action,
                callId: notificationData.callId,
              });
            }
            if (notificationData.url) client.navigate(notificationData.url);
            return client.focus();
          }
        }
        // No existing window — open the app
        if (clients.openWindow) {
          const url = action === 'answer' 
            ? `${targetUrl}?callAction=answer&callId=${notificationData.callId || ''}`
            : action === 'reject'
            ? `${targetUrl}?callAction=reject&callId=${notificationData.callId || ''}`
            : targetUrl;
          return clients.openWindow(url);
        }
      })
  );
});
