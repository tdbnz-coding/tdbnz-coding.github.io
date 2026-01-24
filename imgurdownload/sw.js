// Simple offline cache for the app shell
const CACHE = "thomas-imgur-dl-2026-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./assets/styles.css",
  "./assets/app.js",
  "./vendor/jszip.min.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req))
  );
});
