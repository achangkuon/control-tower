#!/usr/bin/env bun
// Release-build replaces this exact line once. No repository imports: this asset stands alone.
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmodSync, closeSync, constants, fstatSync, lstatSync, mkdirSync, mkdtempSync, openSync, readSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
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
function prerequisites(runner, env) {
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
  let gentle;
  try { gentle = runner("gentle-ai", ["version"], { env, timeout: 10_000, maxBuffer: 64 * 1024 }); } catch {}
  if (gentle?.error || gentle?.status !== 0 || !/^gentle-ai\s+\d+\.\d+\.\d+(?:[-+][\w.-]+)?\s*$/.test(String(gentle?.stdout ?? ""))) {
    fail("Gentle AI es obligatorio. Instalá Gentle AI: https://github.com/Gentleman-Programming/gentle-ai y verificá `gentle-ai version`.");
  }
}
// This standalone asset has no repository imports. Stamped pinned.paths is the
// exact reviewed file roster; these guards additionally bound canonical layouts.
const WORKFLOW_SKILLS = new Set([
  "analisis-por-tramos", "chanks-0-comunicacion-agentes", "chanks-0-explicalo-simple", "chanks-0-mensajes-visibles",
  "chanks-0-session-context-loader", "chanks-0-skill-composer", "chanks-1-adopcion",
  "chanks-1-autoridad", "chanks-1-brain-dump", "chanks-1-cierre-de-decisiones",
  "chanks-1-descubrimiento", "chanks-1-feature", "chanks-1-heredado", "chanks-1-prd",
  "chanks-1-project-kickoff", "chanks-1-requirements", "chanks-1-rfc", "chanks-1-terreno",
  "chanks-2-planificador-granular", "chanks-3-paralelo", "chanks-4-puente",
  "chanks-5-politica-de-entrega", "chanks-5-session-doc", "skill-orchestrator",
]);
const SIGNATURE_PATHS = new Set([
  "agent-workflows/chanks/torre-firma.mjs",
  "agent-workflows/tools/hooks/chanks-etapa.sh",
  "agent-workflows/tools/hooks/torre-firma.sh",
]);
const RADAR_VENDOR_PATHS = new Set([
  "agent-workflows/tools/radar/vendor/modules.txt",
  ...["LICENSE", "NOTICE", "README.md", "apic.go", "decode.go", "emitterc.go", "encode.go", "parserc.go",
    "readerc.go", "resolve.go", "scannerc.go", "sorter.go", "writerc.go", "yaml.go", "yamlh.go", "yamlprivateh.go"]
    .map(name => `agent-workflows/tools/radar/vendor/gopkg.in/yaml.v3/${name}`),
]);
// Copiloto has no dependencies and no vendor tree. Its Go tests stay in the checkout
// and the binary is BUILT at install time, so only these four sources may ever ship.
const COPILOTO_PATHS = new Set([
  "agent-workflows/tools/copiloto/go.mod",
  "agent-workflows/tools/copiloto/main.go",
  "agent-workflows/tools/copiloto/foco.go",
  "agent-workflows/tools/copiloto/tarjeta.go",
]);
function canonicalSource(path) {
  if (path === "agent-workflows/tools/radar/vendor" || path.startsWith("agent-workflows/tools/radar/vendor/")) return RADAR_VENDOR_PATHS.has(path);
  if (path === "agent-workflows/tools/copiloto" || path.startsWith("agent-workflows/tools/copiloto/")) return COPILOTO_PATHS.has(path);
  if (/^(?:product\/tower\/v1\/|agent-workflows\/tools\/radar\/)/.test(path) || SIGNATURE_PATHS.has(path) ||
      path === "agent-workflows/skills/_shared/plan-naming-convention.md") return true;
  return path.startsWith("agent-workflows/skills/") && WORKFLOW_SKILLS.has(path.split("/")[2]) &&
    path !== "agent-workflows/skills/chanks-5-session-doc/assets/project-notion-map.json";
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
        path.includes("\0") || !canonicalSource(path) ||
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

const TUI_LIMIT = 64 * 1024 * 1024;
function safeDirectory(path, home) {
  let current = parse(path).root;
  for (const part of path.slice(current.length).split(sep)) {
    current = join(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code !== "ENOENT") throw error; }
    if (!stat && (current === home || current.startsWith(home + sep))) {
      mkdirSync(current, { mode: 0o755 }); chmodSync(current, 0o755); stat = lstatSync(current);
    }
    if (!stat?.isDirectory() || stat.isSymbolicLink() ||
        (current === home || current.startsWith(home + sep)) && (stat.uid !== process.getuid() || stat.mode & 0o022)) fail("unsafe TUI directory");
  }
}
function safeRead(path, limit) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.uid !== process.getuid() || stat.mode & 0o022 || stat.size > limit) fail("unsafe TUI file");
    const bytes = Buffer.alloc(stat.size + 1), count = readSync(fd, bytes, 0, bytes.length, 0);
    if (count !== stat.size) fail("TUI file changed");
    return bytes.subarray(0, count);
  } finally { closeSync(fd); }
}
function acquireTui(pinned, runner, temporary, platform, arch, stdout) {
  const key = `${platform}-${arch === "x64" ? "amd64" : arch}`;
  if (!["linux", "darwin"].includes(platform) || !["x64", "arm64"].includes(arch)) {
    stdout.write("Visual interface skipped: unsupported platform; engine installation continues.\n"); return null;
  }
  // Old envelope-only installers remain supported; new releases pin every binary.
  if (!pinned.tui) return null;
  const pin = pinned.tui[key];
  if (pin?.asset !== `torre-tui-${key}` || !/^[a-f0-9]{64}$/.test(pin.sha256) ||
      !Number.isSafeInteger(pin.bytes) || pin.bytes < 1 || pin.bytes > TUI_LIMIT) fail("invalid TUI pins");
  const result = runner("gh", ["release", "download", pinned.tag, "-R", pinned.repository, "-p", pin.asset, "--output", "-"],
    { cwd: temporary, timeout: 60_000, maxBuffer: TUI_LIMIT + 1 });
  if (result?.error || result?.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length > TUI_LIMIT ||
      digest(result.stdout) !== pin.sha256 || result.stdout.length !== pin.bytes) fail("TUI SHA-256 or size mismatch");
  writeFileSync(join(temporary, pin.asset), result.stdout, { flag: "wx", mode: 0o600 });
  return { pin, bytes: result.stdout, platform: key };
}
function installTui(tui, home) {
  if (!isAbsolute(home ?? "") || resolve(home) !== home || home === parse(home).root || /[\0\r\n\\]/.test(home)) fail("unsafe TUI HOME");
  const store = join(home, ".local/share/torre-control/tui"), directory = join(store, tui.pin.sha256);
  safeDirectory(directory, home);
  const path = join(directory, "torre-tui");
  let existing;
  try { existing = safeRead(path, TUI_LIMIT); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing) {
    if (digest(existing) !== tui.pin.sha256 || (lstatSync(path).mode & 0o7777) !== 0o755) fail("existing TUI drift");
  } else { writeFileSync(path, tui.bytes, { flag: "wx", mode: 0o755 }); chmodSync(path, 0o755); }
  const current = join(store, "current.json");
  try { safeRead(current, 4096); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const next = join(store, `.current-${randomUUID()}`);
  writeFileSync(next, JSON.stringify({ schema: "tower.v1.tui/1", sha256: tui.pin.sha256, path, platform: tui.platform }), { flag: "wx", mode: 0o644 });
  chmodSync(next, 0o644); renameSync(next, current);
  // Retain all previous content-addressed binaries: never infer deletion authority.
}

/** Injection is for offline tests only; the standalone entrypoint always uses stamped pins. */
export function main(argv, deps = {}) {
  const { pinned = PINNED, runner = defaultRunner, tempRoot = tmpdir(), stdout = process.stdout, stderr = process.stderr, env = process.env, platform = process.platform, arch = process.arch } = deps;
  let temporary, oldMask;
  try {
    validatePins(pinned);
    if (!Array.isArray(argv) || !(argv.length === 0 || argv.length === 1 && argv[0] === "--dry-run")) fail("Invalid installer arguments (only --dry-run allowed)");
    prerequisites(runner, env);
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
    const tui = acquireTui(pinned, runner, temporary, platform, arch, stdout);
    const extraction = join(temporary, "extracted"); mkdirSync(extraction, { mode: 0o700 });
    for (const { path, content } of verified) {
      const target = join(extraction, path);
      mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
      writeFileSync(target, content, { flag: "wx", mode: 0o600 });
    }
    if (argv[0] === "--dry-run") { stdout.write("Verified dry-run: no global installation performed.\n"); return 0; }
    const cli = join(extraction, "product/tower/v1/cli.mjs");
    const doctor = runner("bun", [cli, "doctor"], { cwd: extraction, env, timeout: 30_000, maxBuffer: 64 * 1024 });
    if (doctor?.error || doctor?.status !== 0) fail("Existing engine doctor failed; installation stopped");
    let status;
    try { status = JSON.parse(doctor.stdout?.toString()).status; } catch { fail("Invalid engine doctor response"); }
    if (!["healthy", "absent"].includes(status)) fail("Invalid engine doctor status");
    const installed = runner("bun", [cli, status === "healthy" ? "update" : "install", "--tag", pinned.tag,
      "--asset", pinned.asset, "--sha256", pinned.sha256], { cwd: extraction, env, stdio: "inherit", timeout: 180_000 });
    if (installed?.error || !Number.isInteger(installed?.status)) fail("Installation command failed or timed out");
    if (installed.status !== 0) return installed.status;
    if (tui) installTui(tui, env.HOME);
    stdout.write('Installed or updated. For zsh/bash, add this line to ~/.zshrc or ~/.bashrc and run it now:\n' +
      'export PATH="$HOME/.local/bin:$PATH"\n' +
      'Then run torre-control to open the visual interface.\n' +
      'To adopt a project: torre-control project init --project <ruta-absoluta> --trust trusted\n' +
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
