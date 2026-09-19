self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Kenai';
  const options = {
    body: payload.body || 'Se acerca la hora de una dosis.',
    icon: '/kenai-icon-animated.png',
    badge: '/kenai-icon-animated.png',
    data: { url: payload.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
