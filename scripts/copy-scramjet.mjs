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
const BARE_MUX_UNPKG = "https://unpkg.com/@mercuryworkshop/bare-mux@2.1.8/dist";

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

function resolveBareMuxDistDir() {
  const flatRoot = path.join(root, "node_modules", "@mercuryworkshop", "bare-mux");
  const flat = path.join(flatRoot, "dist");
  const flatPkg = path.join(flatRoot, "package.json");
  if (fs.existsSync(flatPkg)) {
    try {
      const ver = JSON.parse(fs.readFileSync(flatPkg, "utf8")).version || "";
      if (ver.startsWith("2.") && fs.existsSync(path.join(flat, "index.js")) && fs.existsSync(path.join(flat, "worker.js"))) {
        return flat;
      }
    } catch {
      /* ignore */
    }
  }
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  if (fs.existsSync(pnpmDir)) {
    for (const name of fs.readdirSync(pnpmDir)) {
      if (!name.startsWith("@mercuryworkshop+bare-mux@2.")) {
        continue;
      }
      const d = path.join(pnpmDir, name, "node_modules", "@mercuryworkshop", "bare-mux", "dist");
      if (fs.existsSync(path.join(d, "index.js")) && fs.existsSync(path.join(d, "worker.js"))) {
        return d;
      }
    }
  }
  return null;
}

async function copyBareMuxV2() {
  const bareMuxRoot = resolveBareMuxDistDir();
  if (bareMuxRoot) {
    for (const f of ["worker.js", "index.js"]) {
      fs.copyFileSync(path.join(bareMuxRoot, f), path.join(bareDest, f));
    }
    return;
  }
  console.warn("@mercuryworkshop/bare-mux not in node_modules; downloading from unpkg.");
  await download(`${BARE_MUX_UNPKG}/index.js`, path.join(bareDest, "index.js"));
  await download(`${BARE_MUX_UNPKG}/worker.js`, path.join(bareDest, "worker.js"));
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

  await copyBareMuxV2();
  try {
    copyBareClient();
  } catch {
    console.warn("@tomphttp/bare-client missing; skipping (run npm install).");
  }

  console.log(`Fetched Scramjet v2 (${SCRAMJET_VERSION}), copied bare-mux v2 + bare-client.`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
