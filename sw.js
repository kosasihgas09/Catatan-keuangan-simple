const CACHE_NAME = "catatan-keuangan-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) =>
            key.startsWith("catatan-keuangan-") &&
            key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const salinan = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put("./index.html", salinan));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(event.request)) ||
            (await caches.match("./index.html"));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const salinan = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(event.request, salinan));
        }
        return response;
      });
    })
  );
});
