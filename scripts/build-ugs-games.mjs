import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const G_JSON = path.join(ROOT, "static", "assets", "json", "g.json");
const G_MIN = path.join(ROOT, "static", "assets", "json", "g.min.json");

const UGS_JS =
  "https://raw.githubusercontent.com/bubbls/ugs-singlefile/main/games.js";
const UGS_CDN_BASE =
  "https://cdn.jsdelivr.net/gh/bubbls/ugs-singlefile/UGS-Files/";

function displayName(id) {
  let s = id.startsWith("cl") ? id.slice(2) : id;
  if (!s || s.length < 2) return id;
  s = s.replace(/[()]/g, "");
  s = s.replace(/_/g, " ");
  s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  return s;
}

function gameUrl(id) {
  const file = id.includes(".") && id.lastIndexOf(".") > 0 ? id : `${id}.html`;
  return `${UGS_CDN_BASE}${encodeURIComponent(file)}`;
}

const text = await fetch(UGS_JS).then((r) => {
  if (!r.ok) throw new Error(`games.js ${r.status}`);
  return r.text();
});

const start = text.indexOf("let files = [");
if (start < 0) throw new Error("could not find files array");
const sub = text.slice(start);
const end = sub.indexOf("\n];");
if (end < 0) throw new Error("could not find end of files array");
const block = sub.slice(0, end);
const ids = [...block.matchAll(/"(cl[^"]+)"/g)].map((m) => m[1]);
if (ids.length < 10) throw new Error("unexpectedly few game ids");

const header = [
  {
    name: "! Create Custom App",
    image: "/assets/media/icons/custom.webp",
    categories: ["all"],
    custom: "true",
  },
  {
    name: "! Help & FAQ",
    image: "/assets/media/icons/help_center_googlefonts.png",
    link: "https://github.com/cmd-premium/NovaDesk",
    categories: ["all"],
  },
  {
    name: "! [NEW] Request A Game",
    link: "https://forms.gle/vwdHN3iPz5cLaHaMA",
    image: "/assets/media/icons/request.webp",
    categories: ["all"],
  },
];

const games = ids.map((id) => ({
  name: displayName(id),
  link: gameUrl(id),
  image: "/assets/media/icons/custom.webp",
  categories: ["all"],
}));

const out = [...header, ...games];
fs.writeFileSync(G_JSON, `${JSON.stringify(out, null, 2)}\n`);
fs.writeFileSync(G_MIN, JSON.stringify(out));
console.log(`Wrote ${games.length} UGS games + ${header.length} header rows -> g.json / g.min.json`);
