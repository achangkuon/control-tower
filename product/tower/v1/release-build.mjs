#!/usr/bin/env bun
import * as childProcess from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, fchmodSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BUNDLE_MEMBERS } from "./bundle.mjs";
import { bootstrapVerifiedRelease } from "./bootstrap.mjs";
import { MAX_RELEASE_BYTES } from "./release.mjs";

const defaultRepo = fileURLToPath(new URL("../../../", import.meta.url));
const memberLimit = 1024 * 1024;
const aggregateLimit = 8 * memberLimit;
const optionNames = ["repo", "commit", "out", "tag", "installer-out", "tui-out-dir"];
const installerPath = "product/tower/v1/install.mjs";
// ASCII paths: default sort is bytewise, never locale-sensitive. Serialization key order
// is schema,members and path,type,encoding,byteLength,sha256,bytes; no timestamps/newline.
const paths = [...new Set([...BUNDLE_MEMBERS.map(({ source }) => source), ...[
  "adoption", "bundle", "project-files", "bootstrap", "release", "global", "projects", "cli", "runtime-config", "release-build",
].map((name) => `product/tower/v1/${name}.mjs`)])].sort();
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fail = (reason) => { throw new Error(reason); };

function git(repo, argv, maxBuffer = memberLimit + 1) {
  // Never let inherited Git overrides redirect commit reads or status inspection.
  // Optional locks off prevents status from refreshing the caller's index on disk.
  const env = { ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))),
    GIT_OPTIONAL_LOCKS: "0" };
  const result = childProcess.spawnSync("git", ["--no-replace-objects", "-C", repo,
    "-c", "core.fsmonitor=false", "-c", "core.untrackedCache=false", ...argv],
  { encoding: "buffer", timeout: 10_000, maxBuffer, env });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout) || result.stdout.length > maxBuffer) {
    fail("git command failed or exceeded its bound");
  }
  return result.stdout;
}
function clean(repo) {
  if (git(repo, ["status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none"]).length) {
    fail("a clean worktree is required (tracked or untracked changes found)");
  }
}
function outputPath(out, repo) {
  if (typeof out !== "string" || !isAbsolute(out) || /[\0\r\n]/.test(out)) fail("out must be an absolute file path");
  const target = join(realpathSync(dirname(out)), basename(out));
  if (target === repo || target.startsWith(repo + sep)) fail("out must be outside the repository worktree");
  try { lstatSync(target); }
  catch (error) { if (error.code === "ENOENT") return target; throw error; }
  fail("out already exists; overwrite is forbidden");
}

/** Deterministic standalone asset; a unique, exact sentinel prevents accidental restamping. */
export function stampInstaller(source, { tag, sha256, tui }) {
  if (typeof tag !== "string" || tag.length > 128 || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(tag) ||
      tag.includes("..") || tag.endsWith(".") || tag.toLowerCase() === "latest" || !/^[a-f0-9]{64}$/.test(sha256)) {
    fail("invalid installer stamp tag or SHA-256");
  }
  if (typeof source !== "string" || source.match(/^const PINNED = null;$/gm)?.length !== 1) fail("unstamped installer marker must occur exactly once");
  const pinned = { repository: "achangkuon/control-tower", tag, asset: "tower-v1.json", sha256, paths, ...(tui ? { tui } : {}) };
  return source.replace(/^const PINNED = null;$/m, () => `const PINNED = ${JSON.stringify(pinned)};`);
}

