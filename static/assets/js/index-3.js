// index.js — home search / navigation
const UV_SW_URL = "../sw.js?v=2026-03-29";
const UV_SW_SCOPE = { scope: "/" };

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

  const enc = __uv$config.encodeUrl(url);
  sessionStorage.setItem("GoUrl", enc);
  sessionStorage.setItem("GoUrlHint", url);
  const dyOn = localStorage.getItem("dy") === "true";
  let xprime = false;
  try {
    xprime = /(^|\.)xprime\.su$/i.test(new URL(url).hostname);
  } catch {
    xprime = /xprime\.su/i.test(url);
  }

  // Dynamic preference (dy) must not skip /d — tabs always load first; iframes use /a/q/ when dy is on (see t3.js).
  // XPrime: full /a/q/ only when not using the tab shell (path !== "/d"; e.g. home embedded in an iframe).
  if (xprime && path !== "/d") {
    window.location.href = `/a/q/${enc}`;
    return;
  }
  if (path) {
    location.href = path;
  } else {
    const dyn = dyOn || xprime;
    window.location.href = dyn ? `/a/q/${enc}` : `/a/${enc}`;
  }
}

function go(value) {
  void processUrl(value, preferOpenInProxyOnly() ? "" : "/d");
}

function blank(value) {
  void processUrl(value);
}

function dy(value) {
  void processUrl(value, `/a/q/${__uv$config.encodeUrl(value)}`);
}

function isUrl(val = "") {
  if (/^http(s?):\/\//.test(val) || (val.includes(".") && val.substr(0, 1) !== " ")) {
    return true;
  }
  return false;
}
