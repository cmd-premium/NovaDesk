import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const A_JSON = path.join(ROOT, "static", "assets", "json", "a.json");
const OUT_JSON = path.join(ROOT, "static", "assets", "json", "g-legacy.json");
const OUT_MIN = path.join(ROOT, "static", "assets", "json", "g-legacy.min.json");

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

const pick = new Set([
  "Scratch",
  "Chess.com",
  "Cool Math Games",
  "Poki",
  "Y8 Games",
  "Gidd.io Games",
  "Newgrounds",
  "GBA Games",
  "Geforce NOW",
  "Amazon Luna",
  "Now.GG",
  "Now.GG (NowGG.me) [Working]",
  "Android",
  "Character AI",
  "Aptoide",
]);

const a = JSON.parse(fs.readFileSync(A_JSON, "utf8"));
const rows = a.filter((x) => pick.has(x.name)).map((x) => JSON.parse(JSON.stringify(x)));
for (const x of rows) {
  if (x.image && !x.image.startsWith("/") && !x.image.startsWith("http")) {
    x.image = `/${x.image}`;
  }
  if (!x.categories) x.categories = ["all"];
}

const out = [...header, ...rows];
fs.writeFileSync(OUT_JSON, `${JSON.stringify(out, null, 2)}\n`);
fs.writeFileSync(OUT_MIN, JSON.stringify(out));
console.log(`Wrote g-legacy (${out.length} rows) from a.json picks`);
