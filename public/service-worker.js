self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  const options = event.data ? event.data.json() : {};
  
  const title = options.title || 'Notification';
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
      data: options.data || {}
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing window
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open a new window if none exists
        if (clients.openWindow) {
          return clients.openWindow('/app');
        }
      })
  );
});
