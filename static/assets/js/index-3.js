// index.js — home search / navigation
window.addEventListener("load", () => {
  navigator.serviceWorker.register("../sw.js?v=2025-04-15", {
    scope: "/a/",
  });
});

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
 * When the home page runs inside the tab UI (iframe) or any iframe, we must not
 * navigate to /d — that loads another tab shell inside the iframe.
 * Use UV routes only (empty path → /a/... in processUrl).
 */
function preferOpenInProxyOnly() {
  return isInIframe() || tabsShellIsTop;
}

const form = document.getElementById("fv");
const input = document.getElementById("input");

if (form && input) {
  form.addEventListener("submit", event => {
    event.preventDefault();
    try {
      if (preferOpenInProxyOnly()) {
        processUrl(input.value, "");
      } else {
        processUrl(input.value, "/d");
      }
    } catch {
      processUrl(input.value, preferOpenInProxyOnly() ? "" : "/d");
    }
  });
}

function processUrl(value, path) {
  let url = value.trim();
  const engine = localStorage.getItem("engine");
  const searchUrl = engine ? engine : "https://search.brave.com/search?q=";

  if (!isUrl(url)) {
    url = searchUrl + url;
  } else if (!(url.startsWith("https://") || url.startsWith("http://"))) {
    url = `https://${url}`;
  }

  sessionStorage.setItem("GoUrl", __uv$config.encodeUrl(url));
  const dy = localStorage.getItem("dy");

  if (dy === "true") {
    window.location.href = `/a/q/${__uv$config.encodeUrl(url)}`;
  } else if (path) {
    location.href = path;
  } else {
    window.location.href = `/a/${__uv$config.encodeUrl(url)}`;
  }
}

function go(value) {
  processUrl(value, preferOpenInProxyOnly() ? "" : "/d");
}

function blank(value) {
  processUrl(value);
}

function dy(value) {
  processUrl(value, `/a/q/${__uv$config.encodeUrl(value)}`);
}

function isUrl(val = "") {
  if (/^http(s?):\/\//.test(val) || (val.includes(".") && val.substr(0, 1) !== " ")) {
    return true;
  }
  return false;
}
