(function () {
  async function boot() {
    if (typeof getProxyMode !== "function" || getProxyMode() !== "sj") {
      return;
    }
    if (typeof BareMux === "undefined" || typeof BareMux.SetSingletonTransport !== "function") {
      console.warn("NovaDesk: BareMux v1 missing; load /assets/bare-mux/uuid-shim.js then bare-mux-v1.cjs");
      return;
    }
    if (typeof bare === "undefined" || !bare.createBareClient) {
      console.warn("NovaDesk: bare-client missing");
      return;
    }
    try {
      const bareUrl = new URL("/ca/", location.origin).href;
      const bareClient = await bare.createBareClient(bareUrl);
      const empty = bare.statusEmpty || [204, 304, 101];
      const transport = {
        ready: false,
        async init() {
          this.ready = true;
        },
        async meta() {},
        async request(remote, method, body, headers, signal) {
          const url = remote instanceof URL ? remote : new URL(String(remote));
          const res = await bareClient.fetch(url, {
            method: method || "GET",
            body: body,
            headers: headers || {},
            signal: signal || undefined,
          });
          let buf;
          if (res.body && !empty.includes(res.status)) {
            buf = await res.arrayBuffer();
          }
          const hdrs = res.rawHeaders ? { ...res.rawHeaders } : Object.fromEntries(new Headers(res.headers));
          return {
            status: res.status,
            statusText: res.statusText || "",
            headers: hdrs,
            body: buf,
          };
        },
        connect(remote, _origin, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
          try {
            const url = remote instanceof URL ? remote : new URL(String(remote));
            const ws = bareClient.createWebSocket(url, protocols, {
              headers: requestHeaders,
            });
            ws.addEventListener("open", () => onopen(ws.protocol || ""));
            ws.addEventListener("message", ev => onmessage(ev.data));
            ws.addEventListener("close", ev => onclose(ev.code, ev.reason));
            ws.addEventListener("error", () => onerror("websocket error"));
            return [
              data => {
                ws.send(data);
              },
              (code, reason) => {
                ws.close(code, reason);
              },
            ];
          } catch (e) {
            onerror(String(e));
            return [
              () => {},
              () => {},
            ];
          }
        },
      };
      await BareMux.SetSingletonTransport(transport);
    } catch (e) {
      console.error("NovaDesk: Scramjet BareMux bootstrap failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot());
  } else {
    void boot();
  }
})();
