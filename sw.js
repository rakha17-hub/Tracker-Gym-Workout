/* =========================================================
   sw.js — Service Worker untuk IronLog PWA
   Strategi: Cache-First dengan pembaruan versi otomatis
   ========================================================= */

const CACHE_NAME = "ironlog-cache-v1";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/storage.js",
  "./js/metrics.js",
  "./js/timer.js",
  "./js/workout.js",
  "./js/app.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// Tahap Install: Simpan seluruh aset aplikasi ke cache lokal
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Tahap Activate: Hapus cache versi lama jika ada pembaruan
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((oldName) => caches.delete(oldName))
      );
    })
  );
  self.clients.claim();
});

// Tahap Fetch: Layani dari cache agar bekerja 100% offline
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Fallback ke index.html saat navigasi offline
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
