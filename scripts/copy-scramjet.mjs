import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const dest = path.join(root, "static", "assets", "scramjet");
const bareDest = path.join(root, "static", "assets", "bare-mux");

/** Pinned alpha (npm enforces `only-allow pnpm` on this package; we fetch from the registry CDN). */
const SCRAMJET_VERSION = "2.0.2-alpha";
const UNPKG = `https://unpkg.com/@mercuryworkshop/scramjet@${SCRAMJET_VERSION}/dist`;

const V1_ORphans = [
  "scramjet.codecs.js",
  "scramjet.bundle.js",
  "scramjet.worker.js",
  "scramjet.client.js",
  "scramjet-nv-config.js",
];
const BARE_MUX_ORPHANS = ["uuid-shim.js", "bare-mux-v1.cjs"];

async function download(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filePath, buf);
}

function copyBareMuxV2() {
  const bareMuxRoot = path.join(root, "node_modules", "@mercuryworkshop", "bare-mux", "dist");
  if (!fs.existsSync(path.join(bareMuxRoot, "index.js"))) {
    throw new Error("Missing @mercuryworkshop/bare-mux in node_modules. Run npm install.");
  }
  for (const f of ["worker.js", "index.js"]) {
    fs.copyFileSync(path.join(bareMuxRoot, f), path.join(bareDest, f));
  }
}

function copyBareClient() {
  const bareClientSrc = path.join(root, "node_modules", "@tomphttp", "bare-client", "dist", "bare.cjs");
  const bareClientDest = path.join(root, "static", "assets", "bare-client");
  fs.mkdirSync(bareClientDest, { recursive: true });
  fs.copyFileSync(bareClientSrc, path.join(bareClientDest, "bare.cjs"));
}

async function main() {
  fs.mkdirSync(dest, { recursive: true });
  fs.mkdirSync(bareDest, { recursive: true });

  for (const f of V1_ORphans) {
    try {
      fs.unlinkSync(path.join(dest, f));
    } catch {
      /* ignore */
    }
  }
  for (const f of BARE_MUX_ORPHANS) {
    try {
      fs.unlinkSync(path.join(bareDest, f));
    } catch {
      /* ignore */
    }
  }

  await download(`${UNPKG}/scramjet.js`, path.join(dest, "scramjet.all.js"));
  await download(`${UNPKG}/scramjet.wasm`, path.join(dest, "scramjet.wasm"));
  await download(`${UNPKG}/a68dd7a5344f1722.wasm`, path.join(dest, "a68dd7a5344f1722.wasm"));
  await download(`${UNPKG}/c34a4f083a11eae2.wasm`, path.join(dest, "c34a4f083a11eae2.wasm"));

  copyBareMuxV2();
  copyBareClient();

  console.log(`Fetched Scramjet v2 (${SCRAMJET_VERSION}), copied bare-mux v2 + bare-client.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
