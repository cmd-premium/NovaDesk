importScripts("/assets/history/config.js?v=2025-04-15");
importScripts("/assets/history/worker.js?v=2025-04-15");
importScripts("/assets/mathematics/bundle.js?v=2025-04-15");
importScripts("/assets/mathematics/config.js?v=2025-04-15");
importScripts("/assets/scramjet/scramjet.all.js?v=2.0.2-alpha");
importScripts(__uv$config.sw || "/assets/mathematics/sw.js?v=9-30-2024");

const uv = new UVServiceWorker();
const dynamic = new Dynamic();
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const sjSw = new ScramjetServiceWorker();

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      await sjSw.loadConfig();
      if (sjSw.config && sjSw.route(event)) {
        return sjSw.fetch(event);
      }
      if (await dynamic.route(event)) {
        return dynamic.fetch(event);
      }
      const url = event.request.url;
      const origin = location.origin;
      if (url.startsWith(`${origin}/a/`) && !url.startsWith(`${origin}/a/q/`) && !url.startsWith(`${origin}/a/sj/`)) {
        return uv.fetch(event);
      }
      return fetch(event.request);
    })(),
  );
});
