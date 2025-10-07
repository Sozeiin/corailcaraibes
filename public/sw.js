// Service Worker for Web Push Notifications
// Fleet Manager PWA

const CACHE_NAME = 'fleet-manager-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    self.clients.claim()
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let notificationData = {
    title: 'Fleet Manager',
    body: 'Nouvelle notification',
    url: '/',
  };

  try {
    if (event.data) {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        url: data.url || notificationData.url,
      };
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }

  const { title, body, url } = notificationData;

  const options = {
    body: body,
    icon: '/android-chrome-512x512.png',
    badge: '/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    data: {
      url: url,
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open',
        title: 'Ouvrir',
      },
      {
        action: 'close',
        title: 'Fermer',
      },
    ],
    requireInteraction: true, // Notifications persistent sur macOS
    tag: `fleet-notification-${Date.now()}`, // Tag unique pour chaque notification
    renotify: true,
    silent: false, // Activer le son
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Try to find an existing window with the same URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Try to focus any existing window
      if (clientList.length > 0 && 'focus' in clientList[0]) {
        return clientList[0].focus().then(() => {
          return clientList[0].navigate(urlToOpen);
        });
      }
      
      // Open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch event - basic pass-through, could add caching strategy later
self.addEventListener('fetch', (event) => {
  // Just pass through for now
  event.respondWith(fetch(event.request));
});

console.log('[SW] Service worker loaded');
