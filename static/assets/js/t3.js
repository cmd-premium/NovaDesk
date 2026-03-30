// tabs.js — NovaDesk tab shell
function getSearchUrl() {
  return localStorage.getItem("engine") || "https://search.brave.com/search?q=";
}

// Await registration only; `navigator.serviceWorker.ready` can hang and block tab setup.
let uvSwReady = Promise.resolve();
if ("serviceWorker" in navigator) {
  uvSwReady = navigator.serviceWorker.register("../sw.js?v=2026-03-31", { scope: "/" }).catch(() => {});
}

function isUrl(val = "") {
  if (/^http(s?):\/\//.test(val) || (val.includes(".") && val.substr(0, 1) !== " ")) {
    return true;
  }
  return false;
}

function prependHttps(url) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

/** SPAs often read viewport size once; iframes get final width after layout. Nudge resize so sites recalc (fixes “zoomed”/wrong scale). */
function requestIframeLayoutFix(contentWindow) {
  if (!contentWindow) {
    return;
  }
  const poke = () => {
    try {
      contentWindow.dispatchEvent(new Event("resize"));
      contentWindow.dispatchEvent(new Event("orientationchange"));
    } catch {
      /* ignore */
    }
  };
  requestAnimationFrame(poke);
  setTimeout(poke, 100);
}