/** Offline cross-build seam: builder is injected only by tests, never by CLI flags. */
function buildTui({ repo, commit, out }, { builder = childProcess.spawnSync } = {}) {
  const source = "product/tower/v1/tui";
  const tree = git(repo, ["ls-tree", "-rlz", commit, "--", source], 4 * memberLimit).toString();
  if (!tree || tree.split("\0").filter(Boolean).some(line => !/^100(?:644|755) blob /.test(line))) fail("unsafe TUI commit tree");
  const base = mkdtempSync(join(realpathSync(tmpdir()), "tower-tui-build-"));
  const run = (command, argv, options) => {
    const result = builder(command, argv, { timeout: 180_000, maxBuffer: memberLimit, encoding: "buffer", ...options });
    if (result?.error || result?.status !== 0) fail("offline TUI build failed (Go and cached modules required)");
    return result.stdout?.toString().trim();
  };
  try {
    const archive = git(repo, ["archive", "--format=tar", commit, source], 8 * memberLimit);
    const extracted = childProcess.spawnSync("tar", ["-xf", "-", "-C", base], { input: archive, timeout: 10_000, maxBuffer: memberLimit });
    if (extracted.error || extracted.status !== 0) fail("TUI archive extraction failed");
    const cwd = join(base, source);
    // Neither ancestor workspaces nor ambient Go configuration may redirect
    // commit dependencies. Only the operator's module-cache location is reused.
    const policy = { GOFLAGS: "-mod=readonly", GOPROXY: "off", GOSUMDB: "off", GOWORK: "off",
      GOTOOLCHAIN: "local", GOENV: "off", GOTELEMETRY: "off", CGO_ENABLED: "0" };
    const cache = run("go", ["env", "GOMODCACHE"], { cwd, env: { PATH: process.env.PATH, HOME: process.env.HOME,
      ...policy, ...(process.env.GOMODCACHE ? { GOMODCACHE: process.env.GOMODCACHE } : {}) } });
    if (!isAbsolute(cache ?? "") || /[\0\r\n]/.test(cache)) fail("invalid operator module cache");
    const env = { PATH: process.env.PATH, HOME: join(base, "home"), TMPDIR: join(base, "tmp"),
      GOCACHE: join(base, "cache"), GOPATH: join(base, "gopath"), GOMODCACHE: cache,
      ...policy };
    for (const key of ["HOME", "TMPDIR", "GOCACHE", "GOPATH"]) mkdirSync(env[key]);
    const binaries = [], tui = {};
    for (const os of ["linux", "darwin"]) for (const arch of ["amd64", "arm64"]) {
      const asset = `torre-tui-${os}-${arch}`, target = join(base, asset);
      run("go", ["build", "-trimpath", "-ldflags", "-s -w -buildid=", "-o", target, "."], { cwd, env: { ...env, GOOS: os, GOARCH: arch } });
      const stat = lstatSync(target);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > 64 * memberLimit) fail("invalid TUI build output");
      const bytes = readFileSync(target);
      tui[`${os}-${arch}`] = { asset, sha256: digest(bytes), bytes: bytes.length };
      binaries.push({ asset, bytes });
    }
    clean(repo);
    mkdirSync(out, { mode: 0o755 });
    for (const { asset, bytes } of binaries) {
      const fd = openSync(join(out, asset), "wx", 0o755);
      try { writeFileSync(fd, bytes); fchmodSync(fd, 0o755); } finally { closeSync(fd); }
    }
    return tui;
  } finally { rmSync(base, { recursive: true, force: true }); }
}

/** Build from immutable commit-tree blobs; bootstrap is the final wire-format authority.
 * No network, working-file reads, Git mutations, or filesystem writes before admission.
 * Returns the receipt; only main prints it. The output parents must already exist.
 */
