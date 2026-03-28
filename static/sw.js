importScripts("/assets/history/config.js?v=2025-04-15");
importScripts("/assets/history/worker.js?v=2025-04-15");
importScripts("/assets/mathematics/bundle.js?v=2025-04-15");
importScripts("/assets/mathematics/config.js?v=2025-04-15");
importScripts("/assets/scramjet/scramjet.all.js?v=2.0.2-alpha");
importScripts(__uv$config.sw || "/assets/mathematics/sw.js?v=9-30-2024");

const uv = new UVServiceWorker();
const dynamic = new Dynamic();

/**
 * ScramjetServiceWorker constructs bare-mux BareClient immediately, which registers the SharedWorker
 * transport and breaks Ultraviolet/Dynamic unless we only construct it for Scramjet routes.
 */
let scramjetSw;
function getScramjetServiceWorker() {
  if (!scramjetSw) {
    const { ScramjetServiceWorker } = $scramjetLoadWorker();
    scramjetSw = new ScramjetServiceWorker();
  }
  return scramjetSw;
}

function isScramjetFetchScope(url, origin) {
  return (
    url.startsWith(`${origin}/a/sj/`) ||
    url.startsWith(`${origin}/assets/scramjet/`)
  );
}

self.addEventListener("fetch", event => {
  event.respondWith(
    (async () => {
      const url = event.request.url;
      const origin = location.origin;

      if (isScramjetFetchScope(url, origin)) {
        try {
          const sj = getScramjetServiceWorker();
          await sj.loadConfig();
          if (sj.config && sj.route(event)) {
            return sj.fetch(event);
          }
        } catch (err) {
          console.error("NovaDesk Scramjet fetch:", err);
        }
      }

      if (await dynamic.route(event)) {
        return dynamic.fetch(event);
      }
      if (url.startsWith(`${origin}/a/`) && !url.startsWith(`${origin}/a/q/`) && !url.startsWith(`${origin}/a/sj/`)) {
        return uv.fetch(event);
      }
      return fetch(event.request);
    })(),
  );
});