document.addEventListener("DOMContentLoaded", async () => {
  await uvSwReady;

  const form = document.getElementById("fv");
  const input = document.getElementById("input");
  if (form && input) {
    form.addEventListener("submit", event => {
      event.preventDefault();
      void uvSwReady.then(() => {
        const formValue = input.value.trim();
        const searchBase = getSearchUrl();
        const url = isUrl(formValue) ? prependHttps(formValue) : `${searchBase}${formValue}`;
        const enc = __uv$config.encodeUrl(url);
        sessionStorage.setItem("GoUrl", enc);
        sessionStorage.setItem("GoUrlHint", url);
        const iframeContainer = document.getElementById("frame-container");
        const activeIframe = Array.from(iframeContainer?.querySelectorAll("iframe") || []).find(iframe => iframe.classList.contains("active"));
        if (!activeIframe) {
          return;
        }
        let bcine = false;
        try {
          bcine = /(^|\.)bcine\.app$/i.test(new URL(url).hostname);
        } catch {
          bcine = /bcine\.app/i.test(url);
        }
        const dyn = localStorage.getItem("dy") === "true" || bcine;
        activeIframe.src = dyn ? `/a/q/${enc}` : `/a/${enc}`;
        activeIframe.dataset.tabUrl = url;
        input.value = url;
      });
    });
  }

  const addTabButton = document.getElementById("add-tab");
  const tabList = document.getElementById("tab-list");
  const iframeContainer = document.getElementById("frame-container");
  let tabCounter = 1;
  let dragTab = null;
  /** Only the first tab created in this page session may use sessionStorage GoUrl (main-site hand-off). */
  let pendingInitialGoUrl = true;

  function syncTabAria() {
    for (const li of tabList.querySelectorAll("li")) {
      const on = li.classList.contains("active");
      li.setAttribute("aria-selected", on ? "true" : "false");
      li.setAttribute("tabindex", on ? "0" : "-1");
    }
  }

  function createNewTab() {
    let newSrc = "/";

    if (pendingInitialGoUrl) {
      pendingInitialGoUrl = false;
      const goUrl = sessionStorage.getItem("GoUrl");
      if (goUrl !== null) {
        if (goUrl.includes("/e/")) {
          newSrc = `${window.location.origin}${goUrl}`;
        } else {
          const hint = sessionStorage.getItem("GoUrlHint") || "";
          let bcine = false;
          try {
            bcine = /(^|\.)bcine\.app$/i.test(new URL(hint).hostname);
          } catch {
            bcine = /bcine\.app/i.test(hint);
          }
          const dyn = localStorage.getItem("dy") === "true" || bcine;
          newSrc = `${window.location.origin}/${dyn ? "a/q" : "a"}/${goUrl}`;
        }
      }
    } else {
      const popupUrl = sessionStorage.getItem("URL");
      if (popupUrl !== null) {
        newSrc = popupUrl.startsWith("http") ? popupUrl : `${window.location.origin}${popupUrl}`;
        sessionStorage.removeItem("URL");
      }
    }

    const newTab = document.createElement("li");
    newTab.setAttribute("role", "tab");
    const tabTitle = document.createElement("span");
    const newIframe = document.createElement("iframe");
    newIframe.sandbox = "allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-modals allow-orientation-lock allow-presentation allow-storage-access-by-user-activation";

    tabTitle.textContent = `New Tab ${tabCounter}`;
    tabTitle.className = "t";
    newTab.dataset.tabId = String(tabCounter);
    newTab.addEventListener("click", switchTab);
    newTab.addEventListener("auxclick", e => {
      if (e.button === 1) {
        e.preventDefault();
        closeTab(e, newTab);
      }
    });

    newTab.setAttribute("draggable", "true");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.classList.add("close-tab");
    closeButton.setAttribute("aria-label", "Close tab");
    closeButton.innerHTML = "&#10005;";
    closeButton.addEventListener("click", e => closeTab(e, newTab));

    newTab.appendChild(tabTitle);
    newTab.appendChild(closeButton);
    tabList.appendChild(newTab);

    for (const tab of tabList.querySelectorAll("li")) {
      tab.classList.remove("active");
    }
    for (const iframe of iframeContainer.querySelectorAll("iframe")) {
      iframe.classList.remove("active");
    }

    newTab.classList.add("active");
    newIframe.dataset.tabId = String(tabCounter);
    newIframe.classList.add("active");

    const onFrameLoad = () => {
      try {
        const doc = newIframe.contentDocument;
        if (doc) {
          const title = (doc.title || "").trim();
          tabTitle.textContent = title.length > 1 ? title : "New Tab";
          newTab.title = tabTitle.textContent;
        }
      } catch {
        tabTitle.textContent = "Tab";
        newTab.title = "Tab";
      }

      try {
        if (newIframe.contentWindow) {
          newIframe.contentWindow.open = url => {
            const u = typeof url === "string" ? url : "";
            const enc = __uv$config.encodeUrl(u);
            let bcine = false;
            try {
              bcine = /(^|\.)bcine\.app$/i.test(new URL(u).hostname);
            } catch {
              bcine = /bcine\.app/i.test(u);
            }
            const dyn = localStorage.getItem("dy") === "true" || bcine;
            sessionStorage.setItem("URL", `${dyn ? "/a/q/" : "/a/"}${enc}`);
            if (u) {
              sessionStorage.setItem("GoUrlHint", u);
            }
            createNewTab();
            return null;
          };
        }
      } catch {
        /* cross-origin */
      }

      Load();
    };

    newIframe.addEventListener("load", onFrameLoad, { once: false });
    newIframe.src = newSrc;

    iframeContainer.appendChild(newIframe);
    tabCounter += 1;
    newTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
    syncTabAria();
  }

  function closeTab(event, tabEl) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    const li = tabEl || event?.target?.closest("li");
    if (!li) {
      return;
    }
    const tabId = li.dataset.tabId;
    const tabToRemove = tabList.querySelector(`[data-tab-id="${tabId}"]`);
    const iframeToRemove = iframeContainer.querySelector(`iframe[data-tab-id="${tabId}"]`);
    if (!tabToRemove || !iframeToRemove) {
      return;
    }
    tabToRemove.remove();
    iframeToRemove.remove();

    const remainingTabs = Array.from(tabList.querySelectorAll("li"));
    if (remainingTabs.length === 0) {
      tabCounter = 0;
      const inputEl = document.getElementById("input");
      if (inputEl) {
        inputEl.value = "";
      }
      createNewTab();
      return;
    }

    const nextTabIndex = remainingTabs.findIndex(tab => tab.dataset.tabId !== tabId);
    if (nextTabIndex > -1) {
      for (const tab of remainingTabs) {
        tab.classList.remove("active");
      }
      for (const iframe of iframeContainer.querySelectorAll("iframe")) {
        iframe.classList.remove("active");
      }
      remainingTabs[nextTabIndex].classList.add("active");
      const nextIframe = iframeContainer.querySelector(`iframe[data-tab-id="${remainingTabs[nextTabIndex].dataset.tabId}"]`);
      if (nextIframe) {
        nextIframe.classList.add("active");
      }
      Load();
    }
    syncTabAria();
  }

  function switchTab(event) {
    if (event.target.closest(".close-tab")) {
      return;
    }
    const li = event.target.closest("li");
    if (!li) {
      return;
    }
    const tabId = li.dataset.tabId;
    for (const tab of tabList.querySelectorAll("li")) {
      tab.classList.remove("active");
    }
    for (const iframe of iframeContainer.querySelectorAll("iframe")) {
      iframe.classList.remove("active");
    }
    const selectedTab = tabList.querySelector(`[data-tab-id="${tabId}"]`);
    if (selectedTab) {
      selectedTab.classList.add("active");
    }
    const selectedIframe = iframeContainer.querySelector(`iframe[data-tab-id="${tabId}"]`);
    if (selectedIframe) {
      selectedIframe.classList.add("active");
    }
    Load();
    syncTabAria();
  }

  addTabButton?.addEventListener("click", () => {
    createNewTab();
  });

  tabList.addEventListener("dragstart", event => {
    const li = event.target.closest("li");
    if (!li) {
      event.preventDefault();
      return;
    }
    dragTab = li;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", li.dataset.tabId);
    li.classList.add("dragging");
  });

  tabList.addEventListener("dragend", event => {
    const li = event.target.closest("li");
    if (li) {
      li.classList.remove("dragging");
    }
    dragTab = null;
  });

  tabList.addEventListener("dragover", event => {
    event.preventDefault();
    const targetTab = event.target.closest("li");
    if (!targetTab || !dragTab || targetTab === dragTab) {
      return;
    }
    const targetIndex = Array.from(tabList.children).indexOf(targetTab);
    const dragIndex = Array.from(tabList.children).indexOf(dragTab);
    if (targetIndex < dragIndex) {
      tabList.insertBefore(dragTab, targetTab);
    } else {
      tabList.insertBefore(dragTab, targetTab.nextSibling);
    }
  });

  let resizeLayoutTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeLayoutTimer);
    resizeLayoutTimer = setTimeout(() => {
      const activeFrame = iframeContainer?.querySelector("iframe.active");
      requestIframeLayoutFix(activeFrame?.contentWindow ?? null);
    }, 120);
  });

  document.addEventListener("keydown", e => {
    const inUrlBar = e.target?.id === "input" || e.target?.closest?.(".url-form");
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        createNewTab();
        return;
      }
      if (e.key.toLowerCase() === "w") {
        if (inUrlBar) {
          return;
        }
        e.preventDefault();
        const activeLi = tabList.querySelector("li.active");
        if (activeLi) {
          closeTab(null, activeLi);
        }
      }
    }
  });

  createNewTab();
});

