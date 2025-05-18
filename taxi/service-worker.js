const CACHE_NAME = 'taxi-fare-nomap-v1';
const URLS_TO_CACHE = [
  '/taxi/',
  '/taxi/index.html',
  '/taxi/assets/index-app-nomap.js',
  '/taxi/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
