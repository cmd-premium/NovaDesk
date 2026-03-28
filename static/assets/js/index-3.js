// index.js — home search / navigation
const UV_SW_URL = "../sw.js?v=2026-03-27-sj";
const UV_SW_SCOPE = { scope: "/a/" };

let uvSwReady = Promise.resolve();
if ("serviceWorker" in navigator) {
  uvSwReady = navigator.serviceWorker.register(UV_SW_URL, UV_SW_SCOPE).catch(() => {});
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** True when the top window is the tab shell (/d). */
let tabsShellIsTop;
try {
  tabsShellIsTop = window.top.location.pathname === "/d";
} catch {
  try {
    tabsShellIsTop = window.parent.location.pathname === "/d";
  } catch {
    tabsShellIsTop = false;
  }
}

/**
 * When the home page runs inside the tab shell’s iframe (top is /d), do not send /d again —
 * that would nest a second tab UI. Use proxy routes only (empty path in processUrl).
 * Note: use AND, not OR — if we only check isInIframe(), portal/LMS wrappers skip /d and
 * searches open full-page /a/ instead of the tab system.
 */
function preferOpenInProxyOnly() {
  return isInIframe() && tabsShellIsTop;
}

const form = document.getElementById("fv");
const input = document.getElementById("input");

if (form && input) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    void (async () => {
      try {
        if (preferOpenInProxyOnly()) {
          await processUrl(input.value, "");
        } else {
          await processUrl(input.value, "/d");
        }
      } catch {
        await processUrl(input.value, preferOpenInProxyOnly() ? "" : "/d");
      }
    })();
  });
}

async function processUrl(value, path) {
  await uvSwReady;

  let url = value.trim();
  const engine = localStorage.getItem("engine");
  const searchUrl = engine ? engine : "https://search.brave.com/search?q=";

  if (!isUrl(url)) {
    url = searchUrl + url;
  } else if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    url = `https://${url}`;
  }

  const enc = encodeProxyTarget(url);
  sessionStorage.setItem("GoUrl", enc);
  sessionStorage.setItem("GoUrlHint", url);
  const mode = getProxyMode();
  let xprime = false;
  try {
    xprime = /(^|\.)xprime\.su$/i.test(new URL(url).hostname);
  } catch {
    xprime = /xprime\.su/i.test(url);
  }

  // Dynamic preference (dy) must not skip /d — tabs always load first; iframes follow getProxyMode (see t3.js).
  // XPrime: alternate tunnel when not using the tab shell (path !== "/d"; e.g. home embedded in an iframe).
  if (xprime && path !== "/d") {
    const xpPrefix = mode === "sj" ? "/a/sj/" : "/a/q/";
    window.location.href = `${xpPrefix}${enc}`;
    return;
  }
  if (path) {
    location.href = path;
  } else if (mode === "sj") {
    window.location.href = `/a/sj/${enc}`;
  } else if (mode === "dy" || xprime) {
    window.location.href = `/a/q/${enc}`;
  } else {
    window.location.href = `/a/${enc}`;
  }
}

function go(value) {
  void processUrl(value, preferOpenInProxyOnly() ? "" : "/d");
}

function blank(value) {
  void processUrl(value);
}

function dyForcedTunnelPrefix() {
  return getProxyMode() === "sj" ? "/a/sj/" : "/a/q/";
}

function dy(value) {
  let u = value.trim();
  const searchUrl = localStorage.getItem("engine") || "https://search.brave.com/search?q=";
  if (!isUrl(u)) {
    u = searchUrl + u;
  } else if (!(u.startsWith("https://") || u.startsWith("http://"))) {
    u = `https://${u}`;
  }
  void processUrl(u, `${dyForcedTunnelPrefix()}${encodeProxyTarget(u)}`);
}

function isUrl(val = "") {
  if (/^http(s?):\/\//.test(val) || (val.includes(".") && val.substr(0, 1) !== " ")) {
    return true;
  }
  return false;
}