function reload() {
  const activeIframe = document.querySelector("#frame-container iframe.active");
  if (activeIframe) {
    const { src } = activeIframe;
    activeIframe.src = src;
    Load();
  }
}

function popout() {
  const activeIframe = document.querySelector("#frame-container iframe.active");
  if (activeIframe) {
    const newWindow = window.open("about:blank", "_blank");
    if (newWindow) {
      const name = localStorage.getItem("name") || "My Drive - Google Drive";
      const icon = localStorage.getItem("icon") || "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png";
      newWindow.document.title = name;
      const link = newWindow.document.createElement("link");
      link.rel = "icon";
      link.href = encodeURI(icon);
      newWindow.document.head.appendChild(link);

      const newIframe = newWindow.document.createElement("iframe");
      const style = newIframe.style;
      style.position = "fixed";
      style.top = style.bottom = style.left = style.right = 0;
      style.border = style.outline = "none";
      style.width = style.height = "100%";

      newIframe.src = activeIframe.src;

      newWindow.document.body.appendChild(newIframe);
    }
  }
}

function eToggle() {
  const activeIframe = document.querySelector("#frame-container iframe.active");
  if (!activeIframe) {
    return;
  }
  const erudaWindow = activeIframe.contentWindow;
  if (!erudaWindow) {
    return;
  }
  if (erudaWindow.eruda) {
    if (erudaWindow.eruda._isInit) {
      erudaWindow.eruda.destroy();
    }
  } else {
    const erudaDocument = activeIframe.contentDocument;
    if (!erudaDocument) {
      return;
    }
    const script = erudaDocument.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/eruda";
    script.onload = () => {
      if (erudaWindow.eruda) {
        erudaWindow.eruda.init();
        erudaWindow.eruda.show();
      }
    };
    erudaDocument.head.appendChild(script);
  }
}

