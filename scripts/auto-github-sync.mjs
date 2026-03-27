#!/usr/bin/env node
/**
 * Polls git for uncommitted changes and pushes to origin after a quiet period.
 * Requires: git remote "origin", and credentials (e.g. Git Credential Manager on Windows).
 *
 * Usage:
 *   pnpm sync:github              # watch loop (default 90s between checks)
 *   pnpm sync:github:once         # single commit + push if dirty
 *
 * Env:
 *   GIT_SYNC_INTERVAL_MS=60000    # ms between checks (default 90000)
 */
import { execSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const INTERVAL_MS = Number(process.env.GIT_SYNC_INTERVAL_MS ?? 90_000);
const once = process.argv.includes("--once");

function git(args, inherit = false) {
  const opts = { cwd: ROOT, encoding: "utf8" };
  if (inherit) {
    return execSync(`git ${args}`, { ...opts, stdio: "inherit", shell: true });
  }
  return execSync(`git ${args}`, { ...opts, stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function isRepo() {
  try {
    git("rev-parse --git-dir");
    return true;
  } catch {
    return false;
  }
}

function hasOrigin() {
  try {
    return Boolean(git("remote get-url origin"));
  } catch {
    return false;
  }
}

function isDirty() {
  return Boolean(git("status --porcelain"));
}

function sync() {
  if (!isDirty()) {
    return;
  }
  const msg = `sync: ${new Date().toISOString()}`;
  git(`add -A`, true);
  git(`commit -m ${JSON.stringify(msg)}`, true);
  git("push", true);
  console.log(`[sync-github] ${new Date().toISOString()} — pushed.`);
}

function ensureReady() {
  if (!isRepo()) {
    console.error(`
[sync-github] This folder is not a git repository.
  Run from project root:  git init
  Add GitHub remote:       git remote add origin https://github.com/<you>/<repo>.git
`);
    process.exit(1);
  }
  if (!hasOrigin()) {
    console.error(`
[sync-github] No remote named "origin".
  git remote add origin https://github.com/<you>/<repo>.git
`);
    process.exit(1);
  }
  try {
    git("config user.name");
    git("config user.email");
  } catch {
    console.error(`
[sync-github] Set your git identity:
  git config user.name "Your Name"
  git config user.email "you@example.com"
`);
    process.exit(1);
  }
}

ensureReady();

if (once) {
  try {
    sync();
  } catch (e) {
    console.error("[sync-github]", e.message ?? e);
    process.exit(1);
  }
  process.exit(0);
}

console.log(
  `[sync-github] Watching every ${INTERVAL_MS}ms — Ctrl+C to stop. Commits only when there are changes.`,
);

const run = () => {
  try {
    sync();
  } catch (e) {
    console.error(`[sync-github] ${new Date().toISOString()} —`, e.message ?? e);
  }
};

run();
setInterval(run, INTERVAL_MS);
