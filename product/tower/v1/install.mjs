#!/usr/bin/env bun
// Release-build replaces this exact line once. No repository imports: this asset stands alone.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
const PINNED = null;
const MAX_BYTES = 16 * 1024 * 1024, MEMBER_LIMIT = 1024 * 1024;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => { throw new Error(reason); };
const defaultRunner = (command, argv, options) => spawnSync(command, argv, { encoding: "buffer", ...options });

function validatePins(pinned) {
  if (!pinned || pinned.repository !== "achangkuon/control-tower" || pinned.asset !== "tower-v1.json" ||
      typeof pinned.tag !== "string" || pinned.tag.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(pinned.tag) ||
      pinned.tag.includes("..") || pinned.tag.endsWith(".") || pinned.tag.toLowerCase() === "latest" ||
      !/^[a-f0-9]{64}$/.test(pinned.sha256) || !Array.isArray(pinned.paths) || !pinned.paths.length) {
    fail("unstamped installer or invalid pins");
  }
}
function prerequisites(runner) {
  for (const [command, argv, brew] of [["gh", ["auth", "status", "--active", "--hostname", "github.com"], "gh"],
    ["bun", ["--version"], "oven-sh/bun/bun"], ["git", ["--version"], "git"], ["go", ["version"], "go"]]) {
    let result;
    try { result = runner(command, argv, { timeout: 10_000, maxBuffer: 64 * 1024 }); } catch {}
    if (!result || result.error || result.status !== 0 ||
        (command === "bun" && !/^\d+\.\d+\.\d+/.test(result.stdout?.toString() ?? ""))) {
      fail(`${command} missing, unusable or unauthenticated. macOS: brew install ${brew}; ` +
        `Linux: use your package manager or the official ${command} installation guide.` +
        (command === "gh" ? " Run gh auth login with private repository access." : ""));
    }
  }
}
function members(bytes, pinned) {
  // Only the already authenticated envelope is interpreted. S174 validates again before activation.
  const envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  if (envelope?.schema !== "tower.v1.release/1" || !Array.isArray(envelope.members) ||
      envelope.members.length !== pinned.paths.length) fail("Invalid release schema or membership");
  const seen = new Set(); let aggregate = 0;
  return envelope.members.map((member) => {
    const path = member?.path;
    if (typeof path !== "string" || !pinned.paths.includes(path) || seen.has(path) ||
        path.startsWith("/") || path.includes("\\") || path.split("/").some(p => !p || p === "." || p === "..") ||
        !/^(?:product\/tower\/v1\/|agent-workflows\/tools\/radar\/)/.test(path) ||
        member.type !== "file" || member.encoding !== "base64" ||
        !Number.isSafeInteger(member.byteLength) || member.byteLength < 0 || member.byteLength > MEMBER_LIMIT ||
        typeof member.bytes !== "string" || member.bytes.length !== 4 * Math.ceil(member.byteLength / 3) ||
        !/^[a-f0-9]{64}$/.test(member.sha256)) fail("Invalid release member path, type or size");
    seen.add(path);
    if ((aggregate += member.byteLength) > 8 * MEMBER_LIMIT) fail("Release aggregate size limit");
    const content = Buffer.from(member.bytes, "base64");
    if (content.length !== member.byteLength || content.toString("base64") !== member.bytes || digest(content) !== member.sha256) {
      fail("Release member base64 or SHA-256 mismatch");
    }
    return { path, content };
  });
}

/** Injection is for offline tests only; the standalone entrypoint always uses stamped pins. */
export function main(argv, deps = {}) {
  const { pinned = PINNED, runner = defaultRunner, tempRoot = tmpdir(), stdout = process.stdout, stderr = process.stderr } = deps;
  let temporary, oldMask;
  try {
    validatePins(pinned);
    if (!Array.isArray(argv) || !(argv.length === 0 || argv.length === 1 && argv[0] === "--dry-run")) fail("Invalid installer arguments (only --dry-run allowed)");
    prerequisites(runner);
    oldMask = process.umask(0o022);
    temporary = mkdtempSync(join(realpathSync(tempRoot), "torre-install-")); chmodSync(temporary, 0o700);
    // Bounded stdout avoids an unbounded download to disk. The private directory owns all intake/extraction.
    const result = runner("gh", ["release", "download", pinned.tag, "--repo", pinned.repository,
      "--pattern", pinned.asset, "--output", "-"], { cwd: temporary, timeout: 60_000, maxBuffer: MAX_BYTES + 1 });
    if (result?.error || result?.status !== 0 || !Buffer.isBuffer(result.stdout) ||
        !result.stdout.length || result.stdout.length > MAX_BYTES) fail("Release download failed or size limit exceeded");
    const bytes = result.stdout;
    if (digest(bytes) !== pinned.sha256) fail("Release SHA-256 mismatch");
    writeFileSync(join(temporary, pinned.asset), bytes, { flag: "wx", mode: 0o600 });
    const verified = members(bytes, pinned);
    const extraction = join(temporary, "extracted"); mkdirSync(extraction, { mode: 0o700 });
    for (const { path, content } of verified) {
      const target = join(extraction, path);
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, content, { flag: "wx", mode: 0o600 });
    }
    if (argv[0] === "--dry-run") { stdout.write("Verified dry-run: no global installation performed.\n"); return 0; }
    const installed = runner("bun", [join(extraction, "product/tower/v1/cli.mjs"), "install", "--tag", pinned.tag,
      "--asset", pinned.asset, "--sha256", pinned.sha256], { cwd: extraction, stdio: "inherit", timeout: 180_000 });
    if (installed?.error || !Number.isInteger(installed?.status)) fail("Installation command failed or timed out");
    if (installed.status !== 0) return installed.status;
    stdout.write('Installed. For zsh/bash, add this line to ~/.zshrc or ~/.bashrc and run it now:\n' +
      'export PATH="$HOME/.local/bin:$PATH"\n' +
      'Then: torre-control project init --project <ruta-absoluta> --trust trusted\n' +
      'Inside the reviewed project, open Claude Code (claude) or Pi (pi --approve).\n');
    return 0;
  } catch (error) {
    stderr.write(`Tower installer: ${String(error?.message ?? error).split(/[\r\n]/, 1)[0].slice(0, 440)}\n`);
    return 1;
  } finally {
    try { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
    finally { if (oldMask !== undefined) process.umask(oldMask); }
  }
}
if (import.meta.main) process.exitCode = main(process.argv.slice(2));
