const CACHE_NAME = 'e4d-ide-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through fetch for the PWA requirement
  // In a full offline app, we would cache assets here.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
