const CACHE_NAME = "rotinas-cache-v19";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png",
  "./fonts/fonts.css", "./fonts/Fraunces.woff2", "./fonts/Inter.woff2", "./fonts/IBMPlexMono-400.woff2", "./fonts/IBMPlexMono-500.woff2"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// stale-while-revalidate: responde do cache na hora e atualiza o cache pela
// rede em segundo plano — deploys chegam no reload seguinte, sem depender de
// incrementar CACHE_NAME (que segue existindo só para limpar caches antigos).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((response) => {
        if (response && (response.ok || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return response;
      });
      if (cached) {
        event.waitUntil(network.catch(() => {}));
        return cached;
      }
      return network.catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const routineId = event.notification.data && event.notification.data.routineId;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.postMessage({ type: "startRoutine", routineId });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./index.html?start=" + routineId);
      }
    })
  );
});
