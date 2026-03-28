/** Proxy engine: uv (Ultraviolet), dy (Dynamic), sj (Scramjet v2). */
function getProxyMode() {
  const p = localStorage.getItem("proxy");
  if (p === "dy" || p === "sj" || p === "uv") {
    return p;
  }
  if (localStorage.getItem("dy") === "true") {
    return "dy";
  }
  return "uv";
}

function getProxyPathPrefix() {
  switch (getProxyMode()) {
    case "dy":
      return "/a/q/";
    case "sj":
      return "/a/sj/";
    default:
      return "/a/";
  }
}

/** Encode URL for Scramjet v2 default codec (encodeURIComponent), matching ScramjetController.encodeUrl. */
function encodeScramjetV2Target(resolvedUrlString) {
  const u = new URL(resolvedUrlString);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return u.href;
  }
  const encodedHash = encodeURIComponent(u.hash.slice(1));
  const realHash = encodedHash ? `#${encodedHash}` : "";
  u.hash = "";
  return `${getProxyPathPrefix()}${encodeURIComponent(u.href)}${realHash}`;
}

/** Encode target URL for the active proxy (Scramjet v2 vs UV / Dynamic). */
function encodeProxyTarget(resolvedUrlString) {
  if (getProxyMode() === "sj") {
    if (globalThis.__scramjetNovaDesk?.encodeUrl) {
      return globalThis.__scramjetNovaDesk.encodeUrl(resolvedUrlString);
    }
    return encodeScramjetV2Target(resolvedUrlString);
  }
  return __uv$config.encodeUrl(resolvedUrlString);
}
