// Prompts when /app-version.json changes (bump `version` when you deploy).

const VERSION_URL = "/app-version.json";
const STORAGE_KEY = "novadesk_seen_version";
const LATER_KEY = "novadesk_update_later";

async function fetchServerVersion() {
  const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  const v = data?.version;
  return typeof v === "string" || typeof v === "number" ? String(v).trim() : null;
}

function showUpdatePrompt(serverVersion) {
  if (document.getElementById("novadesk-update-overlay")) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.id = "novadesk-update-overlay";
  overlay.className = "update-prompt-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "novadesk-update-title");

  overlay.innerHTML = `
    <div class="update-prompt-card">
      <h2 id="novadesk-update-title" class="update-prompt-title">Update to new version?</h2>
      <p class="update-prompt-text">A newer NovaDesk build is available. Refresh to load it.</p>
      <div class="update-prompt-actions">
        <button type="button" class="update-prompt-btn update-prompt-btn-secondary" data-action="later">Not now</button>
        <button type="button" class="update-prompt-btn update-prompt-btn-primary" data-action="refresh">Refresh</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('[data-action="refresh"]').addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, serverVersion);
    sessionStorage.removeItem(LATER_KEY);
    location.reload();
  });

  overlay.querySelector('[data-action="later"]').addEventListener("click", () => {
    sessionStorage.setItem(LATER_KEY, serverVersion);
    overlay.remove();
  });
}

async function checkForUpdate() {
  try {
    const serverVersion = await fetchServerVersion();
    if (!serverVersion) {
      return;
    }

    if (sessionStorage.getItem(LATER_KEY) === serverVersion) {
      return;
    }

    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen === null) {
      localStorage.setItem(STORAGE_KEY, serverVersion);
      return;
    }
    if (seen === serverVersion) {
      return;
    }

    showUpdatePrompt(serverVersion);
  } catch {
    /* offline or blocked */
  }
}

function runChecks() {
  if (document.visibilityState === "visible") {
    checkForUpdate();
  }
}

document.addEventListener("DOMContentLoaded", runChecks);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkForUpdate();
  }
});
