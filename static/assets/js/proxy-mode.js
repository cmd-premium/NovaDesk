/** Proxy engine: uv (Ultraviolet), dy (Dynamic), sj (Scramjet). */
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

/** Encode target URL for the active proxy (Scramjet vs UV xor). */
function encodeProxyTarget(resolvedUrlString) {
  const mode = getProxyMode();
  const u = new URL(resolvedUrlString);
  if (mode === "sj") {
    if (!self.__scramjet$bundle) {
      throw new Error("Scramjet bundle not loaded");
    }
    return self.__scramjet$bundle.rewriters.url.encodeUrl(u.href, u);
  }
  return __uv$config.encodeUrl(resolvedUrlString);
}
