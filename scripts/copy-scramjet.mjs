import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dest = path.join(root, "static", "assets", "scramjet");
const bareDest = path.join(root, "static", "assets", "bare-mux");

const scramjetPkg = path.join(root, "node_modules", "@mercuryworkshop", "scramjet", "dist");
const scramjetPkgJson = path.join(root, "node_modules", "@mercuryworkshop", "scramjet", "package.json");
const requireFromScramjet = createRequire(scramjetPkgJson);
const bareMuxRoot = path.dirname(requireFromScramjet.resolve("@mercuryworkshop/bare-mux/package.json"));

fs.mkdirSync(dest, { recursive: true });
fs.mkdirSync(bareDest, { recursive: true });

for (const f of ["scramjet.codecs.js", "scramjet.bundle.js", "scramjet.worker.js", "scramjet.client.js"]) {
  fs.copyFileSync(path.join(scramjetPkg, f), path.join(dest, f));
}

/** Scramjet's worker bundles bare-mux v1; v2 SharedWorker transport never reaches the SW (see "there are no bare clients"). */
fs.copyFileSync(path.join(bareMuxRoot, "dist", "bare.cjs"), path.join(bareDest, "bare-mux-v1.cjs"));

const bareClientSrc = path.join(root, "node_modules", "@tomphttp", "bare-client", "dist", "bare.cjs");
const bareClientDest = path.join(root, "static", "assets", "bare-client");
fs.mkdirSync(bareClientDest, { recursive: true });
fs.copyFileSync(bareClientSrc, path.join(bareClientDest, "bare.cjs"));

console.log("Copied Scramjet, BareMux, and bare-client into static/assets/");
