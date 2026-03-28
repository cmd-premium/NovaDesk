importScripts("/assets/history/config.js?v=2025-04-15");
importScripts("/assets/history/worker.js?v=2025-04-15");
importScripts("/assets/mathematics/bundle.js?v=2025-04-15");
importScripts("/assets/mathematics/config.js?v=2025-04-15");
importScripts("/assets/scramjet/scramjet.codecs.js?v=1.0.2");
importScripts("/assets/scramjet/scramjet-nv-config.js?v=1");
importScripts("/assets/scramjet/scramjet.bundle.js?v=1.0.2");
importScripts("/assets/scramjet/scramjet.worker.js?v=1.0.2");
importScripts(__uv$config.sw || "/assets/mathematics/sw.js?v=9-30-2024");

const uv = new UVServiceWorker();
const dynamic = new Dynamic();
const sjSw = new ScramjetServiceWorker();

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      if (sjSw.route(event)) {
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
