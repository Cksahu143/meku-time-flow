const CACHE_NAME = 'edas-notifications-v1';

self.addEventListener('install', (event) => {
  console.log('EDAS Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('EDAS Service Worker activating.');
  event.waitUntil(clients.claim());
});

// Handle push events (works even when tab/browser is closed)
self.addEventListener('push', (event) => {
  const options = event.data ? event.data.json() : {};
  
  const title = options.title || 'EDAS';
  const body = options.body || '';
  const icon = options.icon || '/favicon.ico';
  const badge = options.badge || '/favicon.ico';
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

// Handle messages from the main thread (for showing notifications when tab is hidden/closed)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag, data, actions } = event.data;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: badge || '/favicon.ico',
        tag: tag || 'default',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: data || {},
        actions: actions || [],
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const targetUrl = notificationData.url || '/app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Navigate to the right place if needed
            if (notificationData.url) {
              client.navigate(notificationData.url);
            }
            return client.focus();
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
