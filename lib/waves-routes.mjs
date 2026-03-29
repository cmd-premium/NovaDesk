import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
export const WAVES_MOUNT_PATH = "/waves";

const WAVES_ROOT = path.join(REPO_ROOT, "waves-prod");
const srcPath = path.join(WAVES_ROOT, "src");
const publicPath = path.join(WAVES_ROOT, "public");
const packageJsonPath = path.join(WAVES_ROOT, "package.json");
const notificationsPath = path.join(WAVES_ROOT, "notifications.json");

const HEAD_INJECT = `<script>window.__NOVADESK_WAVES_BASE__="${WAVES_MOUNT_PATH}";</script>\n`;

let cachedNotifications = [];
let location = "unknown";
try {
  const data = fs.readFileSync(notificationsPath, "utf8");
  cachedNotifications = JSON.parse(data);
} catch {
  cachedNotifications = [];
}

fetch("https://get.geojs.io/v1/ip/geo.json")
  .then(res => res.json())
  .then(data => {
    if (data?.country_code && data?.region) {
      location = `${data.country_code}, ${data.region}`;
    }
  })
  .catch(() => {});

function injectNovadeskBase(html) {
  if (html.includes("__NOVADESK_WAVES_BASE__")) return html;
  return html.replace("<head>", `<head>\n    ${HEAD_INJECT}`);
}

export function createWavesRouter() {
  const router = express.Router();

  const bMap = {
    "1": path.join(baremuxPath, "index.js"),
    "2": path.join(publicPath, "b/s/jetty.all.js"),
    "3": path.join(publicPath, "b/u/bunbun.js"),
    "4": path.join(publicPath, "b/u/concon.js"),
  };
  const bCache = {};
  for (const [id, filePath] of Object.entries(bMap)) {
    try {
      bCache[id] = fs.readFileSync(filePath);
    } catch {
      /* optional bundle */
    }
  }

  router.get("/b", (req, res) => {
    const buf = bCache[req.query.id];
    if (!buf) return res.status(404).send("file not found :(");
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buf);
  });

  const staticOpts = { maxAge: 0, etag: true };
  router.use("/bmux/", express.static(baremuxPath, staticOpts));
  router.use("/epoxy/", express.static(epoxyPath, staticOpts));
  router.use("/libcurl/", express.static(libcurlPath, staticOpts));

  const scramjetDir = path.join(WAVES_ROOT, "scramjet");
  if (fs.existsSync(scramjetDir)) {
    router.use("/s/", express.static(scramjetDir, staticOpts));
  }

  router.use("/assets/data", express.static(path.join(publicPath, "assets", "data"), staticOpts));
  router.use("/assets", express.static(path.join(publicPath, "assets"), staticOpts));
  router.use("/b", express.static(path.join(publicPath, "b"), staticOpts));
  router.use(express.static(srcPath, { ...staticOpts, index: false }));

  router.get("/api/stuff", (_req, res) => {
    try {
      const data = fs.readFileSync(packageJsonPath, "utf8");
      const parsedData = JSON.parse(data);
      res.json({ version: parsedData.version, location });
    } catch {
      res.status(500).json({});
    }
  });

  router.get("/api/notifications", (_req, res) => {
    res.json(cachedNotifications);
  });

  router.get("/", (_req, res) => {
    const fp = path.join(srcPath, "index.html");
    let html = fs.readFileSync(fp, "utf8");
    html = injectNovadeskBase(html);
    res.status(418);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

  router.use((_req, res) => {
    res.status(404).sendFile(path.join(srcPath, "404.html"));
  });

  return router;
}