export function buildRelease(options, deps = {}) {
  if (!options || typeof options !== "object" || Array.isArray(options) ||
      Object.keys(options).some((key) => !optionNames.includes(key))) fail("invalid build options");
  const { repo = defaultRepo, commit = "HEAD", out, tag, "installer-out": installerOut, "tui-out-dir": tuiOut } = options;
  const withInstaller = Object.hasOwn(options, "tag") || Object.hasOwn(options, "installer-out");
  if (withInstaller && (!tag || !installerOut)) fail("--tag and --installer-out must be supplied together");
  if (withInstaller && basename(out ?? "") !== "tower-v1.json") fail("installer requires envelope asset name tower-v1.json");
  if (typeof repo !== "string" || !repo || typeof commit !== "string" || !commit ||
      commit.startsWith("-") || /[\0\r\n]/.test(commit)) fail("invalid repository or commit");
  const root = realpathSync(resolve(repo));
  if (git(root, ["rev-parse", "--show-toplevel"]).toString("utf8").trim() !== root) fail("repo must be a worktree root");
  const target = outputPath(out, root);
  const installerTarget = withInstaller ? outputPath(installerOut, root) : null;
  if (tuiOut && !withInstaller) fail("TUI requires --tag and --installer-out");
  const tuiTarget = tuiOut ? outputPath(tuiOut, root) : null;
  if (tuiTarget === target || tuiTarget && tuiTarget === installerTarget) fail("outputs must differ");
  if (installerTarget === target) fail("installer and envelope outputs must differ");
  clean(root);
  const sha = git(root, ["rev-parse", "--verify", "--end-of-options", `${commit}^{commit}`]).toString("utf8").trim();
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(sha)) fail("git returned an invalid commit");
  const entries = new Map();
  const readPaths = withInstaller ? [...paths, installerPath] : paths;
  // Include the whole vendor subtree in metadata admission so newly committed
  // dependency files cannot be silently omitted by the explicit release roster.
  const tree = git(root, ["ls-tree", "-rlz", "--full-tree", sha, "--", ...readPaths, "agent-workflows/tools/radar/vendor"]).toString("utf8");
  for (const record of tree.split("\0").filter(Boolean)) {
    const match = record.match(/^(100644|100755) blob [a-f0-9]+ +([0-9]+)\t(.+)$/);
    if (!match || !readPaths.includes(match[3]) || entries.has(match[3])) fail("unreviewed or non-regular release member");
    entries.set(match[3], Number(match[2]));
  }
  let aggregate = 0;
  for (const path of paths) {
    const size = entries.get(path);
    if (size === undefined) fail(`missing release member: ${path}`);
    if (!Number.isSafeInteger(size) || size < 0 || size > memberLimit) fail(`release member size limit: ${path}`);
    if ((aggregate += size) > aggregateLimit) fail("release aggregate size limit");
  }
  const members = paths.map((path) => {
    const bytes = git(root, ["show", `${sha}:${path}`]);
    if (bytes.length !== entries.get(path)) fail(`release member size divergence: ${path}`);
    return { path, type: "file", encoding: "base64", byteLength: bytes.length,
      sha256: digest(bytes), bytes: bytes.toString("base64") };
  });
  const bytes = Buffer.from(JSON.stringify({ schema: "tower.v1.release/1", members }));
  if (bytes.length > MAX_RELEASE_BYTES) fail("release encoded size limit");
  const sha256 = digest(bytes);
  bootstrapVerifiedRelease({ repository: "example/control-tower", tag: "v1", asset: "tower-v1.json", sha256,
    runner: (_command, argv) => ({ status: 0, stdout: argv[0] === "auth" ? Buffer.alloc(0) : bytes }) });
  let installer, installerSource;
  if (withInstaller) {
    const size = entries.get(installerPath);
    if (!Number.isSafeInteger(size) || size < 0 || size > memberLimit) fail("missing or oversized installer member");
    const source = git(root, ["show", `${sha}:${installerPath}`]);
    if (source.length !== size) fail("installer size divergence");
    installerSource = new TextDecoder("utf-8", { fatal: true }).decode(source);
    stampInstaller(installerSource, { tag, sha256 }); // Admit source and pins before any TUI publication.
  }
  const tui = tuiTarget ? buildTui({ repo: root, commit: sha, out: tuiTarget }, deps) : null;
  if (installerSource) installer = Buffer.from(stampInstaller(installerSource, { tag, sha256, tui }));
  clean(root);
  const fd = openSync(target, "wx", 0o644);
  try { writeFileSync(fd, bytes); fchmodSync(fd, 0o644); } finally { closeSync(fd); }
  if (installer) {
    const installerFd = openSync(installerTarget, "wx", 0o644);
    try { writeFileSync(installerFd, installer); fchmodSync(installerFd, 0o644); } finally { closeSync(installerFd); }
  }
  return { schema: "tower.v1.release-build/1", commit: sha, asset: basename(out), bytes: bytes.length, sha256,
    ...(installer ? { installerSha256: digest(installer) } : {}), ...(tui ? { tui } : {}) };
}

export function main(argv, io = {}) {
  const { stdout = process.stdout, stderr = process.stderr } = io;
  try {
    if (!Array.isArray(argv) || argv.some((arg) => typeof arg !== "string")) fail("string arguments required");
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
      const flag = argv[index], value = argv[index + 1];
      if (!flag.startsWith("--") || !optionNames.includes(flag.slice(2)) || Object.hasOwn(options, flag.slice(2)) ||
          !value || value.startsWith("--")) fail("invalid, duplicate or missing flag/value");
      options[flag.slice(2)] = value;
    }
    if (!Object.hasOwn(options, "out")) fail("--out is required");
    stdout.write(`${JSON.stringify(buildRelease(options))}\n`);
    return 0;
  } catch (error) {
    const message = String(error?.message ?? error).split(/[\r\n\u2028\u2029]/, 1)[0].slice(0, 440);
    stderr.write(`Invalid Tower release build: ${message || "operation failed"}\n`);
    return 1;
  }
}
if (import.meta.main) process.exitCode = main(process.argv.slice(2));