function FS() {
  const activeIframe = document.querySelector("#frame-container iframe.active");
  if (activeIframe?.contentDocument) {
    if (activeIframe.contentDocument.fullscreenElement) {
      activeIframe.contentDocument.exitFullscreen();
    } else {
      activeIframe.contentDocument.documentElement.requestFullscreen();
    }
  }
}

function Home() {
  window.location.href = "./";
}

function goBack() {
  const activeIframe = document.querySelector("#frame-container iframe.active");
  if (activeIframe?.contentWindow) {
    try {
      activeIframe.contentWindow.history.back();
    } catch {
      /* cross-origin */
    }
    setTimeout(Load, 150);
  }
}

function goForward() {
  const activeIframe = document.querySelector("#frame-container iframe.active");
  if (activeIframe?.contentWindow) {
    try {
      activeIframe.contentWindow.history.forward();
    } catch {
      /* cross-origin */
    }
    setTimeout(Load, 150);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const tb = document.getElementById("tabs-button");
  const nb = document.getElementById("right-side-nav");
  if (!tb || !nb) {
    return;
  }
  tb.addEventListener("click", () => {
    document.body.classList.toggle("tabs-shell--strip-hidden");
    const icon = tb.querySelector("i");
    if (document.body.classList.contains("tabs-shell--strip-hidden")) {
      if (icon) {
        icon.className = "fa-solid fa-table-cells-large";
      }
      tb.title = "Show tab bar";
    } else {
      if (icon) {
        icon.className = "fa-solid fa-table-cells";
      }
      tb.title = "Hide tab bar";
    }
    setTimeout(() => {
      const activeFrame = document.querySelector("#frame-container iframe.active");
      requestIframeLayoutFix(activeFrame?.contentWindow ?? null);
    }, 80);
  });
});

function Load() {
  const activeIframe = document.querySelector("#frame-container iframe.active");
  const inputEl = document.getElementById("input");
  if (!activeIframe || !inputEl) {
    return;
  }
  try {
    if (activeIframe.contentWindow?.document.readyState === "complete") {
      const website = activeIframe.contentWindow.document.location.href;
      if (website.includes("/a/") && !website.includes("/a/q/")) {
        const websitePath = website.replace(window.location.origin, "").replace("/a/", "");
        localStorage.setItem("decoded", websitePath);
        inputEl.value = decodeXor(websitePath);
      } else if (website.includes("/a/q/")) {
        const websitePath = website.replace(window.location.origin, "").replace("/a/q/", "");
        const decodedValue = decodeXor(websitePath);
        localStorage.setItem("decoded", websitePath);
        inputEl.value = decodedValue;
      } else {
        const websitePath = website.replace(window.location.origin, "");
        inputEl.value = websitePath;
        localStorage.setItem("decoded", websitePath);
      }
    }
  } catch {
    /* cross-origin — keep bar as-is */
  }
}

function decodeXor(input) {
  if (!input) {
    return input;
  }
  const [str, ...search] = input.split("?");
  return (
    decodeURIComponent(str)
      .split("")
      .map((char, ind) => (ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char))
      .join("") + (search.length ? `?${search.join("?")}` : "")
  );
}
