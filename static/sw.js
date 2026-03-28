importScripts("/assets/history/config.js?v=2025-04-15");
importScripts("/assets/history/worker.js?v=2025-04-15");
importScripts("/assets/mathematics/bundle.js?v=2025-04-15");
importScripts("/assets/mathematics/config.js?v=2025-04-15");
importScripts(__uv$config.sw || "/assets/mathematics/sw.js?v=2025-04-15");

const uv = new UVServiceWorker();
const dynamic = new Dynamic();

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      const req = event.request;
      const url = req.url;
      const origin = location.origin;

      // Fast paths for same-origin: avoid dynamic.route() on every asset — it calls
      // clients.matchAll() and makes the whole app feel sluggish.
      if (url.startsWith(origin)) {
        if (url.startsWith(`${origin}/a/q/`)) {
          return dynamic.fetch(event);
        }
        if (url.startsWith(`${origin}/a/`)) {
          return uv.fetch(event);
        }
        return fetch(req);
      }

      // Cross-origin (e.g. subresources opened via Dynamic): still need route().
      if (await dynamic.route(event)) {
        return dynamic.fetch(event);
      }
      return fetch(req);
    })(),
  );
});
