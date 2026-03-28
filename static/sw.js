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
      const url = event.request.url;
      const origin = location.origin;
      // Dynamic's route() returns a falsy value for direct /a/q/ navigations due to its
      // internal comma-expression; always proxy /a/q/ here.
      if (url.startsWith(`${origin}/a/q/`)) {
        return dynamic.fetch(event);
      }
      if (await dynamic.route(event)) {
        return dynamic.fetch(event);
      }
      if (url.startsWith(`${origin}/a/`) && !url.startsWith(`${origin}/a/q/`)) {
        return uv.fetch(event);
      }
      return fetch(event.request);
    })(),
  );
});
